# API Documentation

LaunchWatch exposes a small same-origin API for normalized launch data and mission intelligence. Browser code must use these routes instead of calling SpaceX, Launch Library 2, YouTube, or social providers directly.

## Base and Format

- Local base URL: `http://localhost:3000`
- Production base URL: the active LaunchWatch origin
- Format: JSON
- Authentication: none for internal read routes
- Credentials: optional, server-side provider credentials only

## Canonical Launch IDs

Every launch ID combines its provider and native identifier:

```text
spacex-<provider-id>
ll2-<provider-id>
```

Examples:

```text
spacex-5eb87d46ffd86e000604b388
ll2-0d2f8c4a-3b6a-4f9c-a632-example
```

Use the canonical ID in:

- `/launch/[id]`
- `/watch?id=[id]`
- `/api/launches/[id]`
- `/api/launch-intel?id=[id]`

IDs are validated, capped at 140 characters, and limited to supported source prefixes and provider-safe characters. The historical `past-<SpaceX-id>` format is accepted by the detail resolver for compatibility and maps to `spacex-<SpaceX-id>`; it is not a format for new links or stored data.

## Feed Metadata

Successful launch responses include provider status:

```json
{
  "generatedAt": "2026-07-27T01:10:00.000Z",
  "partial": false,
  "stale": false,
  "cached": true,
  "providers": {
    "spacex": {
      "state": "ok",
      "cached": true,
      "updatedAt": "2026-07-27T01:09:30.000Z"
    },
    "ll2": {
      "state": "ok",
      "cached": true,
      "updatedAt": "2026-07-27T01:02:00.000Z"
    }
  }
}
```

Provider `state` is one of:

- `ok`: provider returned usable data;
- `stale`: the provider failed, but a last-known response is available;
- `error`: provider failed and there is no usable fallback;
- `not-requested`: that provider is outside the endpoint’s scope.

`partial` is true when any requested provider is stale or unavailable.

## Launch Feed

### `GET /api/launches?type=all`

Returns merged, normalized, deduplicated upcoming launches from SpaceX and Launch Library 2 for the current three-month window.

```json
{
  "launches": [],
  "cached": true,
  "source": "server-cache",
  "meta": {}
}
```

CDN policy: 5 minutes fresh, 10 minutes stale-while-revalidate.

### `GET /api/launches?type=live`

Returns upcoming-feed launches marked live by provider state or the supported webcast/window heuristic.

```json
{
  "launches": [],
  "cached": false,
  "source": "api",
  "meta": {}
}
```

CDN policy: 1 minute fresh, 2 minutes stale-while-revalidate.

### `GET /api/launches?type=next`

Returns the first live or upcoming launch, or `null` when the usable provider response has no scheduled mission.

```json
{
  "launch": null,
  "cached": false,
  "source": "api",
  "meta": {}
}
```

CDN policy: 2 minutes fresh, 4 minutes stale-while-revalidate.

### `GET /api/launches?type=history&limit=50`

Returns completed SpaceX launches in reverse chronological order.

- `limit` is optional and defaults to `50`.
- Valid values are integers from `1` through `100`.
- Launches use canonical `spacex-*` IDs.
- Launch Library 2 appears as `not-requested` in provider metadata.

```json
{
  "launches": [],
  "cached": true,
  "source": "server-cache",
  "meta": {}
}
```

CDN policy: 60 minutes fresh, 120 minutes stale-while-revalidate.

### Feed errors

| Condition | Status | Body |
| --- | --- | --- |
| Unknown `type` | `400` | `{ "error": "Invalid type parameter..." }` |
| Invalid history limit | `400` | `{ "error": "Invalid limit parameter..." }` |
| No requested provider has usable data | `502` | Error plus empty data and provider metadata |
| Unexpected route failure | `500` | `{ "error": "Failed to fetch launches" }` |

## Launch Detail

### `GET /api/launches/[id]`

Looks up one provider record directly, so it supports upcoming launches, completed SpaceX launches, and LL2 launches outside the current feed window.

Example:

```http
GET /api/launches/spacex-5eb87d46ffd86e000604b388
```

Successful response:

```json
{
  "launch": {
    "id": "spacex-5eb87d46ffd86e000604b388",
    "sourceId": "5eb87d46ffd86e000604b388",
    "source": "spacex"
  },
  "canonicalId": "spacex-5eb87d46ffd86e000604b388",
  "legacyId": false,
  "cached": true,
  "source": "server-cache",
  "meta": {}
}
```

