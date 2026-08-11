<div align="center">
  <img src="public/brand/logo_launchwatch_horizontal_20260726_dark.svg" alt="LaunchWatch" width="384" height="88">

  # LaunchWatch

  Mission control for upcoming launches, live coverage, mission briefings, launch-site telemetry, and completed-flight history.

  [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
  [![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
</div>

## Overview

LaunchWatch is a responsive Next.js application for following a mission from schedule to replay. It uses Launch Library 2's multi-provider schedule behind internal server routes, can merge a compatible r/SpaceX API mirror when one is explicitly configured, normalizes provider records into one launch model, and gives every launch a stable provider-qualified ID.

The interface evolves its green-and-black mission-control identity into a
cyberpunk signal system while prioritizing clear navigation, readable data,
and useful degraded states. Green means nominal, magenta marks live coverage,
red is reserved for critical states, cyan identifies trajectory and cold data,
and amber communicates caution or incomplete signals. Home, Watch, History,
and mission details share one client launch feed, so a launch selected in one
surface remains consistent everywhere else.

## Product Surfaces

- **Home** highlights a mission with active coverage or the next launch with a licensed vehicle reference when one is available, exposes the primary watch and briefing actions, identifies the bounded provider feed window before filtering, lists upcoming missions in compact rows, and defers the mission map on smaller screens.
- **Watch** selects a mission with active coverage when one exists and otherwise presents the next scheduled mission, its provider fallback, licensed imagery when coverage cannot play in-app, countdown, selected-mission trajectory, and truthful coverage signal. Its bounded mission queue keeps the active item visibly marked as the mission on console, names every provider state alongside its signal color, and hands larger feeds directly to the batched Home schedule. The browser tab leads with confirmed `COVERAGE LIVE` or `IN FLIGHT` state while a stale live signal is explicitly marked `LAST KNOWN`.
- **History** loads completed missions across connected providers through the internal server API and supports search, provider, year, confirmed or unconfirmed outcome, expandable visual summaries, replay links, and mission details. Replay verification failures stay visibly amber and retryable instead of disappearing behind an unlabeled action; a completed check with no verified replay offers an explicitly labeled mission-specific search rather than a dead end. Past-window records without a terminal provider result stay visibly amber instead of implying success. In-flight records stay on Home and Watch until provider coverage is no longer live.
- **Mission detail** resolves both upcoming and historical launches by canonical ID and combines a licensed vehicle or mission visual, status, trajectory telemetry, timeline, actions, video, and ID-scoped intelligence. A sticky mission index moves keyboard and touch users directly among the available sections, tracks reading progress, and keeps the active destination visible; when that index overflows a narrow screen, it reports the visible range and exposes previous/next controls alongside swipe and arrow-key navigation. The map implementation loads only as its stable telemetry panel approaches the viewport.

The desktop and mobile navigation both expose Home, Watch, and History through
a shared command-deck shell: the brand mark, active operational surface,
provider uplink, UTC clock, route index, and live state remain legible without
competing with mission content. The first-visit synchronization message is a
short, dismissible status toast; it never blocks the application.

## Core Features

- Upcoming, live, next, and historical launch feeds
- Canonical IDs for SpaceX and Launch Library 2 records
- Provider-aware detail lookup for current and completed missions
- Ranked official/provider stream discovery
- Useful Watch fallback when no verified stream is live
- Searchable and filterable launch schedule and archive with mission-specific
  accessible names on repeated archive actions
- A route-aware `/` shortcut opens and focuses mission search on the schedule
  and archive without intercepting editable controls; shared search tolerates
  provider punctuation, accents, and joined vehicle designations
- Mission briefings, coverage, community links, and replay surfaces
- Provider-derived mission clocks translate precise timeline offsets into UTC
  and local milestone times; coarse targets keep those clocks visibly pending.
- Precise mission timelines distinguish elapsed, next, and upcoming provider
  milestones, with a keyboard-accessible jump to the next operation; when every
  timed event has passed, LaunchWatch says only that the sequence elapsed and
  leaves mission outcome to the provider.
- Once a validated launch window opens, shared mission countdowns retain urgency
  with a minute-level time-to-close readout instead of collapsing to a static
  open-window label; confirmed in-flight state and provider alerts keep priority.
- External coverage handoffs name the destination before leaving LaunchWatch,
  fill the non-embeddable player with an eligible licensed vehicle or mission
  visual when available, and retain consistent screen-reader cues when
  coverage, sources, or calendar actions open in a new tab
- Provider-sourced vehicle and mission imagery with visible creator and license
  attribution, a full-resolution action, and truthful unavailable states
- Canonical LL2 mission details retain provider-confirmed first-stage identity,
  flight history, reuse, and recovery plans across Watch, briefing, and detail
  telemetry instead of reducing the vehicle to its configuration name
- Calendar export and opt-in browser launch alerts while LaunchWatch is open,
  once the provider confirms a minute-level launch target; provider retargets
  re-arm the alert thresholds for the new confirmed time, and exported or
  copied mission details retain the canonical LaunchWatch route. Browsers that
  block clipboard writes expose the same mission brief as selectable text
- Compact local-time context beside exact primary mission targets and upcoming
  schedule rows, plus the complete local start and end of validated launch
  windows, while UTC remains authoritative; UTC users and coarse provider
  estimates keep the existing single-time presentation
- Responsive selected-mission trajectory map on Watch and every detail route,
  with a collapsed Home mobile presentation and a coordinate-validated
  OpenStreetMap handoff for provider-reported launch sites. Optional trajectory
  chunk failures stay contained to a retryable telemetry panel so schedule,
  coverage, and briefing controls remain usable
- The launch-site field guide keeps its open map available when nearby pad data
  fails, offers an in-place retry with offline and busy states, and returns
  keyboard focus to the recovered facility instead of requiring a page reload
- Discrete stream, news, and community coverage signals based on available
  records rather than synthetic strength percentages; external news actions
  are limited to credential-free HTTPS destinations
- Live provider coverage remains distinct from vehicle flight state: a
  prelaunch broadcast keeps the mission countdown visible until the provider
  explicitly reports the mission in flight
- Provider alert states such as holds, scrubs, and cancellations remain named
  in the featured mission and compact schedule instead of collapsing to a
  generic TBD label; their target timing stays visible with the critical signal
- Canonical mission details reconcile server-rendered timing and live state
  with the shared browser feed, so provider retargets update the countdown,
  launch window, calendar/share payload, trajectory, and timeline clocks. An
  unconfirmed live snapshot becomes an amber, retryable state and keeps
  official coverage available without autoplay
- Reduced-motion-safe trajectory drawing, hardware LEDs, holographic surfaces,
  grid texture, and scanlines
- Windows high-contrast affordances that preserve the current route and
  selected mission, map site, phase, and view controls without relying on color
- Increased-contrast theming that strengthens muted telemetry, panel
  boundaries, and persistent selected surfaces while retaining signal colors
- 200% text-size reflow down to the 320px boundary for dense mission telemetry,
  countdown, command, signal, archive, and internal scroll-rail instruments
  without clipping or horizontal page drift
- Partial, stale, offline, empty, error, and retry states
- Installable PWA shell with network-first navigations, uncached data APIs, and
  a dedicated maskable app icon for adaptive launchers; eligible browsers
  expose a footer install action only while their native installer is available
- Device-safe installed-PWA chrome that keeps navigation, status, update, and
  offline controls clear of display cutouts in portrait and landscape
- Branded large-image previews for shared routes, the launch archive, and
  canonical mission details; filtered schedule and archive URLs consolidate on
  the stable `/` and `/history` canonical routes

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

# Optional cost-bounded fallback for recent official @SpaceX updates.
XAI_API_KEY=your_xai_api_key
XAI_MODEL=grok-4.3
XAI_DAILY_LOOKUP_BUDGET=4

# Use either the bearer token or the complete OAuth 1.0a set.
X_BEARER_TOKEN=your_x_api_bearer_token
X_ACCESS_TOKEN=your_x_access_token
X_ACCESS_TOKEN_SECRET=your_x_access_token_secret
X_CONSUMER_KEY=your_x_consumer_key
X_CONSUMER_KEY_SECRET=your_x_consumer_key_secret
```

Do not prefix secrets with `NEXT_PUBLIC_`; that makes them eligible for client bundles. Migrate legacy `NEXT_PUBLIC_LL2_API_KEY`, `NEXT_PUBLIC_NASA_API_KEY`, and `NEXT_PUBLIC_YOUTUBE_API_KEY` values to `LL2_API_KEY`, `NASA_API_KEY`, and `YOUTUBE_DATA_API_KEY`.

Launch facts always come from provider feeds. xAI is used only as
a fallback for recent official `@SpaceX` posts when no direct official X signal
was found, a SpaceX mission is within 72 hours of launch or 12 hours after it,
and the per-runtime daily lookup budget remains. Results are cached for six
hours, limited to one two-turn search and three validated status links, and
fail closed without affecting the launch feed. The interface labels these as
LaunchWatch AI-assisted summaries, identifies the official SpaceX source, and
links to the exact post for verification.

Current schedules come from Launch Library 2. Because the public r/SpaceX API
is archived, direct SpaceX ingestion is disabled unless
`SPACEX_API_BASE_URL` points to a compatible controlled mirror.
`LL2_API_BASE_URL` remains a server-only integration override for deterministic
tests or a controlled LL2 mirror; normal deployments leave both values unset.

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
| `/api/launches?type=history&limit=50` | Completed launches across connected providers; limit `1–100` |
| `/api/launches/[id]` | One current or historical launch |
| `/api/launch-intel?id=[id]` | Stream, coverage, and community intelligence for one launch |

See [`docs/API.md`](docs/API.md) for response shapes and error behavior.

## Data and Cache Policy

- Provider calls happen on the server; browser components do not contact SpaceX or Launch Library 2 directly.
- Home, Watch, the header, and launch selectors share one deduplicated client request to `type=all`, refreshed every two minutes and when a stale visible tab reconnects.
- Browser connection changes update feed health immediately: an offline shell
  retains the last schedule, suppresses live claims, and pauses impossible
  refresh actions until the connection returns.
- If the featured feed record lacks a reusable visual, Home requests that one
  canonical launch detail record to acquire richer vehicle-image provenance;
  the server caches the result under the existing detail policy. Detail
  enrichment cannot replace the current feed's target, launch window, status,
  or live flags.
- Server responses include provider metadata so the UI can distinguish fresh, cached, partial, and stale results.
- A failed provider resource enters a bounded 30-second recovery window before
  LaunchWatch attempts that same upstream request again. Other providers remain
  independent, and degraded or stale metadata stays visible throughout.
- Every browser-facing launch collection, including the independent History
  archive, must pass the shared launch contract and unique canonical-ID guard
  before it can replace settled records or create mission links. Primary and
  ranked coverage actions must also be credential-free HTTPS destinations;
  malformed successful responses fail closed through the existing retry state.
- Provider date precision and valid launch windows are normalized with each
  mission. Primary mission summaries retain a supplied window instead of
  reducing it to one target instant. Coarse day, month, quarter, and year
  targets render as estimates instead of exact countdowns; calendar export and
  alerts remain pending until T-0 is precise enough. After T-0, the interface
  calls a window open only while validated provider bounds remain active;
  otherwise it waits visibly for the next provider update.
- Compact schedule rows preserve the provider's distinction between a launch
  time that is to be confirmed (TBC) and one that is to be determined (TBD);
  the shared pending-timing filter includes both states.
- Compact launch-site labels retain the provider's facility context when a pad
  name alone is ambiguous, including schedule, Watch, History, detail,
  calendar, clipboard, and browser-alert surfaces.
- Primary mission headings use a provider's structured mission name when it
  safely removes an identical `Vehicle |` prefix. Canonical provider titles
  remain unchanged in feeds, compact lists, search, sharing, and route metadata.
- Non-terminal missions remain in the active schedule through a valid provider
  launch-window end instead of moving to History at the nominal target instant.
- Launch Library 2's confirmed payload-deployment state is normalized as a
  successful terminal outcome, so completed missions do not appear unresolved.
- Provider broadcasts whose declared end precedes the launch window are not
  promoted as mission coverage; the UI uses its honest standby/search state
  until a temporally relevant stream is available.
- Mission intelligence caches and ranks coverage by the structured mission
  name, not the shared vehicle prefix. News and community items must contain a
  distinctive mission anchor; otherwise the existing empty state is shown.
- Visual metadata is normalized with its provider record. The UI displays only
  supported image origins with explicit, meaningful attribution, an explicit reusable
  license, and an explicit `singleUse: false` clearance. Unknown-rights images
  remain hidden rather than being silently hotlinked; mission imagery is never
  labeled as a vehicle reference. The same selector protects social metadata.
- LaunchWatch currently operates as an informational, noncommercial experience,
  so explicitly licensed CC BY-NC media can be eligible. Any monetization or
  commercial reuse requires a visual-license policy audit before deployment.
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
