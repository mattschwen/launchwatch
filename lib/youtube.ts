/**
 * YouTube Search and Stream Detection
 * Automatically finds livestreams for launches when API doesn't provide them
 */

import { Launch } from './types';

const YOUTUBE_SEARCH_BASE = 'https://www.googleapis.com/youtube/v3/search';
const YOUTUBE_API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY || '';

/**
 * Search YouTube for a launch livestream
 * Falls back to web scraping if no API key
 */
export async function searchYouTubeLivestream(launch: Launch): Promise<string | null> {
  // If we already have a livestream, validate it
  if (launch.livestream) {
    const validated = await validateYouTubeUrl(launch.livestream);
    if (validated) return validated;
  }

  // Try YouTube API search if key available
  if (YOUTUBE_API_KEY && YOUTUBE_API_KEY !== 'DEMO_KEY') {
    const apiResult = await searchViaAPI(launch);
    if (apiResult) return apiResult;
  }

  // Fallback: Generate search URL for user to click
  return generateYouTubeSearchUrl(launch);
}

/**
 * Validate and normalize YouTube URL
 */
async function validateYouTubeUrl(url: string): Promise<string | null> {
  try {
    const videoId = extractYouTubeId(url);
    if (videoId) {
      return `https://www.youtube.com/watch?v=${videoId}`;
    }
  } catch (error) {
    console.error('Invalid YouTube URL:', error);
  }
  return null;
}

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
 * Search YouTube API for livestream
 */
async function searchViaAPI(launch: Launch): Promise<string | null> {
  try {
    // Build search query
    const query = buildSearchQuery(launch);

    const params = new URLSearchParams({
      part: 'snippet',
      q: query,
      type: 'video',
      eventType: 'completed,live', // Include both live and recent
      order: 'date', // Most recent first
      maxResults: '5',
      key: YOUTUBE_API_KEY,
    });

    const response = await fetch(`${YOUTUBE_SEARCH_BASE}?${params.toString()}`);

    if (!response.ok) {
      console.warn('YouTube API error:', response.status);
      return null;
    }

    const data = await response.json();

    if (data.items && data.items.length > 0) {
      // Return the most recent/relevant video
      const videoId = data.items[0].id.videoId;
      return `https://www.youtube.com/watch?v=${videoId}`;
    }
  } catch (error) {
    console.error('YouTube API search failed:', error);
  }

  return null;
}

/**
 * Build search query for YouTube
 */
function buildSearchQuery(launch: Launch): string {
  const keywords = [];

  // Add provider-specific keywords
  if (launch.name.toLowerCase().includes('spacex') ||
      launch.rocket.toLowerCase().includes('falcon') ||
      launch.rocket.toLowerCase().includes('starship')) {
    keywords.push('SpaceX');
  } else if (launch.name.toLowerCase().includes('nasa')) {
    keywords.push('NASA');
  } else if (launch.name.toLowerCase().includes('ula')) {
    keywords.push('ULA');
  } else if (launch.name.toLowerCase().includes('rocket lab')) {
    keywords.push('Rocket Lab');
  }

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
 * Scrape Spaceflight Now for livestream
 * This is a fallback when API has no data
 */
export async function findSpaceflightNowStream(launch: Launch): Promise<string | null> {
  try {
    // Spaceflight Now often has streams for major launches
    const searchUrl = `https://spaceflightnow.com/launch-schedule/`;

    // This would require server-side scraping
    // For client-side, we can generate a search URL
    const query = `${launch.rocket} ${launch.name} launch live`;
    const params = new URLSearchParams({
      q: `site:youtube.com ${query}`,
    });

    // Use Google search as proxy
    return `https://www.google.com/search?${params.toString()}`;
  } catch (error) {
    console.error('Spaceflight Now search failed:', error);
    return null;
  }
}

/**
 * Enhanced livestream detection for current launch
 * Tries multiple sources to find an active stream
 */
export async function findLivestream(launch: Launch): Promise<{
  url: string | null;
  source: 'api' | 'youtube-api' | 'search' | 'fallback';
  confidence: 'high' | 'medium' | 'low';
}> {
  // Priority 1: API provided URL
  if (launch.livestream) {
    const validated = await validateYouTubeUrl(launch.livestream);
    if (validated) {
      return {
        url: validated,
        source: 'api',
        confidence: 'high'
      };
    }
  }

  // Priority 2: YouTube API search
  if (YOUTUBE_API_KEY && YOUTUBE_API_KEY !== 'DEMO_KEY') {
    const apiResult = await searchViaAPI(launch);
    if (apiResult) {
      return {
        url: apiResult,
        source: 'youtube-api',
        confidence: 'high'
      };
    }
  }

  // Priority 3: Generate search URL
  const searchUrl = generateYouTubeSearchUrl(launch);
  return {
    url: searchUrl,
    source: 'search',
    confidence: 'medium'
  };
}

/**
 * Get the channel for a provider
 */
export function getProviderYouTubeChannel(launch: Launch): string | null {
  const name = launch.name.toLowerCase();
  const rocket = launch.rocket.toLowerCase();

  if (name.includes('spacex') || rocket.includes('falcon') || rocket.includes('starship')) {
    return 'https://www.youtube.com/@SpaceX/streams';
  } else if (name.includes('nasa')) {
    return 'https://www.youtube.com/@NASA/streams';
  } else if (name.includes('ula')) {
    return 'https://www.youtube.com/@ulalaunch/streams';
  } else if (name.includes('rocket lab')) {
    return 'https://www.youtube.com/@RocketLab/streams';
  } else if (name.includes('blue origin')) {
    return 'https://www.youtube.com/@blueorigin/streams';
  }

  return null;
}
