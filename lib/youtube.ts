/**
 * YouTube Search and Stream Detection
 * Automatically finds livestreams for launches when API doesn't provide them
 */

import { Launch } from './types';

/**
 * Extract YouTube video ID from various URL formats
 */
export function extractYouTubeId(url: string): string | null {
  if (!url) return null;

  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&\?\/]+)/,
    /youtube\.com\/live\/([^&\?\/]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
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
  const keywords = [inferLaunchProvider(launch)];

  // Add rocket name
  keywords.push(launch.rocket);

  // Add mission keywords
  const missionName = launch.name.split('|')[0].trim();
  keywords.push(missionName);

  // Add "launch" and "livestream"
  keywords.push('launch livestream');

  return keywords.join(' ');
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
