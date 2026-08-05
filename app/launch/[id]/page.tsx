import { cache } from 'react';
import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import LaunchDetailClient from './LaunchDetailClient';
import { getLaunchByIdResult, parseLaunchId } from '@/lib/api';
import {
  buildHistoryReturnHref,
  readHistoryReturnQuery,
} from '@/lib/history-return';
import {
  buildScheduleReturnHref,
  readScheduleReturnQuery,
} from '@/lib/schedule-return';
import { getLaunchVisualMetadata } from '@/lib/launch-visual';

interface LaunchDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    from?: string | string[];
    history?: string | string[];
    schedule?: string | string[];
  }>;
}

const resolveLaunch = cache(async (id: string) => getLaunchByIdResult(id));

function socialDescription(name: string, description: string | null): string {
  const plainText = description
    ?.replace(/^\s*[*+-]\s+/gm, '• ')
    .replace(/\s+/g, ' ')
    .trim();

  return (
    plainText ||
    `${name} launch details, schedule, provider coverage, and mission intelligence.`
  ).slice(0, 180);
}

export async function generateMetadata({
  params,
}: LaunchDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const parsed = parseLaunchId(id);
  if (!parsed) {
    return {
      title: 'Mission not found | LaunchWatch',
    };
  }

  const result = await resolveLaunch(parsed.canonicalId);
  if (!result.data) {
    return {
      title: result.notFound
        ? 'Mission not found | LaunchWatch'
        : 'Mission unavailable | LaunchWatch',
      ...(result.notFound
        ? {}
        : { robots: { index: false, follow: false } }),
    };
  }

  const launch = result.data;
  const description = socialDescription(launch.name, launch.description);
  const image = getLaunchVisualMetadata(launch);
  const canonicalPath = `/launch/${encodeURIComponent(parsed.canonicalId)}`;

  return {
    title: `${launch.name} | LaunchWatch`,
    description,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      title: launch.name,
      description,
      type: 'article',
      url: canonicalPath,
      ...(image ? { images: [image] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: launch.name,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

export default async function LaunchDetailPage({
  params,
  searchParams,
}: LaunchDetailPageProps): Promise<React.ReactElement> {
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const returnToWatch = resolvedSearchParams.from === 'watch';
  const historyReturnQuery =
    !returnToWatch && resolvedSearchParams.from === 'history'
      ? readHistoryReturnQuery(resolvedSearchParams.history)
      : null;
  const historyReturnHref = historyReturnQuery
    ? buildHistoryReturnHref(historyReturnQuery)
    : null;
  const scheduleReturnQuery =
    !returnToWatch &&
    !historyReturnQuery &&
    resolvedSearchParams.from === 'home'
      ? readScheduleReturnQuery(resolvedSearchParams.schedule)
      : null;
  const scheduleReturnHref = scheduleReturnQuery
    ? buildScheduleReturnHref(scheduleReturnQuery)
    : null;
  const parsed = parseLaunchId(id);
  if (!parsed) notFound();

  if (parsed.legacy) {
    permanentRedirect(
      `/launch/${encodeURIComponent(parsed.canonicalId)}${
        returnToWatch
          ? '?from=watch'
          : historyReturnQuery
            ? `?${new URLSearchParams({
                from: 'history',
                history: historyReturnQuery,
              }).toString()}`
            : scheduleReturnQuery
              ? `?${new URLSearchParams({
                  from: 'home',
                  schedule: scheduleReturnQuery,
                }).toString()}`
            : ''
      }`
    );
  }

  const result = await resolveLaunch(parsed.canonicalId);
  if (result.notFound) notFound();
  if (!result.data) {
    throw new Error('Launch provider is unavailable for this mission.');
  }

  return (
    <LaunchDetailClient
      launch={result.data}
      returnToWatch={returnToWatch}
      historyReturnHref={historyReturnHref}
      scheduleReturnHref={scheduleReturnHref}
    />
  );
}
