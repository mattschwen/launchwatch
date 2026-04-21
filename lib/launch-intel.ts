import { createHmac, randomBytes } from 'node:crypto';

import {
  Launch,
  LaunchIntel,
  LaunchNewsItem,
  LaunchSocialItem,
  LaunchStreamCandidate,
} from './types';
import {
  buildSearchQuery,
  extractYouTubeId,
  generateYouTubeSearchUrl,
  getProviderYouTubeChannel,
  getRedditSearchUrl,
  getXSearchUrl,
  inferLaunchProvider,
} from './youtube';
import { serializeLaunchForIntel } from './launch-intel-params';
import { TTLCache } from './ttl-cache';

const YOUTUBE_API_KEY = process.env.YOUTUBE_DATA_API_KEY || process.env.NEXT_PUBLIC_YOUTUBE_API_KEY || '';
const X_BEARER_TOKEN = process.env.X_BEARER_TOKEN || '';
const X_ACCESS_TOKEN = process.env.X_ACCESS_TOKEN || '';
const X_ACCESS_TOKEN_SECRET = process.env.X_ACCESS_TOKEN_SECRET || '';
const X_CONSUMER_KEY = process.env.X_CONSUMER_KEY || '';
const X_CONSUMER_KEY_SECRET = process.env.X_CONSUMER_KEY_SECRET || '';
const USER_AGENT = 'launchwatch/1.1.1';
const AGGREGATE_FRESH_MS = 2 * 60 * 1000;
const AGGREGATE_STALE_MS = 10 * 60 * 1000;
const STREAM_FRESH_MS = 2 * 60 * 1000;
const STREAM_STALE_MS = 10 * 60 * 1000;
const NEWS_FRESH_MS = 10 * 60 * 1000;
const NEWS_STALE_MS = 60 * 60 * 1000;
const SOCIAL_FRESH_MS = 5 * 60 * 1000;
const SOCIAL_STALE_MS = 30 * 60 * 1000;

const aggregateCache = new TTLCache<LaunchIntel>({
  freshMs: AGGREGATE_FRESH_MS,
  staleMs: AGGREGATE_STALE_MS,
  maxEntries: 200,
});

const streamCache = new TTLCache<LaunchStreamCandidate[]>({
  freshMs: STREAM_FRESH_MS,
  staleMs: STREAM_STALE_MS,
  maxEntries: 200,
});

const newsCache = new TTLCache<LaunchNewsItem[]>({
  freshMs: NEWS_FRESH_MS,
  staleMs: NEWS_STALE_MS,
  maxEntries: 200,
});

const redditCache = new TTLCache<LaunchSocialItem[]>({
  freshMs: SOCIAL_FRESH_MS,
  staleMs: SOCIAL_STALE_MS,
  maxEntries: 200,
});

const xCache = new TTLCache<LaunchSocialItem[]>({
  freshMs: SOCIAL_FRESH_MS,
  staleMs: SOCIAL_STALE_MS,
  maxEntries: 200,
});

interface YouTubeSearchItem {
  id?: {
    videoId?: string;
  };
  snippet?: {
    title?: string;
    channelTitle?: string;
    channelId?: string;
    publishedAt?: string;
    liveBroadcastContent?: 'live' | 'upcoming' | 'none';
    thumbnails?: {
      high?: { url?: string };
      medium?: { url?: string };
      default?: { url?: string };
    };
  };
}

interface YouTubeVideoItem {
  id?: string;
  snippet?: {
    title?: string;
    channelTitle?: string;
    channelId?: string;
    publishedAt?: string;
    thumbnails?: {
      high?: { url?: string };
      medium?: { url?: string };
      default?: { url?: string };
    };
  };
  liveStreamingDetails?: {
    actualStartTime?: string;
    actualEndTime?: string;
    scheduledStartTime?: string;
    concurrentViewers?: string;
  };
}

