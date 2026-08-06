import { unstable_cache } from 'next/cache';

import type { Launch, LaunchSocialItem } from './types';

const XAI_RESPONSES_URL = 'https://api.x.ai/v1/responses';
const DEFAULT_XAI_MODEL = 'grok-4.3';
const DEFAULT_DAILY_LOOKUP_BUDGET = 4;
const MAX_DAILY_LOOKUP_BUDGET = 24;
const XAI_CACHE_SECONDS = 6 * 60 * 60;
const XAI_LOOKBACK_DAYS = 7;
const XAI_MAX_TURNS = 2;
const XAI_MAX_OUTPUT_TOKENS = 600;
const XAI_TIMEOUT_MS = 12_000;
const XAI_MAX_POSTS = 3;
const XAI_LAUNCH_LEAD_MS = 72 * 60 * 60 * 1000;
const XAI_LAUNCH_LAG_MS = 12 * 60 * 60 * 1000;
const X_STATUS_EPOCH_MS = BigInt('1288834974657');

interface XaiLookupBudget {
  day: string;
  used: number;
}

interface XaiResponsePayload {
  output?: Array<{
    type?: string;
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
}

interface XaiStructuredPosts {
  posts?: Array<{
    title?: unknown;
    url?: unknown;
  }>;
}

const globalWithXaiBudget = globalThis as typeof globalThis & {
  __launchWatchXaiLookupBudget?: XaiLookupBudget;
};

export function getXaiDailyLookupBudget(
  value = process.env.XAI_DAILY_LOOKUP_BUDGET,
): number {
  if (value === undefined || value.trim() === '') {
    return DEFAULT_DAILY_LOOKUP_BUDGET;
  }

  if (!/^\d+$/.test(value.trim())) return DEFAULT_DAILY_LOOKUP_BUDGET;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return DEFAULT_DAILY_LOOKUP_BUDGET;
  return Math.min(MAX_DAILY_LOOKUP_BUDGET, Math.max(0, parsed));
}

function reserveXaiLookup(): boolean {
  const limit = getXaiDailyLookupBudget();
  if (limit === 0) return false;

  const day = new Date().toISOString().slice(0, 10);
  const budget = globalWithXaiBudget.__launchWatchXaiLookupBudget;
  if (!budget || budget.day !== day) {
    globalWithXaiBudget.__launchWatchXaiLookupBudget = { day, used: 1 };
    return true;
  }
  if (budget.used >= limit) return false;
  budget.used += 1;
  return true;
}

function isSpaceXMission(launch: Launch): boolean {
  return (
    launch.source === 'spacex' ||
    launch.provider?.trim().toLowerCase() === 'spacex'
  );
}

export function shouldUseXaiSpaceXSearch(
  launch: Launch,
  hasOfficialSpaceXSignal: boolean,
  now = Date.now(),
): boolean {
  if (hasOfficialSpaceXSignal || !isSpaceXMission(launch)) return false;
  if (launch.isLive) return true;

  const target = launch.dateUnix * 1_000;
  if (!Number.isFinite(target) || target <= 0) return false;
  const untilLaunch = target - now;
  return untilLaunch >= -XAI_LAUNCH_LAG_MS && untilLaunch <= XAI_LAUNCH_LEAD_MS;
}

function missionName(launch: Launch): string {
  const structured = launch.missionName?.trim();
  if (structured) return structured;
  return launch.name.split('|').slice(1).join('|').trim() || launch.name.trim();
}

export function buildXaiSpaceXRequest(
  launch: Launch,
  now = new Date(),
  model = process.env.XAI_MODEL?.trim() || DEFAULT_XAI_MODEL,
): Record<string, unknown> {
  const fromDate = new Date(
    now.getTime() - XAI_LOOKBACK_DAYS * 24 * 60 * 60 * 1_000,
  )
    .toISOString()
    .slice(0, 10);
  const toDate = now.toISOString().slice(0, 10);

  return {
    model,
    store: false,
    max_turns: XAI_MAX_TURNS,
    max_output_tokens: XAI_MAX_OUTPUT_TOKENS,
    parallel_tool_calls: false,
    prompt_cache_key: 'launchwatch-spacex-official-v1',
    include: ['no_inline_citations'],
    reasoning: { effort: 'none' },
    input: [
      {
        role: 'user',
        content: [
          'Find up to three recent posts from the official @SpaceX account that are specifically about this launch.',
          'Return an empty posts array unless the mission match is clear.',
          'For each match, provide a factual title of at most 160 characters and the exact X status URL.',
          'Do not infer a launch status or invent a URL.',
          `Mission: ${missionName(launch)}`,
          `Vehicle: ${launch.rocket}`,
          `Target: ${launch.date}`,
          `Canonical ID: ${launch.id}`,
        ].join('\n'),
      },
    ],
    tools: [
      {
        type: 'x_search',
        allowed_x_handles: ['SpaceX'],
        from_date: fromDate,
        to_date: toDate,
      },
    ],
    text: {
      format: {
        type: 'json_schema',
        name: 'spacex_launch_updates',
        strict: true,
        schema: {
          type: 'object',
          properties: {
            posts: {
              type: 'array',
              maxItems: XAI_MAX_POSTS,
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string', maxLength: 160 },
                  url: { type: 'string' },
                },
                required: ['title', 'url'],
                additionalProperties: false,
              },
            },
          },
          required: ['posts'],
          additionalProperties: false,
        },
      },
    },
  };
}

