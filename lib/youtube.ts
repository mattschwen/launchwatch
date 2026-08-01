/**
 * YouTube Search and Stream Detection
 * Automatically finds livestreams for launches when API doesn't provide them
 */

import type { Launch } from './types';

const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'www.youtube-nocookie.com',
  'youtube-nocookie.com',
]);
const YOUTUBE_ID_PATTERN = /^[A-Za-z0-9_-]{3,128}$/;

/**
 * Extract YouTube video ID from various URL formats
 */
export function extractYouTubeId(url: string): string | null {
  if (!url) return null;

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password) {
      return null;
    }

    const hostname = parsed.hostname.toLowerCase();
    let videoId: string | null = null;

    if (hostname === 'youtu.be') {
      videoId = parsed.pathname.split('/').filter(Boolean)[0] ?? null;
    } else if (YOUTUBE_HOSTS.has(hostname)) {
      if (parsed.pathname === '/watch') {
        videoId = parsed.searchParams.get('v');
      } else {
        const [kind, candidate] = parsed.pathname.split('/').filter(Boolean);
        if (kind === 'embed' || kind === 'v' || kind === 'live' || kind === 'shorts') {
          videoId = candidate ?? null;
        }
      }
    }

    return videoId && YOUTUBE_ID_PATTERN.test(videoId) ? videoId : null;
  } catch {
    return null;
  }
}

/**
 * Build search query for YouTube
 */
export function inferLaunchProvider(launch: Launch): string {
  const name = launch.name.toLowerCase();
  const rocket = launch.rocket.toLowerCase();

  if (name.includes('spacex') || rocket.includes('falcon') || rocket.includes('starship')) {
    return 'SpaceX';
  }
  if (name.includes('nasa') || name.includes('artemis') || name.includes('sls')) {
    return 'NASA';
  }
  if (name.includes('ula') || rocket.includes('atlas') || rocket.includes('vulcan') || rocket.includes('delta')) {
    return 'ULA';
  }
  if (name.includes('rocket lab') || rocket.includes('electron') || rocket.includes('neutron')) {
    return 'Rocket Lab';
  }
  if (name.includes('blue origin') || rocket.includes('new glenn') || rocket.includes('new shepard')) {
    return 'Blue Origin';
  }
  if (name.includes('arianespace') || rocket.includes('ariane')) {
    return 'Arianespace';
  }

  return 'Launch Provider';
}

export function buildSearchQuery(launch: Launch): string {
  const provider = inferLaunchProvider(launch);
  const missionName = launch.name.includes('|')
    ? launch.name.split('|').slice(1).join('|').trim()
    : launch.name.trim();
  const keywords = provider === 'Launch Provider' ? [] : [provider];

  keywords.push(launch.rocket);
  keywords.push(missionName);
  keywords.push('launch livestream');

  return [...new Map(
    keywords
      .filter(Boolean)
      .map((keyword) => [keyword.toLowerCase(), keyword]),
  ).values()].join(' ');
}

/**
 * Generate YouTube search URL as fallback
 */
export function generateYouTubeSearchUrl(launch: Launch): string {
  const query = buildSearchQuery(launch);
  const params = new URLSearchParams({
    search_query: query,
  });

  return `https://www.youtube.com/results?${params.toString()}`;
}

/**
 * Get embed URL from any YouTube URL
 */
export function getYouTubeEmbedUrl(url: string | null): string | null {
  if (!url) return null;

  const videoId = extractYouTubeId(url);
  if (!videoId) return url; // Return original if can't parse

  return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=0`;
}

/**
 * Get the channel for a provider
 */
export function getProviderYouTubeChannel(launch: Launch): string | null {
  switch (inferLaunchProvider(launch)) {
    case 'SpaceX':
      return 'https://www.youtube.com/@SpaceX/streams';
    case 'NASA':
      return 'https://www.youtube.com/@NASA/streams';
    case 'ULA':
      return 'https://www.youtube.com/@ulalaunch/streams';
    case 'Rocket Lab':
      return 'https://www.youtube.com/@RocketLab/streams';
    case 'Blue Origin':
      return 'https://www.youtube.com/@blueorigin/streams';
    case 'Arianespace':
      return 'https://www.youtube.com/@arianespace/streams';
    default:
      return null;
  }
}

export function getRedditSearchUrl(launch: Launch): string {
  const params = new URLSearchParams({
    q: buildSearchQuery(launch),
    sort: 'new',
  });

  return `https://www.reddit.com/search/?${params.toString()}`;
}

export function getXSearchUrl(launch: Launch): string {
  const params = new URLSearchParams({
    q: buildSearchQuery(launch),
    src: 'typed_query',
    f: 'live',
  });

  return `https://x.com/search?${params.toString()}`;
}
