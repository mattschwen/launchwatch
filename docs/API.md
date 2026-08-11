# API Documentation

LaunchWatch exposes a small same-origin API for normalized launch data and mission intelligence. Browser code must use these routes instead of calling SpaceX, Launch Library 2, YouTube, or social providers directly.

## Base and Format

- Local base URL: `http://localhost:3000`
- Production base URL: the active LaunchWatch origin
- Format: JSON
- Authentication: none for internal read routes
- Credentials: optional, server-side provider credentials only
- Query contracts are exact: duplicate keys, unsupported keys, query parameters
  on launch-detail paths, and `limit` outside the history feed return `400`
  before provider work begins. This keeps public CDN variants bounded to the
  documented URLs.

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

Returns normalized, deduplicated upcoming launches from Launch Library 2's
multi-provider schedule, optionally merged with an explicitly configured
compatible r/SpaceX mirror, for the current three-month window. A non-terminal launch with
a valid provider window remains scheduled until that window ends, even after
its nominal target instant passes.

```json
{
  "launches": [],
  "cached": true,
  "source": "server-cache",
  "meta": {}
}
```

CDN policy: 5 minutes fresh, 10 minutes stale-while-revalidate.

Launch Library 2 records may include `launchProbability` (an integer from 0 to
100), `weatherConcerns`, and `holdReason`. These are provider-reported
readiness facts, not LaunchWatch predictions. Missing, placeholder, or malformed
values normalize to `null`; clients must not infer them from launch status.

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

Returns completed launches across connected providers in reverse chronological
order. In-flight provider records are excluded even after their reported T-0
has passed, and non-terminal records remain excluded while a valid provider
launch window is still open. Launch Library 2's `Deployed` status is normalized
to `success` because the provider defines it as confirmed payload deployment.

- `limit` is optional and defaults to `50`.
- Valid values are integers from `1` through `100`.
- Launches use canonical provider-qualified IDs such as `spacex-*` and `ll2-*`.
- Provider metadata reports Launch Library 2 and any configured SpaceX mirror
  independently; an unconfigured mirror is `not-requested`.

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
| Duplicate or unsupported query parameters | `400` | Error describing the accepted canonical query |
| `limit` used outside `type=history` | `400` | `{ "error": "The limit parameter is only available for history" }` |
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
| Any query parameter | `400` |
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

A generic search URL is reported with `streamState: "search"` and a search
label. It remains available as a fallback candidate, but is not presented or
counted by the interface as an identified stream lead.

Public rationale and candidate-note text describes the available user action
without disclosing deployment configuration, credential availability, or
internal verification budgets. Operational detail remains server-side.

Coverage and community candidates are keyed by the resolved structured mission
name. A candidate must match a distinctive mission phrase, identifier, or
multiple mission terms; sharing only a provider or launch vehicle is not enough.
When no candidate clears that boundary, the arrays remain empty rather than
showing another flight's coverage.

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

Every external destination in a successful intelligence response must be a
credential-free HTTPS URL. The browser validates the complete response before
rendering any recommendation, stream, news, social, or quick-link action; an
unsafe or malformed destination moves the panel to its retryable degraded state
instead of exposing a partial set of links.

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
| `name`, `date`, `dateUnix` | Mission identity and provider target timestamp |
| `datePrecision` | Optional provider precision (`name`, `abbrev`, and description) used to distinguish exact T-0 values from day/month/quarter/year estimates |
| `rocket`, `launchSite`, `location` | Vehicle and pad data |
| `firstStage` | Optional LL2 detail telemetry for provider-confirmed booster identity, flight number, reuse, and landing attempt/outcome/location |
| `status`, `statusName` | Normalized status plus the provider's human-readable mission state |
| `isLive`, `webcastLive` | Active coverage selection signal plus the provider's explicit webcast flag; an in-flight UI claim still requires an in-flight `statusName` |
| `livestream`, `livestreams` | Safe provider video candidates whose declared schedule can overlap the launch window |
| `description`, `missionType`, `orbit`, `program` | Mission context |
| `image`, `missionPatch`, `videoThumbnail` | Optional media |
| `rocketImageUrl`, `launchImageUrl`, `padMapImage`, `providerLogo` | Backward-compatible optional media URLs |
| `vehicleVisual`, `missionVisual` | Optional structured visuals with provider provenance |
| `timeline` | Optional provider timeline events |

Fields absent from an upstream provider are represented as `null`, omitted optional fields, or a documented fallback string.

Structured visuals identify their `kind` (`vehicle` or `mission`), `url`, provider
`sourceLabel`, and optional `sourceUrl`. When a provider supplies them, LaunchWatch
also preserves the visual name, thumbnail, credit, license name/link, and single-use
flag. Missing attribution or licensing fields remain absent; LaunchWatch does not
infer a license from an image host or provider.

The display boundary requires the upstream record to state `singleUse: false`
alongside a supported reusable license and meaningful creator credit. This keeps
absent clearance, placeholder attribution, unknown rights, and one-time media
out of both rendered figures and social metadata.

## External Providers

| Provider | Use | Authentication |
| --- | --- | --- |
| Compatible r/SpaceX API mirror | Optional upcoming/history/detail and rocket data | Controlled `SPACEX_API_BASE_URL` |
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
