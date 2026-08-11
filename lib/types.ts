// SpaceX API Types
export interface SpaceXLaunch {
  id: string;
  name: string;
  date_utc: string;
  date_unix: number;
  date_precision?: string | null;
  rocket: string | {
    id: string;
    name: string;
    flickr_images?: string[];
  };
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
  flickr_images?: string[];
  description: string;
}

// Launch Library 2 Types
export interface LL2MediaVariant {
  id?: number;
  type?: {
    id?: number;
    name?: string | null;
  } | null;
  image_url?: string | null;
}

export interface LL2Media {
  id?: number;
  name?: string | null;
  image_url: string;
  thumbnail_url?: string | null;
  credit?: string | null;
  license?: {
    id?: number;
    name?: string | null;
    priority?: number;
    link?: string | null;
  } | null;
  single_use?: boolean | null;
  variants?: LL2MediaVariant[] | null;
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

export interface LL2InfoUrl {
  url: string;
  priority?: number | null;
  source?: string | null;
  title?: string | null;
  type?: LL2NamedReference | null;
}

export interface LL2Launch {
  id: string;
  name: string;
  last_updated?: string | null;
  orbital_launch_attempt_count_year?: number | null;
  agency_launch_attempt_count_year?: number | null;
  pad_launch_attempt_count_year?: number | null;
  net: string; // Network Estimated Time
  net_precision?: LaunchDatePrecision | null;
  window_start?: string | null;
  window_end?: string | null;
  probability?: number | null;
  weather_concerns?: string | null;
  holdreason?: string | null;
  flightclub_url?: string | null;
  info_urls?: LL2InfoUrl[] | null;
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
    launcher_stage?: Array<{
      type?: string | null;
      reused?: boolean | null;
      launcher_flight_number?: number | null;
      launcher?: {
        serial_number?: string | null;
      } | null;
      landing?: {
        attempt?: boolean | null;
        success?: boolean | null;
        landing_location?: {
          name?: string | null;
          abbrev?: string | null;
        } | null;
        type?: {
          name?: string | null;
          abbrev?: string | null;
        } | null;
      } | null;
    }> | null;
  };
  pad: {
    id: number;
    name: string;
    latitude?: number | string | null;
    longitude?: number | string | null;
    location?: {
      name: string;
      country_code?: string | null;
      timezone_name?: string | null;
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
    agencies?: Array<{
      name?: string | null;
      abbrev?: string | null;
      type?: {
        name?: string | null;
      } | null;
    }> | null;
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
  updates?: Array<{
    id?: number;
    comment?: string | null;
    info_url?: string | null;
    created_on?: string | null;
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
  timeZone?: string;
}

export interface LaunchSite {
  id: string;
  name: string;
  active: boolean;
  latitude: number;
  longitude: number;
  locationName: string;
  countryCode: string | null;
  description: string | null;
  locationDescription: string | null;
  infoUrl: string | null;
  wikiUrl: string | null;
  totalLaunchCount: number;
  orbitalLaunchAttemptCount: number;
  agencies: string[];
  image: LaunchVisual | null;
}

export interface LaunchSiteAtlasResponse {
  sites: LaunchSite[];
  meta: {
    generatedAt: string;
    cached: boolean;
    stale: boolean;
    source: 'launch-library-2';
    sourceUrl: string;
  };
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

export interface LaunchFirstStage {
  serialNumber: string | null;
  flightNumber: number | null;
  reused: boolean | null;
  landingAttempt: boolean | null;
  landingSuccess: boolean | null;
  landingLocation: string | null;
  landingLocationAbbrev: string | null;
  landingType: string | null;
  landingTypeAbbrev: string | null;
}

export interface LaunchMissionAgency {
  name: string;
  abbrev: string | null;
  type: string | null;
}

export interface LaunchProviderUpdate {
  id: string;
  comment: string;
  createdAt: string;
  sourceUrl: string | null;
}

export interface LaunchDatePrecision {
  name: string;
  abbrev: string;
  description?: string | null;
}

export type LaunchSource = 'spacex' | 'll2';

export type LaunchVisualKind = 'vehicle' | 'mission';

export interface LaunchVisual {
  kind: LaunchVisualKind;
  url: string;
  thumbnailUrl?: string;
  name?: string;
  credit?: string;
  licenseName?: string;
  licenseUrl?: string;
  singleUse?: boolean;
  sourceLabel: string;
  sourceUrl?: string;
}

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
  datePrecision?: LaunchDatePrecision | null;
  rocket: string;
  launchSite: string;
  status: 'upcoming' | 'live' | 'success' | 'failure' | 'tbd';
  statusName?: string | null;
  providerUpdatedAt?: string | null;
  orbitalLaunchAttemptCountYear?: number | null;
  providerLaunchAttemptCountYear?: number | null;
  padLaunchAttemptCountYear?: number | null;
  missionName?: string | null;
  missionType?: string | null;
  missionAgencies?: LaunchMissionAgency[] | null;
  windowStart?: string | null;
  windowEnd?: string | null;
  launchProbability?: number | null;
  weatherConcerns?: string | null;
  holdReason?: string | null;
  livestream: string | null;
  livestreams?: LaunchStream[] | null;
  description: string | null;
  isLive: boolean;
  webcastLive?: boolean;
  image?: string | null;
  missionPatch?: string | null;
  rocketImageUrl?: string | null;
  launchImageUrl?: string | null;
  vehicleVisual?: LaunchVisual | null;
  missionVisual?: LaunchVisual | null;
  padMapImage?: string | null;
  location?: LaunchLocation | null;
  provider?: string | null;
  providerLogo?: string | null;
  program?: string | null;
  timeline?: LaunchTimelineEvent[] | null;
  providerUpdates?: LaunchProviderUpdate[] | null;
  officialMissionUrl?: string | null;
  trajectorySimulationUrl?: string | null;
  videoThumbnail?: string | null;
  source: LaunchSource;
  ll2Id?: string | null;
  orbit?: string | null;
  rocketFamily?: string | null;
  rocketVariant?: string | null;
  firstStage?: LaunchFirstStage | null;
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
