import { SpaceXLaunch, SpaceXRocket, LL2Launch, APOD, Launch, RocketFact } from './types';

// API Configuration
const SPACEX_API = 'https://api.spacexdata.com/v4';
const LL2_API_KEY = process.env.NEXT_PUBLIC_LL2_API_KEY || '';
const LL2_API = LL2_API_KEY
  ? 'https://lldev.thespacedevs.com/2.2.0' // Premium endpoint (higher limits)
  : 'https://ll.thespacedevs.com/2.2.0';   // Free endpoint (15 req/hour)
const ROCKETLAUNCH_API = 'https://fdo.rocketlaunch.live/json/launches/next/5'; // Fallback API
const NASA_API = 'https://api.nasa.gov';
const NASA_API_KEY = process.env.NEXT_PUBLIC_NASA_API_KEY || 'DEMO_KEY';

// Cache configuration
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes for most data
const LL2_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes for LL2 (rate limited - 15 req/hour)
let cache: { [key: string]: { data: any; timestamp: number } } = {};

function getCachedData<T>(key: string, customDuration?: number): T | null {
  const cached = cache[key];
  const duration = customDuration || CACHE_DURATION;
  if (cached && Date.now() - cached.timestamp < duration) {
    return cached.data as T;
  }
  return null;
}

function getStaleCachedData<T>(key: string): T | null {
  const cached = cache[key];
  return cached ? (cached.data as T) : null;
}

function setCachedData(key: string, data: any) {
  cache[key] = { data, timestamp: Date.now() };
}

// SpaceX API Functions
export async function getSpaceXUpcomingLaunches(): Promise<SpaceXLaunch[]> {
  const cacheKey = 'spacex_upcoming';
  const cached = getCachedData<SpaceXLaunch[]>(cacheKey);
  if (cached) return cached;

  try {
    // Use query endpoint with populate to get full rocket and launchpad data
    const response = await fetch(`${SPACEX_API}/launches/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: {
          upcoming: true
        },
        options: {
          populate: ['rocket', 'launchpad'],
          sort: { date_unix: 'asc' }
        }
      }),
      next: { revalidate: 300 } // Revalidate every 5 minutes
    });
    if (!response.ok) throw new Error('Failed to fetch SpaceX launches');
    const result = await response.json();
    const data = result.docs || [];
    setCachedData(cacheKey, data);
    return data;
  } catch (error) {
    console.error('Error fetching SpaceX launches:', error);
    return [];
  }
}

export async function getSpaceXPastLaunches(limit: number = 10): Promise<SpaceXLaunch[]> {
  const cacheKey = `spacex_past_${limit}`;
  const cached = getCachedData<SpaceXLaunch[]>(cacheKey);
  if (cached) return cached;

  try {
    // Use query endpoint with populate to get full rocket and launchpad data
    const response = await fetch(`${SPACEX_API}/launches/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: {
          upcoming: false
        },
        options: {
          populate: ['rocket', 'launchpad'],
          sort: { date_unix: 'desc' },
          limit: limit
        }
      }),
      next: { revalidate: 3600 } // Past launches don't change often
    });
    if (!response.ok) throw new Error('Failed to fetch SpaceX past launches');
    const result = await response.json();
    const data = result.docs || [];
    setCachedData(cacheKey, data);
    return data;
  } catch (error) {
    console.error('Error fetching SpaceX past launches:', error);
    return [];
  }
}

export async function getSpaceXRockets(): Promise<SpaceXRocket[]> {
  const cacheKey = 'spacex_rockets';
  const cached = getCachedData<SpaceXRocket[]>(cacheKey);
  if (cached) return cached;

  try {
    const response = await fetch(`${SPACEX_API}/rockets`, {
      next: { revalidate: 86400 } // Rocket data changes very rarely
    });
    if (!response.ok) throw new Error('Failed to fetch SpaceX rockets');
    const data = await response.json();
    setCachedData(cacheKey, data);
    return data;
  } catch (error) {
    console.error('Error fetching SpaceX rockets:', error);
    return [];
  }
}

