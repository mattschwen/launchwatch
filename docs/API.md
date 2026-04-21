# API Documentation

LaunchWatch pulls data from external launch/media APIs and exposes internal API routes for normalized launch data and launch intelligence.

## External APIs

### SpaceX API v4

- Base URL: `https://api.spacexdata.com/v4`
- Auth: none
- Used for: upcoming launches, past launches, rocket metadata

LaunchWatch uses the SpaceX query endpoint so rocket and launchpad references can be populated in one request.

### Launch Library 2

- Free URL: `https://ll.thespacedevs.com/2.2.0`
- Premium URL: `https://lldev.thespacedevs.com/2.2.0`
- Auth: optional `Token` header
- Used for: non-SpaceX upcoming launches, launch status, launch pad coordinates, and webcast hints

LaunchWatch keeps a longer cache window on Launch Library 2 responses to stay under free-tier limits.

### NASA APOD

- Base URL: `https://api.nasa.gov`
- Auth: optional key, otherwise `DEMO_KEY`
- Used for: rotating fact content in the header

### YouTube Data API

- Base URL: `https://www.googleapis.com/youtube/v3`
- Auth: optional `YOUTUBE_DATA_API_KEY`
- Used for: ranking candidate livestreams when provider-supplied links are missing or ambiguous

### Spaceflight News API

- Base URL: `https://api.spaceflightnewsapi.net/v4`
- Auth: none
- Used for: recent launch-related coverage in the launch-intel layer

### Reddit Search API

- Base URL: `https://www.reddit.com/search.json`
- Auth: none
- Used for: recent mission-related community chatter in the launch-intel layer

### X Recent Search

- Base URL: `https://api.x.com/2`
- Auth: optional `X_BEARER_TOKEN`, or OAuth 1.0a user-context credentials via `X_ACCESS_TOKEN`, `X_ACCESS_TOKEN_SECRET`, `X_CONSUMER_KEY`, and `X_CONSUMER_KEY_SECRET`
- Used for: recent mission-related X posts in the launch-intel layer

## Internal API Routes

### `GET /api/launches?type=all`

Returns normalized upcoming launches.

Response shape:

```json
{
  "launches": [],
  "cached": true,
  "source": "server-cache"
}
```

### `GET /api/launches?type=live`

Returns launches inside the live-launch window.

### `GET /api/launches?type=next`

Returns the next upcoming launch.

Response shape:

```json
{
  "launch": null,
  "cached": false,
  "source": "api"
}
```

### `GET /api/launch-intel`

Returns launch-specific intelligence for a serialized launch payload. The route aggregates:

- ranked YouTube/provider stream candidates
- recent coverage from Spaceflight News API
- recent Reddit items
- recent X items when either `X_BEARER_TOKEN` or the X OAuth credential set is configured
- quick links for YouTube, provider channels, Reddit, and X search

## Normalized Launch Shape

The app UI works from the shared `Launch` type in [lib/types.ts](/Users/matthewschwen/projects/launchwatch/lib/types.ts).

Fields include:

- `id`
- `name`
- `date`
- `dateUnix`
- `rocket`
- `launchSite`
- `status`
- `livestream`
- `description`
- `isLive`
- `image`
- `missionPatch`
- `location`
- `provider`
- `program`
- `timeline`
- `livestreams`
- `rocketFamily`
- `rocketVariant`

## Current Cache Durations

| Payload | Duration |
| --- | --- |
| `all` | 30 minutes |
| `live` | 2 minutes |
| `next` | 5 minutes |
| `launch-intel` aggregate | 2 minutes fresh, 10 minutes stale fallback |
| `launch-intel` stream candidates | 2 minutes fresh, 10 minutes stale fallback |
| `launch-intel` news items | 10 minutes fresh, 60 minutes stale fallback |
| `launch-intel` Reddit/X items | 5 minutes fresh, 30 minutes stale fallback |
| Launch Library 2 raw fetches | 30 minutes |
| NASA APOD | 24 hours |
| SpaceX rockets | 24 hours |

## Client Fetching

The app currently fetches:

- upcoming launches through `/api/launches?type=all`
- live launches through `/api/launches?type=live`
- next launch through `/api/launches?type=next`
- launch intelligence through `/api/launch-intel`
- past SpaceX launches directly through `lib/api.ts`
- rocket facts directly through `lib/api.ts`

## Notes

- There is no authentication layer
- There is no database-backed API
- The service worker is not a data API source of truth
- Launch-intel caches and dedupes in-flight source fetches server-side to reduce repeated upstream work
- If you change response shape or cache timing, update this file and [docs/ARCHITECTURE.md](/Users/matthewschwen/projects/launchwatch/docs/ARCHITECTURE.md)
