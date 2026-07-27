import { cache } from 'react';
import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import LaunchDetailClient from './LaunchDetailClient';
import { getLaunchByIdResult, parseLaunchId } from '@/lib/api';

interface LaunchDetailPageProps {
  params: Promise<{ id: string }>;
}

const resolveLaunch = cache(async (id: string) => getLaunchByIdResult(id));

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
  const description =
    launch.description?.trim().slice(0, 180) ||
    `${launch.name} launch details, schedule, provider coverage, and mission intelligence.`;
  const image = launch.launchImageUrl || launch.image || null;

  return {
    title: `${launch.name} | LaunchWatch`,
    description,
    alternates: {
      canonical: `/launch/${encodeURIComponent(parsed.canonicalId)}`,
    },
    openGraph: {
      title: launch.name,
      description,
      type: 'article',
      ...(image ? { images: [{ url: image, alt: launch.name }] } : {}),
    },
  };
}

export default async function LaunchDetailPage({
  params,
}: LaunchDetailPageProps): Promise<React.ReactElement> {
  const { id } = await params;
  const parsed = parseLaunchId(id);
  if (!parsed) notFound();

  if (parsed.legacy) {
    permanentRedirect(`/launch/${encodeURIComponent(parsed.canonicalId)}`);
  }

  const result = await resolveLaunch(parsed.canonicalId);
  if (result.notFound) notFound();
  if (!result.data) {
    throw new Error('Launch provider is unavailable for this mission.');
  }

  return <LaunchDetailClient launch={result.data} />;
}
