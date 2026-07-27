<div align="center">
  <img src="public/brand/logo_launchwatch_horizontal_20260726_dark.svg" alt="LaunchWatch" width="384" height="88">

  # LaunchWatch

  Mission control for upcoming launches, live coverage, mission briefings, launch-site telemetry, and completed-flight history.

  [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
  [![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
</div>

## Overview

LaunchWatch is a responsive Next.js application for following a mission from schedule to replay. It combines SpaceX and Launch Library 2 data behind internal server routes, normalizes provider records into one launch model, and gives every launch a stable provider-qualified ID.

The interface keeps its green-and-black mission-control identity while prioritizing clear navigation, readable data, and useful degraded states. Home, Watch, History, and mission details share one client launch feed, so a launch selected in one surface remains consistent everywhere else.

## Product Surfaces

- **Home** highlights the live or next launch, exposes the primary watch and briefing actions, lists upcoming missions in compact rows, and defers the mission map on smaller screens.
- **Watch** selects a live mission when one exists and otherwise presents the next scheduled mission, its provider fallback, queue, countdown, and intelligence.
- **History** loads completed SpaceX missions through the internal server API and supports search, provider, year, outcome, expandable summaries, replay links, and mission details.
- **Mission detail** resolves both upcoming and historical launches by canonical ID and combines status, timeline, actions, video, and ID-scoped intelligence.

The desktop and mobile navigation both expose Home, Watch, and History. The first-visit synchronization message is a short, dismissible status toast; it never blocks the application.

## Core Features

- Upcoming, live, next, and historical launch feeds
- Canonical IDs for SpaceX and Launch Library 2 records
- Provider-aware detail lookup for current and completed missions
- Ranked official/provider stream discovery
- Useful Watch fallback when no verified stream is live
- Searchable and filterable launch schedule and archive
- Mission briefings, coverage, community links, and replay surfaces
- Calendar export and local browser launch reminders
- Responsive launch-site map with a collapsed mobile presentation
- Partial, stale, offline, empty, error, and retry states
- Installable PWA shell with network-first navigations and uncached data APIs

## Tech Stack

- Next.js 16 App Router
- React 19
- TypeScript 5 in strict mode
- Tailwind CSS 4 and design tokens in [`app/globals.css`](app/globals.css)
- Vercel deployment target

## Quick Start

Prerequisites: Node.js 22+ and npm.

```bash
git clone https://github.com/mattschwen/launchwatch.git
cd launchwatch
npm ci
npm run dev
```

Open `http://localhost:3000`.

## Environment Variables

The app runs without keys using public provider endpoints. Optional credentials belong in `.env.local` and are server-only:

```env
LL2_API_KEY=your_launch_library_2_key
NASA_API_KEY=your_nasa_key
YOUTUBE_DATA_API_KEY=your_youtube_data_api_key
# Optional per-runtime safety budget for quota-expensive YouTube lookups.
YOUTUBE_DAILY_LOOKUP_BUDGET=25

# Use either the bearer token or the complete OAuth 1.0a set.
X_BEARER_TOKEN=your_x_api_bearer_token
X_ACCESS_TOKEN=your_x_access_token
X_ACCESS_TOKEN_SECRET=your_x_access_token_secret
X_CONSUMER_KEY=your_x_consumer_key
X_CONSUMER_KEY_SECRET=your_x_consumer_key_secret
```

Do not prefix secrets with `NEXT_PUBLIC_`; that makes them eligible for client bundles. Migrate legacy `NEXT_PUBLIC_LL2_API_KEY`, `NEXT_PUBLIC_NASA_API_KEY`, and `NEXT_PUBLIC_YOUTUBE_API_KEY` values to `LL2_API_KEY`, `NASA_API_KEY`, and `YOUTUBE_DATA_API_KEY`.

For deterministic browser tests or a controlled provider mirror,
`SPACEX_API_BASE_URL` and `LL2_API_BASE_URL` can override the server-only
upstream origins. Normal deployments should keep the production defaults.

## Canonical Launch IDs

Every normalized launch uses a provider-qualified ID:

```text
spacex-<provider-id>
ll2-<provider-id>
```

Use the canonical value for `/launch/[id]`, `/watch?id=...`, `/api/launches/[id]`, and `/api/launch-intel?id=...`. Historical `past-<SpaceX-id>` links are accepted only as a compatibility format and resolve to `spacex-<SpaceX-id>`; new code must not create them.

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Live/next mission, upcoming schedule, filters, and mission map |
| `/watch` | Live stream or next-mission fallback with queue and intelligence |
| `/launch/[id]` | Current or historical mission detail by canonical ID |
| `/history` | Searchable completed-launch archive |
| `/api/launches?type=all` | Merged upcoming launch feed |
| `/api/launches?type=live` | Launches currently in the live window |
| `/api/launches?type=next` | Next upcoming launch |
| `/api/launches?type=history&limit=50` | Completed SpaceX launches; limit `1–100` |
| `/api/launches/[id]` | One current or historical launch |
| `/api/launch-intel?id=[id]` | Stream, coverage, and community intelligence for one launch |

See [`docs/API.md`](docs/API.md) for response shapes and error behavior.

## Data and Cache Policy

- Provider calls happen on the server; browser components do not contact SpaceX or Launch Library 2 directly.
- Home, Watch, the header, and launch selectors share one deduplicated client request to `type=all`, refreshed every two minutes and when a stale visible tab reconnects.
- Server responses include provider metadata so the UI can distinguish fresh, cached, partial, and stale results.
- The service worker never caches `/api/*`, Next.js flight responses, navigations, or arbitrary query-string requests.
- Only the offline document, explicit shell icons, and content-hashed Next.js static assets are cached. Production clients check for a newer worker and apply updates explicitly.

## Validation

Run the complete local gate before opening a pull request:

```bash
npm run check
```

Run the browser and accessibility suites when a change affects routing, data states, responsive behavior, or interaction:

```bash
npx playwright install chromium
npm run test:e2e
npm run test:a11y
```

The Playwright install is required once per fresh development environment. `npm run check` runs lint, type-checking, unit tests, and the production build.

## Deployment

Ship through a Vercel preview first:

1. Run the validation commands above.
2. deploy or open a pull request to create a preview;
3. smoke-test Home, Watch, History, a canonical detail route, launch APIs, and service-worker behavior;
4. review responsive screenshots and degraded states;
5. promote the reviewed preview to production.

See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for the full workflow.

## Project Structure

```text
launchwatch/
├── app/                  # Pages and internal server API routes
├── components/           # Mission UI, actions, map, media, and app shell
├── lib/                  # Provider clients, normalization, shared feed, intel, and types
├── public/               # Manifest, icons, service worker, and offline document
├── docs/                 # Architecture, API, deployment, and contributor docs
└── .github/workflows/    # Validation in CI
```

## Documentation

- [`docs/README.md`](docs/README.md)
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- [`docs/API.md`](docs/API.md)
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)
- [`MOBILE_OPTIMIZATION.md`](MOBILE_OPTIMIZATION.md)
- [`CONTRIBUTING.md`](CONTRIBUTING.md)

## License

LaunchWatch is licensed under the MIT License. See [`LICENSE`](LICENSE).