Responses to accepted legacy `past-*` IDs include `legacyId: true` and a `Content-Location` header pointing to the canonical API URL.

| Condition | Status |
| --- | --- |
| Invalid or unsupported ID | `400` |
| Valid ID with no provider record | `404` |
| Provider unavailable without cached data | `502` |
| Unexpected route failure | `500` |

CDN policy: 5 minutes fresh, 15 minutes stale-while-revalidate.

## Launch Intelligence

### `GET /api/launch-intel?id=[canonical-id]`

The route accepts only a launch identifier as input. It resolves the authoritative normalized launch on the server before using provider links, title, mission description, and timing to build:

- ranked official and YouTube stream candidates;
- a recommended watch state and URL;
- relevant Spaceflight News coverage;
- recent Reddit and X items when available;
- provider, YouTube, Reddit, and X quick links.

Example:

```http
GET /api/launch-intel?id=ll2-0d2f8c4a-3b6a-4f9c-a632-example
```

Do not serialize names, descriptions, URLs, dates, or entire launch objects into this request. Those mutable fields are not trusted as client input.

The response includes:

```json
{
  "summary": {
    "streamState": "upcoming",
    "recommendedLabel": "Official provider stream",
    "recommendedUrl": "https://www.youtube.com/watch?v=example",
    "rationale": "Provider-supplied launch coverage",
    "lastUpdated": "2026-07-27T01:10:00.000Z"
  },
  "streamCandidates": [],
  "newsItems": [],
  "socialItems": [],
  "quickLinks": {}
}
```

The route adds:

- `X-LaunchWatch-Canonical-Id`
- `X-LaunchWatch-Data-State: fresh|stale`

| Condition | Status |
| --- | --- |
| Missing or invalid ID | `400` |
| Valid ID with no provider record | `404` |
| Launch provider unavailable without cached data | `502` |
| Aggregation failure | `500` |

CDN policy: 2 minutes fresh, 10 minutes stale-while-revalidate. Individual intel sources have their own bounded fresh and stale windows.

## Normalized Launch Shape

The UI consumes the shared `Launch` interface in [`lib/types.ts`](../lib/types.ts). Important fields include:

| Field | Meaning |
| --- | --- |
| `id` | Canonical provider-qualified ID |
| `sourceId` | Provider-native identifier |
| `source` | `spacex` or `ll2` |
| `name`, `date`, `dateUnix` | Mission identity and timing |
| `rocket`, `launchSite`, `location` | Vehicle and pad data |
| `status`, `statusName`, `isLive` | Normalized mission state |
| `livestream`, `livestreams` | Verified provider video candidates |
| `description`, `missionType`, `orbit`, `program` | Mission context |
| `image`, `missionPatch`, `videoThumbnail` | Optional media |
| `timeline` | Optional provider timeline events |

Fields absent from an upstream provider are represented as `null`, omitted optional fields, or a documented fallback string.

## External Providers

| Provider | Use | Authentication |
| --- | --- | --- |
| SpaceX API v4 | Upcoming/history/detail and rocket data | None |
| Launch Library 2 | Cross-provider schedule, pads, status, streams, detail | Optional `LL2_API_KEY` |
| NASA APOD | Optional astronomy fact content | Optional `NASA_API_KEY`, otherwise `DEMO_KEY` |
| YouTube Data API | Stream discovery and ranking | Optional `YOUTUBE_DATA_API_KEY` |
| Spaceflight News API | Relevant coverage | None |
| Reddit search | Community links | None |
| X recent search | Recent public posts | `X_BEARER_TOKEN` or complete OAuth 1.0a set |

All keys are server-only. Legacy `NEXT_PUBLIC_*` key names are unsupported and must be migrated.

## Client Fetching

- `LaunchDataProvider` fetches `type=all` once for Home, Watch, navigation status, and shared selectors.
- `useLiveLaunches` and `useNextLaunch` derive their values from that shared feed.
- `useLaunchById` checks shared data first and calls `/api/launches/[id]` only when needed.
- History fetches `type=history&limit=100`.
- `useLaunchIntel` calls `/api/launch-intel?id=...`.

Every client request checks `response.ok`, handles aborted requests, and presents an explicit retry or unavailable state where appropriate.