// Launch Library 2 API Functions
export async function getLL2UpcomingLaunches(limit: number = 20): Promise<LL2Launch[]> {
  const cacheKey = `ll2_upcoming_${limit}`;

  // Check cache with extended duration (10 minutes)
  const cached = getCachedData<LL2Launch[]>(cacheKey, LL2_CACHE_DURATION);
  if (cached) return cached;

  try {
    const headers: HeadersInit = {};
    if (LL2_API_KEY) {
      headers['Authorization'] = `Token ${LL2_API_KEY}`;
    }

    const response = await fetch(`${LL2_API}/launch/upcoming/?limit=${limit}`, {
      headers,
      next: { revalidate: 1800 } // 30 minutes
    });

    // Handle rate limiting (429)
    if (response.status === 429) {
      console.warn('LL2 rate limit hit, returning stale cache if available');
      const staleCache = getStaleCachedData<LL2Launch[]>(cacheKey);
      if (staleCache) return staleCache;
      return []; // No cache available
    }

    if (!response.ok) throw new Error('Failed to fetch LL2 launches');
    const data = await response.json();
    setCachedData(cacheKey, data.results);
    return data.results;
  } catch (error) {
    console.error('Error fetching LL2 launches:', error);

    // Return stale cache if available on error
    const staleCache = getStaleCachedData<LL2Launch[]>(cacheKey);
    if (staleCache) {
      console.warn('Returning stale LL2 cache due to error');
      return staleCache;
    }

    return [];
  }
}

// RocketLaunch.Live API (Fallback when LL2 is rate limited)
export async function getRocketLaunchLiveData(limit: number = 5): Promise<LL2Launch[]> {
  const cacheKey = `rll_upcoming_${limit}`;
  const cached = getCachedData<LL2Launch[]>(cacheKey, LL2_CACHE_DURATION);
  if (cached) return cached;

  try {
    const response = await fetch(ROCKETLAUNCH_API, {
      next: { revalidate: 1800 } // 30 minutes
    });

    if (!response.ok) {
      console.warn('RocketLaunch.Live API failed');
      return [];
    }

    const data = await response.json();
    // RocketLaunch.Live has different structure, so we'll use LL2 as it's also available there
    // For now, return empty and rely on stale cache
    console.log('RocketLaunch.Live response:', data);

    // Note: RocketLaunch.Live structure may differ, needs mapping
    // This is a placeholder - would need proper mapping if using this API
    setCachedData(cacheKey, []);
    return [];
  } catch (error) {
    console.error('Error fetching RocketLaunch.Live:', error);
    return [];
  }
}

// NASA API Functions
export async function getNASAAPOD(): Promise<APOD | null> {
  const cacheKey = 'nasa_apod';
  const cached = getCachedData<APOD>(cacheKey);
  if (cached) return cached;

  try {
    const response = await fetch(`${NASA_API}/planetary/apod?api_key=${NASA_API_KEY}`, {
      next: { revalidate: 86400 } // APOD changes daily
    });
    if (!response.ok) throw new Error('Failed to fetch NASA APOD');
    const data = await response.json();
    setCachedData(cacheKey, data);
    return data;
  } catch (error) {
    console.error('Error fetching NASA APOD:', error);
    return null;
  }
}

