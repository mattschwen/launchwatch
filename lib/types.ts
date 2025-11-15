// SpaceX API Types
export interface SpaceXLaunch {
  id: string;
  name: string;
  date_utc: string;
  date_unix: number;
  rocket: string;
  success: boolean | null;
  details: string | null;
  links: {
    webcast: string | null;
    youtube_id: string | null;
    article: string | null;
    wikipedia: string | null;
  };
  launchpad: string;
  upcoming: boolean;
}

export interface SpaceXRocket {
  id: string;
  name: string;
  type: string;
  active: boolean;
  stages: number;
  boosters: number;
  cost_per_launch: number;
  success_rate_pct: number;
  first_flight: string;
  country: string;
  company: string;
  height: {
    meters: number;
    feet: number;
  };
  diameter: {
    meters: number;
    feet: number;
  };
  mass: {
    kg: number;
    lb: number;
  };
  description: string;
}

// Launch Library 2 Types
export interface LL2Launch {
  id: string;
  name: string;
  net: string; // Network Estimated Time
  window_start: string;
  window_end: string;
  status: {
    id: number;
    name: string;
    abbrev: string;
    description: string;
  };
  rocket: {
    id: number;
    configuration: {
      id: number;
      name: string;
      family: string;
      variant: string;
    };
  };
  pad: {
    id: number;
    name: string;
    location: {
      name: string;
      country_code: string;
    };
  };
  webcast_live: boolean;
  vidURLs: Array<{
    url: string;
    title: string;
  }> | null;
  mission: {
    name: string;
    description: string;
    type: string;
  } | null;
}

// NASA APOD Type
export interface APOD {
  date: string;
  explanation: string;
  hdurl?: string;
  media_type: string;
  service_version: string;
  title: string;
  url: string;
}

// Combined Launch Type (for our app)
export interface Launch {
  id: string;
  name: string;
  date: string;
  dateUnix: number;
  rocket: string;
  launchSite: string;
  status: 'upcoming' | 'live' | 'success' | 'failure' | 'tbd';
  livestream: string | null;
  description: string | null;
  isLive: boolean;
}

// Rocket Facts Type
export interface RocketFact {
  id: string;
  type: 'stat' | 'mission' | 'apod' | 'trivia';
  title: string;
  value: string;
  source: 'spacex' | 'nasa' | 'll2';
}