function getOutputText(payload: XaiResponsePayload): string | null {
  for (const item of payload.output || []) {
    if (item.type !== 'message') continue;
    for (const content of item.content || []) {
      if (content.type === 'output_text' && typeof content.text === 'string') {
        return content.text;
      }
    }
  }
  return null;
}

function parseOfficialStatusUrl(value: unknown): { id: string; url: string } | null {
  if (typeof value !== 'string') return null;

  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase().replace(/^www\./, '');
    if (url.protocol !== 'https:' || !['x.com', 'twitter.com'].includes(hostname)) {
      return null;
    }

    const match = url.pathname.match(/^\/(?:spacex|i)\/status\/(\d+)(?:\/)?$/i);
    if (!match) return null;
    return {
      id: match[1],
      url: `https://x.com/SpaceX/status/${match[1]}`,
    };
  } catch {
    return null;
  }
}

function publishedAtFromStatusId(id: string): string | null {
  try {
    const milliseconds = Number(
      (BigInt(id) >> BigInt(22)) + X_STATUS_EPOCH_MS,
    );
    if (!Number.isFinite(milliseconds) || milliseconds < Number(X_STATUS_EPOCH_MS)) {
      return null;
    }
    return new Date(milliseconds).toISOString();
  } catch {
    return null;
  }
}

export function parseXaiSpaceXResponse(
  launch: Launch,
  payload: unknown,
): LaunchSocialItem[] {
  if (!payload || typeof payload !== 'object') return [];
  const outputText = getOutputText(payload as XaiResponsePayload);
  if (!outputText) return [];

  let structured: XaiStructuredPosts;
  try {
    structured = JSON.parse(outputText) as XaiStructuredPosts;
  } catch {
    return [];
  }

  if (!Array.isArray(structured.posts)) return [];

  const seen = new Set<string>();
  return structured.posts
    .flatMap((post) => {
      const status = parseOfficialStatusUrl(post.url);
      const title = typeof post.title === 'string' ? post.title.trim() : '';
      const publishedAt = status ? publishedAtFromStatusId(status.id) : null;

      if (
        !status ||
        !title ||
        title.length > 160 ||
        !publishedAt ||
        seen.has(status.id)
      ) {
        return [];
      }

      seen.add(status.id);
      return [
        {
          id: status.id,
          platform: 'x' as const,
          title,
          url: status.url,
          publishedAt,
          author: 'SpaceX',
          community: '@SpaceX',
          note: `Official SpaceX update matched to ${missionName(launch)}.`,
        },
      ];
    })
    .slice(0, XAI_MAX_POSTS);
}

async function requestXaiSpaceXUpdates(
  serializedLaunch: string,
): Promise<LaunchSocialItem[]> {
  const apiKey = process.env.XAI_API_KEY?.trim();
  if (!apiKey || !reserveXaiLookup()) return [];

  const launch = JSON.parse(serializedLaunch) as Launch;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), XAI_TIMEOUT_MS);

  try {
    const response = await fetch(XAI_RESPONSES_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(buildXaiSpaceXRequest(launch)),
      cache: 'no-store',
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`xAI request failed: ${response.status}`);
    }
    return parseXaiSpaceXResponse(launch, await response.json());
  } finally {
    clearTimeout(timeout);
  }
}

const getCachedXaiSpaceXUpdates = unstable_cache(
  requestXaiSpaceXUpdates,
  ['launchwatch-xai-spacex-official-v1'],
  { revalidate: XAI_CACHE_SECONDS },
);

function serializeXaiLaunch(launch: Launch): string {
  return JSON.stringify({
    id: launch.id,
    name: launch.name,
    missionName: launch.missionName,
    rocket: launch.rocket,
    date: launch.date,
    dateUnix: launch.dateUnix,
    source: launch.source,
    provider: launch.provider,
    isLive: launch.isLive,
  });
}

export async function getXaiSpaceXUpdates(
  launch: Launch,
  hasOfficialSpaceXSignal: boolean,
): Promise<LaunchSocialItem[]> {
  if (
    !process.env.XAI_API_KEY?.trim() ||
    !shouldUseXaiSpaceXSearch(launch, hasOfficialSpaceXSignal)
  ) {
    return [];
  }

  try {
    return await getCachedXaiSpaceXUpdates(serializeXaiLaunch(launch));
  } catch {
    return [];
  }
}
