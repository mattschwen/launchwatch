// SpaceX API Types
export interface SpaceXLaunch {
  id: string;
  name: string;
  date_utc: string;
  date_unix: number;
  rocket: string | { id: string; name: string };
  success: boolean | null;
  details: string | null;
  links: {
    webcast: string | null;
    youtube_id: string | null;
    article: string | null;
    wikipedia: string | null;
    flickr?: {
      original?: string[];
    };
    patch?: {
      small?: string | null;
      large?: string | null;
    };
  };
  launchpad: string | {
    id: string;
    name: string;
    full_name?: string | null;
    latitude?: number | string | null;
    longitude?: number | string | null;
    locality?: string | null;
    region?: string | null;
  };
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
export interface LL2Media {
  image_url: string;
  thumbnail_url?: string | null;
}

export interface LL2NamedReference {
  name?: string | null;
  abbrev?: string | null;
  description?: string | null;
}

export interface LL2Video {
  url: string;
  title?: string | null;
  priority?: number;
  source?: string | null;
  publisher?: string | null;
  feature_image?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  live?: boolean;
  type?: LL2NamedReference | null;
}

export interface LL2Launch {
  id: string;
  name: string;
  net: string; // Network Estimated Time
  window_start?: string | null;
  window_end?: string | null;
  status: {
    id: number;
    name: string;
    abbrev: string;
    description?: string | null;
  };
  rocket: {
    id: number;
    configuration: {
      id: number;
      name: string;
      full_name?: string | null;
      families?: Array<LL2NamedReference & { id?: number }> | null;
      family?: string | null;
      variant?: string | null;
      image?: LL2Media | string | null;
      image_url?: string | null;
    };
  };
  pad: {
    id: number;
    name: string;
    latitude?: number | string | null;
    longitude?: number | string | null;
    location?: {
      name: string;
      country_code?: string | null;
      country?: {
        alpha_2_code?: string | null;
      } | null;
    } | null;
    country?: {
      alpha_2_code?: string | null;
    } | null;
    image?: LL2Media | string | null;
    map_image?: LL2Media | string | null;
  };
  launch_service_provider?: {
    name: string;
    logo?: LL2Media | string | null;
    logo_url?: string | null;
  } | null;
  webcast_live?: boolean;
  vid_urls?: LL2Video[] | null;
  /** Launch Library 2.2 compatibility. */
  vidURLs?: LL2Video[] | null;
  mission?: {
    name?: string | null;
    description?: string | null;
    type?: string | null;
    image?: LL2Media | string | null;
    vid_urls?: LL2Video[] | null;
    orbit?: {
      name: string;
      abbrev: string;
    } | null;
  } | null;
  timeline?: Array<{
    type: {
      name?: string | null;
      abbrev?: string | null;
      description?: string | null;
    };
    relative_time: string;
    description?: string | null;
  }> | null;
  program?: Array<{
    name: string;
  }> | null;
  image?: LL2Media | string | null;
  mission_patches?: Array<{
    image_url?: string | null;
    priority?: number;
  }> | null;
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

export interface LaunchLocation {
  lat: number;
  lng: number;
  name: string;
  countryCode?: string;
}

export interface LaunchStream {
  url: string;
  title: string;
  priority?: number;
  source?: string | null;
  thumbnail?: string | null;
  type?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  isLive?: boolean;
}

export interface LaunchTimelineEvent {
  type: string;
  relativeTime: string;
  description: string;
}

export type LaunchSource = 'spacex' | 'll2';

export interface Launch {
  id: string;
  /**
   * Provider-native identifier. Older callers may not populate this field, so
   * consumers should fall back to parsing `id` until all stored payloads have
   * rolled forward.
   */
  sourceId?: string | null;
  name: string;
  date: string;
  dateUnix: number;
  rocket: string;
  launchSite: string;
  status: 'upcoming' | 'live' | 'success' | 'failure' | 'tbd';
  statusName?: string | null;
  missionName?: string | null;
  missionType?: string | null;
  windowStart?: string | null;
  windowEnd?: string | null;
  livestream: string | null;
  livestreams?: LaunchStream[] | null;
  description: string | null;
  isLive: boolean;
  webcastLive?: boolean;
  image?: string | null;
  missionPatch?: string | null;
  rocketImageUrl?: string | null;
  launchImageUrl?: string | null;
  padMapImage?: string | null;
  location?: LaunchLocation | null;
  provider?: string | null;
  providerLogo?: string | null;
  program?: string | null;
  timeline?: LaunchTimelineEvent[] | null;
  videoThumbnail?: string | null;
  source: LaunchSource;
  ll2Id?: string | null;
  orbit?: string | null;
  rocketFamily?: string | null;
  rocketVariant?: string | null;
}

export type LaunchProviderName = LaunchSource;
export type LaunchProviderState = 'ok' | 'stale' | 'error' | 'not-requested';

export interface LaunchProviderMeta {
  state: LaunchProviderState;
  cached: boolean;
  updatedAt: string | null;
  error?: string;
}

export interface LaunchFeedMeta {
  generatedAt: string;
  partial: boolean;
  stale: boolean;
  cached: boolean;
  providers: Record<LaunchProviderName, LaunchProviderMeta>;
}

export interface LaunchFeedResult<T> {
  data: T;
  meta: LaunchFeedMeta;
}

export interface LaunchStreamCandidate {
  id: string;
  title: string;
  url: string;
  channelTitle: string;
  channelUrl?: string | null;
  source: 'provided' | 'youtube-api' | 'provider-channel' | 'search';
  confidence: 'high' | 'medium' | 'low';
  liveStatus: 'live' | 'upcoming' | 'ended' | 'unknown';
  thumbnail?: string | null;
  scheduledStartTime?: string | null;
  actualStartTime?: string | null;
  actualEndTime?: string | null;
  concurrentViewers?: number | null;
  note?: string | null;
  score?: number | null;
}

export interface LaunchNewsItem {
  id: string;
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  summary?: string | null;
}

export interface LaunchSocialItem {
  id: string;
  platform: 'reddit' | 'x';
  title: string;
  url: string;
  publishedAt?: string | null;
  author?: string | null;
  community?: string | null;
  note?: string | null;
}

export interface LaunchIntel {
  summary: {
    streamState: 'live' | 'upcoming' | 'standby' | 'search' | 'none';
    recommendedLabel: string;
    recommendedUrl: string | null;
    rationale: string;
    lastUpdated: string;
  };
  streamCandidates: LaunchStreamCandidate[];
  newsItems: LaunchNewsItem[];
  socialItems: LaunchSocialItem[];
  quickLinks: {
    youtubeSearch: string;
    providerChannel: string | null;
    redditSearch: string;
    xSearch: string;
  };
}

// Rocket Facts Type
export interface RocketFact {
  id: string;
  type: 'stat' | 'mission' | 'apod' | 'trivia';
  title: string;
  value: string;
  source: 'spacex' | 'nasa' | 'll2';
}