// Combined Data Functions
export async function getAllUpcomingLaunches(): Promise<Launch[]> {
  try {
    const [spacexLaunches, ll2Launches] = await Promise.all([
      getSpaceXUpcomingLaunches(),
      getLL2UpcomingLaunches(20)
    ]);

    // Convert to unified format
    const launches: Launch[] = [
      ...spacexLaunches.slice(0, 10).map(launch => ({
        id: `spacex-${launch.id}`,
        name: launch.name,
        date: launch.date_utc,
        dateUnix: launch.date_unix,
        rocket: typeof launch.rocket === 'object' ? launch.rocket.name : launch.rocket,
        launchSite: typeof launch.launchpad === 'object' ? launch.launchpad.name : launch.launchpad,
        status: launch.upcoming ? 'upcoming' as const : (launch.success ? 'success' as const : 'failure' as const),
        livestream: launch.links.webcast,
        description: launch.details,
        isLive: false
      })),
      ...ll2Launches.slice(0, 10).map(launch => ({
        id: `ll2-${launch.id}`,
        name: launch.name,
        date: launch.net,
        dateUnix: new Date(launch.net).getTime() / 1000,
        rocket: launch.rocket.configuration.name,
        launchSite: launch.pad.name,
        status: launch.status.abbrev === 'Go' ? 'upcoming' as const : 'tbd' as const,
        livestream: launch.vidURLs?.[0]?.url || null,
        description: launch.mission?.description || null,
        isLive: launch.webcast_live
      }))
    ];

    // Filter out past launches - only show from today onwards
    const now = Date.now() / 1000;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todayUnix = startOfToday.getTime() / 1000;

    const futureLaunches = launches.filter(launch => launch.dateUnix >= todayUnix);

    // Sort by date
    futureLaunches.sort((a, b) => a.dateUnix - b.dateUnix);

    // Check if any launch is happening within ±2 hours
    const twoHours = 2 * 60 * 60;

    futureLaunches.forEach(launch => {
      const timeDiff = Math.abs(launch.dateUnix - now);
      if (timeDiff <= twoHours) {
        launch.isLive = true;
        launch.status = 'live';
      }
    });

    return futureLaunches;
  } catch (error) {
    console.error('Error getting all launches:', error);
    return [];
  }
}

// Get live launches (within ±2 hours)
export async function getLiveLaunches(): Promise<Launch[]> {
  const allLaunches = await getAllUpcomingLaunches();
  return allLaunches.filter(launch => launch.isLive);
}

// Rocket Facts Generator
export async function getRocketFacts(): Promise<RocketFact[]> {
  const facts: RocketFact[] = [];

  try {
    const [rockets, apod] = await Promise.all([
      getSpaceXRockets(),
      getNASAAPOD()
    ]);

    // Add rocket statistics
    rockets.forEach((rocket, index) => {
      facts.push({
        id: `rocket-height-${index}`,
        type: 'stat',
        title: `${rocket.name} Height`,
        value: `${rocket.height.meters}m (${rocket.height.feet}ft)`,
        source: 'spacex'
      });

      facts.push({
        id: `rocket-mass-${index}`,
        type: 'stat',
        title: `${rocket.name} Mass`,
        value: `${rocket.mass.kg.toLocaleString()}kg`,
        source: 'spacex'
      });

      facts.push({
        id: `rocket-success-${index}`,
        type: 'stat',
        title: `${rocket.name} Success Rate`,
        value: `${rocket.success_rate_pct}%`,
        source: 'spacex'
      });

      if (rocket.description) {
        facts.push({
          id: `rocket-desc-${index}`,
          type: 'trivia',
          title: rocket.name,
          value: rocket.description,
          source: 'spacex'
        });
      }
    });

    // Add NASA APOD
    if (apod) {
      facts.push({
        id: 'apod',
        type: 'apod',
        title: apod.title,
        value: apod.explanation,
        source: 'nasa'
      });
    }

    // Add some curated trivia
    const trivia: RocketFact[] = [
      {
        id: 'trivia-1',
        type: 'trivia',
        title: 'Fastest Rocket',
        value: 'The Saturn V rocket reached speeds of 40,000 km/h during Apollo missions',
        source: 'nasa'
      },
      {
        id: 'trivia-2',
        type: 'trivia',
        title: 'Reusable Innovation',
        value: 'SpaceX Falcon 9 first stage has been reused over 20 times',
        source: 'spacex'
      },
      {
        id: 'trivia-3',
        type: 'trivia',
        title: 'Fuel Capacity',
        value: 'The Space Shuttle external tank held 227,000 liters of liquid hydrogen',
        source: 'nasa'
      }
    ];

    facts.push(...trivia);

    return facts;
  } catch (error) {
    console.error('Error generating rocket facts:', error);
    return [];
  }
}

// Get next upcoming launch
export async function getNextLaunch(): Promise<Launch | null> {
  const launches = await getAllUpcomingLaunches();
  return launches.length > 0 ? launches[0] : null;
}