const STREAM_NEGATIVE_TERMS = [
  'clips',
  'highlights',
  'reaction',
  'simulator',
  'kerbal',
  'stock',
  'earnings',
  'podcast',
  'audio only',
  'music',
  'trailer',
  'recap',
  'shorts',
];

const NEWS_PRIORITY_SOURCES = [
  'nasaspaceflight',
  'spaceflight now',
  'space.com',
  'spacenews',
  'arstechnica',
  'teslarati',
  'nasa',
];

const SOCIAL_PRIORITY_COMMUNITIES = [
  'r/spacex',
  'r/space',
  'r/rocketry',
  'r/ula',
  'r/blueorigin',
  'r/rocketlab',
  'r/spacexlounge',
];

function normalizeMissionName(name: string): string {
  return name.split('|')[0]?.trim() || name;
}

function escapeQuery(query: string): string {
  return query.replace(/\s+/g, ' ').trim();
}

function normalizeForMatch(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function hasXOAuthCredentials(): boolean {
  return Boolean(X_ACCESS_TOKEN && X_ACCESS_TOKEN_SECRET && X_CONSUMER_KEY && X_CONSUMER_KEY_SECRET);
}

function encodeRfc3986(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/g, (character) =>
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`
  );
}

function buildXOAuthHeader(method: 'GET', requestUrl: string): string {
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: X_CONSUMER_KEY,
    oauth_nonce: randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: X_ACCESS_TOKEN,
    oauth_version: '1.0',
  };

  const url = new URL(requestUrl);
  const baseUrl = `${url.protocol}//${url.host}${url.pathname}`;
  const signatureParams = [
    ...Array.from(url.searchParams.entries()),
    ...Object.entries(oauthParams),
  ].sort(([leftKey, leftValue], [rightKey, rightValue]) => {
    if (leftKey === rightKey) {
      return leftValue.localeCompare(rightValue);
    }

    return leftKey.localeCompare(rightKey);
  });

  const parameterString = signatureParams
    .map(([key, value]) => `${encodeRfc3986(key)}=${encodeRfc3986(value)}`)
    .join('&');
  const signatureBaseString = [method.toUpperCase(), encodeRfc3986(baseUrl), encodeRfc3986(parameterString)].join('&');
  const signingKey = `${encodeRfc3986(X_CONSUMER_KEY_SECRET)}&${encodeRfc3986(X_ACCESS_TOKEN_SECRET)}`;
  const oauthSignature = createHmac('sha1', signingKey).update(signatureBaseString).digest('base64');

  return `OAuth ${[...Object.entries(oauthParams), ['oauth_signature', oauthSignature] as const]
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .map(([key, value]) => `${encodeRfc3986(key)}="${encodeRfc3986(value)}"`)
    .join(', ')}`;
}

function buildMissionPhrases(launch: Launch): string[] {
  return [
    normalizeMissionName(launch.name),
    launch.missionName || '',
    launch.rocket,
    inferLaunchProvider(launch),
    `${inferLaunchProvider(launch)} ${launch.rocket}`,
    launch.missionType || '',
    launch.program || '',
  ]
    .map((phrase) => normalizeForMatch(phrase))
    .filter((phrase, index, values) => phrase.length > 2 && values.indexOf(phrase) === index);
}

function buildNewsCacheKey(launch: Launch): string {
  return escapeQuery(`${inferLaunchProvider(launch)} ${normalizeMissionName(launch.name)} ${launch.rocket}`).toLowerCase();
}

function buildSocialCacheKey(launch: Launch): string {
  return escapeQuery(`${normalizeMissionName(launch.name)} ${launch.rocket}`).toLowerCase();
}

function buildMissionTerms(launch: Launch): string[] {
  return escapeQuery(`${inferLaunchProvider(launch)} ${normalizeMissionName(launch.name)} ${launch.rocket}`)
    .split(/\s+/)
    .map((term) => term.replace(/[^\w-]/g, '').toLowerCase())
    .filter((term) => term.length > 2);
}

function scoreTextRelevance(launch: Launch, text: string): number {
  const haystack = normalizeForMatch(text);
  const terms = buildMissionTerms(launch);
  const phrases = buildMissionPhrases(launch);
  let score = 0;

  for (const phrase of phrases) {
    if (haystack.includes(phrase)) {
      score += phrase.includes(' ') ? 20 : 10;
    }
  }

  for (const term of terms) {
    if (haystack.includes(term)) {
      score += 5;
    }
  }

  if (haystack.includes('launch')) score += 6;
  if (haystack.includes('liftoff')) score += 6;
  if (haystack.includes('mission')) score += 4;
  if (haystack.includes('countdown')) score += 4;

  return score;
}

function scoreRecency(publishedAt?: string | null, thresholds: Array<[number, number]> = [[6, 16], [24, 12], [72, 7], [168, 3]]): number {
  if (!publishedAt) {
    return 0;
  }

  const publishedMs = new Date(publishedAt).getTime();
  if (Number.isNaN(publishedMs)) {
    return 0;
  }

  const diffHours = Math.abs(Date.now() - publishedMs) / (1000 * 60 * 60);
  for (const [hours, points] of thresholds) {
    if (diffHours <= hours) {
      return points;
    }
  }

  return -6;
}

function scoreCandidate(launch: Launch, title: string, channelTitle: string, liveStatus: LaunchStreamCandidate['liveStatus']): number {
  const haystack = normalizeForMatch(`${title} ${channelTitle}`);
  let score = scoreTextRelevance(launch, `${title} ${channelTitle}`);

  const provider = inferLaunchProvider(launch).toLowerCase();
  if (channelTitle.toLowerCase().includes(provider)) {
    score += 26;
  }

  if (haystack.includes('official')) score += 8;
  if (haystack.includes('live')) score += 10;
  if (haystack.includes('stream')) score += 8;
  if (haystack.includes('webcast')) score += 8;

  for (const negative of STREAM_NEGATIVE_TERMS) {
    if (haystack.includes(negative)) {
      score -= 18;
    }
  }

  if (liveStatus === 'live') {
    score += 30;
  } else if (liveStatus === 'upcoming') {
    score += 18;
  }

  return score;
}

function scoreNewsItem(launch: Launch, item: LaunchNewsItem): number {
  let score = scoreTextRelevance(launch, `${item.title} ${item.summary || ''}`);
  score += scoreRecency(item.publishedAt, [[12, 18], [36, 12], [96, 6], [240, 2]]);

  const normalizedSource = normalizeForMatch(item.source);
  if (NEWS_PRIORITY_SOURCES.some((source) => normalizedSource.includes(source))) {
    score += 10;
  }

  if (normalizedSource.includes(normalizeForMatch(inferLaunchProvider(launch)))) {
    score += 6;
  }

  return score;
}

function scoreSocialItem(launch: Launch, item: LaunchSocialItem): number {
  let score = scoreTextRelevance(launch, item.title);
  score += scoreRecency(item.publishedAt, [[6, 14], [24, 10], [72, 5], [168, 2]]);

  const community = (item.community || '').toLowerCase();
  if (SOCIAL_PRIORITY_COMMUNITIES.some((candidate) => community.includes(candidate))) {
    score += 10;
  }

  const commentsMatch = item.note?.match(/(\d+)\s+comments?/i);
  if (commentsMatch) {
    const comments = Number.parseInt(commentsMatch[1], 10);
    if (comments >= 100) score += 10;
    else if (comments >= 25) score += 6;
    else if (comments >= 10) score += 3;
  }

  return score;
}

function scoreTimeWindow(launch: Launch, candidateTime?: string | null): number {
  if (!candidateTime) {
    return 0;
  }

  const launchTime = new Date(launch.date).getTime();
  const streamTime = new Date(candidateTime).getTime();

  if (Number.isNaN(launchTime) || Number.isNaN(streamTime)) {
    return 0;
  }

  const diffHours = Math.abs(launchTime - streamTime) / (1000 * 60 * 60);

  if (diffHours <= 2) return 22;
  if (diffHours <= 6) return 15;
  if (diffHours <= 24) return 8;
  if (diffHours >= 72) return -14;
  if (diffHours >= 48) return -8;
  return 0;
}

function confidenceFromScore(score: number): LaunchStreamCandidate['confidence'] {
  if (score >= 70) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}

function getLiveStatus(video: YouTubeVideoItem, fallback?: 'live' | 'upcoming' | 'none'): LaunchStreamCandidate['liveStatus'] {
  if (video.liveStreamingDetails?.actualEndTime) return 'ended';
  if (video.liveStreamingDetails?.actualStartTime) return 'live';
  if (video.liveStreamingDetails?.scheduledStartTime) return 'upcoming';
  if (fallback === 'live') return 'live';
  if (fallback === 'upcoming') return 'upcoming';
  return 'unknown';
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

async function searchYouTubeCandidates(launch: Launch): Promise<LaunchStreamCandidate[]> {
  const candidates: LaunchStreamCandidate[] = [];
  const providedId = launch.livestream ? extractYouTubeId(launch.livestream) : null;

  if (launch.livestream && !providedId) {
    candidates.push({
      id: launch.id,
      title: 'Provider stream link',
      url: launch.livestream,
      channelTitle: inferLaunchProvider(launch),
      source: 'provided',
      confidence: 'medium',
      liveStatus: launch.isLive ? 'live' : 'unknown',
      note: 'Launch data supplied a non-YouTube stream link.',
      channelUrl: getProviderYouTubeChannel(launch),
    });
  }

  if (!YOUTUBE_API_KEY) {
    const providerChannel = getProviderYouTubeChannel(launch);
    if (providerChannel) {
      candidates.push({
        id: `${launch.id}-provider-channel`,
        title: `${inferLaunchProvider(launch)} channel`,
        url: providerChannel,
        channelTitle: inferLaunchProvider(launch),
        channelUrl: providerChannel,
        source: 'provider-channel',
        confidence: 'medium',
        liveStatus: launch.isLive ? 'live' : 'upcoming',
        note: 'Provider channel fallback when no verified video candidate is available.',
      });
    }

    candidates.push({
      id: `${launch.id}-yt-search`,
      title: 'YouTube search fallback',
      url: generateYouTubeSearchUrl(launch),
      channelTitle: 'YouTube',
      source: 'search',
      confidence: 'low',
      liveStatus: 'unknown',
      note: 'Search fallback because no YouTube Data API key is configured.',
    });

    return candidates;
  }

  const query = buildSearchQuery(launch);
  const searchParamsBase = {
    part: 'snippet',
    q: query,
    type: 'video',
    maxResults: '5',
    videoEmbeddable: 'true',
    videoSyndicated: 'true',
    key: YOUTUBE_API_KEY,
  };

  const searches = await Promise.allSettled(
    (['live', 'upcoming'] as const).map(async (eventType) => {
      const params = new URLSearchParams({
        ...searchParamsBase,
        eventType,
      });
      return fetchJson<{ items?: YouTubeSearchItem[] }>(`https://www.googleapis.com/youtube/v3/search?${params.toString()}`);
    })
  );

  const searchItems = searches.flatMap((result) =>
    result.status === 'fulfilled' ? (result.value.items || []) : []
  );

  const ids = Array.from(
    new Set(
      [
        ...searchItems
          .map((item) => item.id?.videoId)
          .filter((id): id is string => Boolean(id)),
        ...(providedId ? [providedId] : []),
      ]
    )
  );

  if (ids.length === 0) {
    const providerChannel = getProviderYouTubeChannel(launch);
    if (providerChannel) {
      candidates.push({
        id: `${launch.id}-provider-channel`,
        title: `${inferLaunchProvider(launch)} channel`,
        url: providerChannel,
        channelTitle: inferLaunchProvider(launch),
        channelUrl: providerChannel,
        source: 'provider-channel',
        confidence: 'medium',
        liveStatus: launch.isLive ? 'live' : 'upcoming',
        note: 'No matching YouTube video candidates were returned, falling back to provider channel.',
      });
    }
    return candidates;
  }

  const videoParams = new URLSearchParams({
    part: 'snippet,liveStreamingDetails',
    id: ids.join(','),
    key: YOUTUBE_API_KEY,
  });
  const videosResult = await fetchJson<{ items?: YouTubeVideoItem[] }>(`https://www.googleapis.com/youtube/v3/videos?${videoParams.toString()}`);
  const videos = videosResult.items || [];

  const ranked = videos.map((video) => {
    const searchItem = searchItems.find((item) => item.id?.videoId === video.id);
    const liveStatus = getLiveStatus(video, searchItem?.snippet?.liveBroadcastContent);
    const title = video.snippet?.title || searchItem?.snippet?.title || 'YouTube stream candidate';
    const channelTitle = video.snippet?.channelTitle || searchItem?.snippet?.channelTitle || inferLaunchProvider(launch);
    const candidateTime =
      video.liveStreamingDetails?.actualStartTime ||
      video.liveStreamingDetails?.scheduledStartTime ||
      video.snippet?.publishedAt ||
      searchItem?.snippet?.publishedAt ||
      null;
    const score =
      scoreCandidate(launch, title, channelTitle, liveStatus) +
      scoreTimeWindow(launch, candidateTime) +
      (video.id && providedId && video.id === providedId ? 18 : 0);

    return {
      id: video.id || `${launch.id}-${title}`,
      title,
      url: video.id ? `https://www.youtube.com/watch?v=${video.id}` : generateYouTubeSearchUrl(launch),
      channelTitle,
      channelUrl: video.snippet?.channelId ? `https://www.youtube.com/channel/${video.snippet.channelId}` : null,
      source: 'youtube-api' as const,
      confidence: confidenceFromScore(score),
      liveStatus,
      thumbnail:
        video.snippet?.thumbnails?.high?.url ||
        video.snippet?.thumbnails?.medium?.url ||
        video.snippet?.thumbnails?.default?.url ||
        searchItem?.snippet?.thumbnails?.high?.url ||
        null,
      scheduledStartTime: video.liveStreamingDetails?.scheduledStartTime || null,
      actualStartTime: video.liveStreamingDetails?.actualStartTime || null,
      actualEndTime: video.liveStreamingDetails?.actualEndTime || null,
      concurrentViewers: video.liveStreamingDetails?.concurrentViewers
        ? Number.parseInt(video.liveStreamingDetails.concurrentViewers, 10)
        : null,
      note:
        liveStatus === 'live'
          ? 'Verified as live via YouTube liveStreamingDetails.'
          : liveStatus === 'upcoming'
            ? 'Verified as an upcoming broadcast via YouTube liveStreamingDetails.'
            : 'Matched from YouTube search results, but no active live state was confirmed.',
      score,
    };
  });

  ranked
    .sort((a, b) => b.score - a.score)
    .forEach((item) => {
      candidates.push({
        id: item.id,
        title: item.title,
        url: item.url,
        channelTitle: item.channelTitle,
        channelUrl: item.channelUrl,
        source: item.source,
        confidence: item.confidence,
        liveStatus: item.liveStatus,
        thumbnail: item.thumbnail,
        scheduledStartTime: item.scheduledStartTime,
        actualStartTime: item.actualStartTime,
        actualEndTime: item.actualEndTime,
      concurrentViewers: item.concurrentViewers,
      note: item.note,
      score: item.score,
    });
  });

  if (candidates.length === 0) {
    candidates.push({
      id: `${launch.id}-yt-search`,
      title: 'YouTube search fallback',
      url: generateYouTubeSearchUrl(launch),
      channelTitle: 'YouTube',
      source: 'search',
      confidence: 'low',
      liveStatus: 'unknown',
      note: 'No verified candidates were returned from the API, falling back to search.',
    });
  }

  return candidates.filter((candidate, index, allCandidates) => {
    return allCandidates.findIndex((other) => other.id === candidate.id || other.url === candidate.url) === index;
  });
}

async function fetchLaunchNews(launch: Launch): Promise<LaunchNewsItem[]> {
  const query = escapeQuery(`${inferLaunchProvider(launch)} ${normalizeMissionName(launch.name)} ${launch.rocket}`);
  try {
    const params = new URLSearchParams({
      search: query,
      limit: '8',
    });
    const result = await fetchJson<{
      results?: Array<{
        id: number;
        title: string;
        url: string;
        news_site: string;
        published_at: string;
        summary?: string;
      }>;
    }>(`https://api.spaceflightnewsapi.net/v4/articles/?${params.toString()}`);

    return (result.results || [])
      .map((item) => ({
        id: String(item.id),
        title: item.title,
        url: item.url,
        source: item.news_site,
        publishedAt: item.published_at,
        summary: item.summary || null,
      }))
      .map((item) => ({ item, score: scoreNewsItem(launch, item) }))
      .filter(({ score }) => score >= 18)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      .map(({ item }) => item);
  } catch {
    return [];
  }
}

async function fetchRedditItems(launch: Launch): Promise<LaunchSocialItem[]> {
  const query = escapeQuery(`${inferLaunchProvider(launch)} ${normalizeMissionName(launch.name)} ${launch.rocket}`);
  try {
    const params = new URLSearchParams({
      q: query,
      limit: '10',
      sort: 'relevance',
      t: 'week',
    });
    const result = await fetchJson<{
      data?: {
        children?: Array<{
          data?: {
            id?: string;
            title?: string;
            subreddit?: string;
            permalink?: string;
            created_utc?: number;
            num_comments?: number;
            author?: string;
          };
        }>;
      };
    }>(`https://www.reddit.com/search.json?${params.toString()}`, {
      headers: {
        'User-Agent': USER_AGENT,
      },
      next: { revalidate: 300 },
    });

    return (result.data?.children || [])
      .flatMap((item) => {
        const post = item.data;
        if (!post?.id || !post?.title || !post?.permalink) {
          return [];
        }

        return [
          {
            id: post.id,
            platform: 'reddit' as const,
            title: post.title,
            url: `https://www.reddit.com${post.permalink}`,
            publishedAt: post.created_utc ? new Date(post.created_utc * 1000).toISOString() : null,
            author: post.author || null,
            community: post.subreddit ? `r/${post.subreddit}` : null,
            note: typeof post.num_comments === 'number' ? `${post.num_comments} comments` : null,
          },
        ];
      })
      .map((item) => ({ item, score: scoreSocialItem(launch, item) }))
      .filter(({ score }) => score >= 14)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      .map(({ item }) => item);
  } catch {
    return [];
  }
}

async function fetchXItems(launch: Launch): Promise<LaunchSocialItem[]> {
  if (!X_BEARER_TOKEN && !hasXOAuthCredentials()) {
    return [];
  }

  const query = `"${normalizeMissionName(launch.name)}" OR "${launch.rocket}"`;
  try {
    const params = new URLSearchParams({
      query,
      max_results: '10',
      'tweet.fields': 'created_at,author_id',
      expansions: 'author_id',
      'user.fields': 'username,name',
    });
    const requestUrl = `https://api.x.com/2/tweets/search/recent?${params.toString()}`;
    const authorization = X_BEARER_TOKEN
      ? `Bearer ${X_BEARER_TOKEN}`
      : buildXOAuthHeader('GET', requestUrl);
    const result = await fetchJson<{
      data?: Array<{
        id: string;
        text: string;
        created_at?: string;
        author_id?: string;
      }>;
      includes?: {
        users?: Array<{
          id: string;
          name?: string;
          username?: string;
        }>;
      };
    }>(requestUrl, {
      headers: {
        Authorization: authorization,
      },
      next: { revalidate: 300 },
    });

    const users = new Map((result.includes?.users || []).map((user) => [user.id, user]));

    return (result.data || [])
      .map((post) => {
        const user = post.author_id ? users.get(post.author_id) : undefined;
        return {
          id: post.id,
          platform: 'x' as const,
          title: post.text,
          url: `https://x.com/${user?.username || 'i'}/status/${post.id}`,
          publishedAt: post.created_at || null,
          author: user?.name || null,
          community: user?.username ? `@${user.username}` : null,
          note: 'Returned by X recent search.',
        };
      })
      .map((item) => ({ item, score: scoreSocialItem(launch, item) }))
      .filter(({ score }) => score >= 12)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      .map(({ item }) => item);
  } catch {
    return [];
  }
}

function summarizeCandidates(candidates: LaunchStreamCandidate[]): LaunchIntel['summary'] {
  const recommended = candidates[0];

  if (!recommended) {
    return {
      streamState: 'none',
      recommendedLabel: 'No stream lead yet',
      recommendedUrl: null,
      rationale: 'No provider link or ranked candidate is currently available.',
      lastUpdated: new Date().toISOString(),
    };
  }

  if (recommended.liveStatus === 'live') {
    return {
      streamState: 'live',
      recommendedLabel: 'Watch Live',
      recommendedUrl: recommended.url,
      rationale: recommended.note || 'Best current live stream candidate.',
      lastUpdated: new Date().toISOString(),
    };
  }

  if (recommended.liveStatus === 'upcoming') {
    return {
      streamState: 'upcoming',
      recommendedLabel: 'Open Standby Stream',
      recommendedUrl: recommended.url,
      rationale: recommended.note || 'Upcoming stream candidate is available before liftoff.',
      lastUpdated: new Date().toISOString(),
    };
  }

  if (recommended.source === 'provider-channel') {
    return {
      streamState: 'standby',
      recommendedLabel: 'Track Provider Channel',
      recommendedUrl: recommended.url,
      rationale: recommended.note || 'Provider channel is the best fallback while waiting for a verified live page.',
      lastUpdated: new Date().toISOString(),
    };
  }

  if (recommended.url) {
    return {
      streamState: 'search',
      recommendedLabel: 'Search for Stream',
      recommendedUrl: recommended.url,
      rationale: recommended.note || 'Search fallback is currently the best available lead.',
      lastUpdated: new Date().toISOString(),
    };
  }

  return {
    streamState: 'none',
    recommendedLabel: 'No stream lead yet',
    recommendedUrl: null,
    rationale: 'No usable stream candidate was ranked.',
    lastUpdated: new Date().toISOString(),
  };
}

export async function getLaunchIntel(launch: Launch): Promise<LaunchIntel> {
  const cacheKey = serializeLaunchForIntel(launch);
  const newsKey = buildNewsCacheKey(launch);
  const socialKey = buildSocialCacheKey(launch);

  return aggregateCache.getOrLoad(cacheKey, async () => {
    const [streamCandidates, newsItems, redditItems, xItems] = await Promise.all([
      streamCache.getOrLoad(cacheKey, () => searchYouTubeCandidates(launch)),
      newsCache.getOrLoad(newsKey, () => fetchLaunchNews(launch)),
      redditCache.getOrLoad(socialKey, () => fetchRedditItems(launch)),
      xCache.getOrLoad(socialKey, () => fetchXItems(launch)),
    ]);

    return {
      summary: summarizeCandidates(streamCandidates),
      streamCandidates,
      newsItems,
      socialItems: [...xItems, ...redditItems].sort((a, b) => {
        const left = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
        const right = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
        return right - left;
      }),
      quickLinks: {
        youtubeSearch: generateYouTubeSearchUrl(launch),
        providerChannel: getProviderYouTubeChannel(launch),
        redditSearch: getRedditSearchUrl(launch),
        xSearch: getXSearchUrl(launch),
      },
    };
  });
}
