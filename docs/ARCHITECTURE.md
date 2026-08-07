# Architecture Overview

LaunchWatch is a Next.js 16 App Router application. Interactive pages render on the client, but launch providers, credentialed integrations, normalization, cache fallback, and launch-intelligence aggregation remain behind internal server routes.

## System Shape

```text
Optional r/SpaceX mirror       Launch Library 2
     │                                │
     └──────────────┬─────────────────┘
                    ▼
        lib/api.ts provider adapters
        validation · timeout · cache
        normalization · canonical IDs
                    │
        ┌───────────┴────────────┐
        ▼                        ▼
 /api/launches*            /api/launch-intel
 schedule · history        ID-based enrichment
 detail lookup             server-only secrets
        │                        │
        └───────────┬────────────┘
                    ▼
       LaunchDataProvider + hooks
       one shared upcoming feed
                    │
        ┌───────────┼────────────┬─────────────┐
        ▼           ▼            ▼             ▼
       Home        Watch       History       Detail
```

## Technology

| Layer | Choice | Responsibility |
| --- | --- | --- |
| Framework | Next.js 16 App Router | Routes, server APIs, metadata, build |
| UI | React 19 | Interactive launch, media, filters, and map surfaces |
| Language | TypeScript 5 | Strict shared provider and UI contracts |
| Styling | Tailwind CSS 4 + CSS variables | Responsive mission-control design system |
| Hosting | Vercel | Preview and production deployment |
| PWA | Web app manifest + service worker | Installability, offline document, immutable asset cache |

## App Routes

```text
app/
  layout.tsx                 Metadata, fonts, shell, service-worker registration
  page.tsx                   Home: featured mission, schedule, deferred map
  watch/page.tsx             Watch stage, next fallback, mission queue, intelligence
  history/page.tsx           Completed-launch archive
  launch/[id]/page.tsx       Current or historical mission detail
  api/launches/route.ts      all, live, next, and history feeds
  api/launches/[id]/route.ts Canonical launch detail
  api/launch-intel/route.ts  ID-scoped launch intelligence
```

`AppShell` owns the shared data provider, accessible skip link, responsive primary navigation, first-visit synchronization status, footer, and desktop status bar. The status waits for a usable feed, reports partial or retained data honestly, and briefly replaces the redundant header feed/clock instruments instead of covering active route content or changing the header height. Its compact mobile and full desktop labels expose the same accessible message under reduced motion, and dismissal returns keyboard focus to the active route. The desktop ticker keeps its concise visual `T−` notation while exposing the complete, correctly pluralized duration to assistive technology. Detail views report whether their resolved mission belongs to the active schedule or completed archive, so direct canonical links keep the correct Home or History parent current while explicit Watch and History return context still takes precedence. Home, Watch, History, and detail views present route-specific controls without duplicating the global shell. External coverage, intelligence, provider, and source actions retain their concise visual labels while adding a shared screen-reader-only new-tab cue.

## Canonical Launch Identity

Provider IDs are not globally unique. The normalized `Launch.id` therefore includes its source:

```text
spacex-<SpaceX source ID>
ll2-<Launch Library 2 source ID>
```

`Launch.sourceId` retains the provider-native value and `Launch.source` identifies the adapter. All internal links, detail lookups, Watch selections, and launch-intel requests must use the canonical `Launch.id`.

`parseLaunchId` validates IDs and converts the old `past-<SpaceX-id>` form to `spacex-<SpaceX-id>` for compatibility. That legacy form must not be emitted by new code.

The same shared parser protects the browser response boundary. A successful
feed, archive, or detail payload is accepted only when its ID is canonical, its
provider prefix matches `source`, and any supplied `sourceId` matches the native
portion of that ID. An identity-invalid refresh is treated as incomplete data,
so the last known-good mission set remains visible instead of generating broken
detail, Watch, intelligence, calendar, or notification references. History uses
the same guard before its independent archive state can create mission links.

## Provider and Normalization Layer

`lib/api.ts` is server-only application infrastructure even though its normalized types are shared:

- validates provider responses before normalization;
- applies a 12-second provider timeout;
- deduplicates identical in-flight requests;
- suppresses repeat requests to the same failed provider resource for 30
  seconds, while leaving healthy providers and distinct resources independent;
- retains a last-known result for stale fallback;
- attaches provider-level `ok`, `stale`, `error`, or `not-requested` metadata;
- uses Launch Library 2's multi-provider schedule and optionally merges an
  explicitly configured compatible r/SpaceX mirror;
- de-duplicates equivalent cross-provider missions, preferring richer LL2 metadata;
- preserves provider image provenance, attribution, license, and single-use
  metadata without inferring rights from a URL;
- preserves provider launch-date precision so boundary timestamps are not
  mistaken for exact launch times;
- keeps non-terminal missions scheduled through a valid provider launch-window
  end, preventing an open-window launch from entering History at nominal T-0;
- maps Launch Library 2's confirmed payload-deployment state to the shared
  successful terminal outcome instead of leaving the mission unresolved;
- ranks detailed provider broadcasts by source trust, live state, and provider
  priority so official coverage remains the primary mission action;
- excludes non-live broadcasts whose declared end precedes the launch window,
  preventing stale provider links from replacing the honest standby/search
  state;
- accepts provider coverage only as credential-free HTTPS URLs and parses
  YouTube IDs from recognized YouTube hosts, so malformed records fall back to
  safe stream search instead of becoming executable or misleading actions;
- derives temporal live state and returns chronologically ordered launches;
- looks up current or historical records directly by canonical ID.

The historical feed requests previous missions from Launch Library 2 and any
explicitly configured compatible r/SpaceX mirror, de-duplicates equivalent
provider records, and excludes any record whose
normalized coverage state is still live or whose non-terminal provider launch
window remains open. It is served through
`/api/launches?type=history`; browser components never call providers directly.

## API Contracts

The launch APIs return data plus `LaunchFeedMeta`:

```ts
interface LaunchFeedMeta {
  generatedAt: string;
  partial: boolean;
  stale: boolean;
  cached: boolean;
  providers: {
    spacex: LaunchProviderMeta;
    ll2: LaunchProviderMeta;
  };
}
```

This metadata lets the UI distinguish:

- a complete fresh response;
- a complete or partial cached response;
- a usable stale fallback;
- a provider outage with no usable data.

Invalid input returns `400`, missing canonical launches return `404`, and a provider outage without usable data returns `502`. Unexpected server failures return `500`.

See [`API.md`](API.md) for request and response examples.

## Shared Client Feed

`LaunchDataProvider` makes one browser request to `/api/launches?type=all`. The provider:

- deduplicates concurrent refresh attempts;
- preserves existing data during background refresh;
- refreshes every two minutes;
- revalidates a stale feed when the tab becomes visible or the browser reconnects;
- exposes `loading`, `refreshing`, `error`, `meta`, and `refresh`;
- feeds notification checks from the same normalized launch set;
- checks the selected mission immediately when notification permission is
  granted, instead of waiting for the next two-minute feed refresh.

`useLaunches`, `useLiveLaunches`, and `useNextLaunch` are selectors over this
shared state. `useLaunchById` preserves the shared feed record while it calls
`/api/launches/[id]`, exposes the in-progress enrichment state, and then merges
canonical detail into that record. While a mission remains in the current feed,
its target, precision, launch window, provider status, and live flags stay
authoritative; detail can add richer visuals, descriptions, and stream links but
cannot regress current schedule state. This lets Watch resolve streams, Home
acquire richer visual provenance only when the feed has no eligible image, and
completed missions or launches outside the current window resolve. A failed
detail check keeps the shared feed mission visible and can be retried in place;
Watch reports the checking, failed, retrying, and recovered coverage states
without reloading the schedule. `useLaunchIntel` sends only the selected
canonical ID.

Canonical detail pages retain the richer server detail payload, but reconcile
its volatile live status with the shared browser feed after that feed settles.
A server-rendered live snapshot is not allowed to keep magenta
live treatment or autoplay when the current feed is unavailable, stale, or no
longer confirms the mission. The detail route instead exposes an amber retry
state while preserving official coverage and the canonical mission identity.

History has a separate server endpoint because its retention window and provider scope differ from the upcoming feed.

Opt-in browser alerts are deduplicated by canonical mission, alert threshold,
and confirmed target minute. A repeated feed refresh cannot duplicate the same
alert, while a provider retarget re-arms the one-hour and ten-minute alert
thresholds for the mission's new confirmed time. Existing pre-target-aware
flags are migrated in place so an app update does not replay an alert.

## UX Responsibilities

- **Home** establishes one visual priority: active coverage first, otherwise the next launch. A live provider broadcast keeps the target countdown visible and is labeled `Coverage live`; only an explicit provider in-flight state becomes `In flight`. Its primary mission summary exposes a valid provider launch window beside the target time instead of reducing a range to one instant. When T-0 passes, shared countdowns use that validated window to distinguish a currently open window from an amber wait for provider confirmation; a target alone never invents an open window. When a provider supplies both a `Vehicle | Mission` designation and an identical structured mission name, the primary heading removes the redundant vehicle prefix while the telemetry retains the vehicle and compact rows retain the complete provider title. Upcoming missions use readable rows and progressive loading. Detail returns restore the batch containing the selected mission and return keyboard focus to its link. The map appears beside the hero on wide screens and behind an explicit disclosure on narrower screens.
- **Launch-site presentation** pairs a compact provider pad name with a distinct
  facility or locality when available. A numeric pad such as `201` therefore
  remains traceable to Wenchang across compact rows, mission summaries, map
  facts, calendar exports, copied briefings, and browser alerts without changing
  the normalized provider contract.
- **Watch** uses the first mission with active coverage or the next scheduled mission. Its masthead and status badge call an active stream a live broadcast without claiming liftoff; the mission-first summary retains the same provider window context used by Home and detail views. Without a verified stream, it presents mission context, a countdown, a provider-channel fallback, and eligible mission imagery instead of an empty player. The bounded queue keeps deep-linked missions reachable while explicitly marking any omitted range and the selection's true feed position. Explicit queue activation adds the canonical selection to browser history so Back and Forward restore compared missions, while arrow-key roving replaces the current entry to avoid creating a history step for every directional command. Mission intelligence keeps its highest-ranked stream and social signals compact initially, reports the complete returned counts, and exposes every additional signal through keyboard- and touch-safe disclosures. Official SpaceX results carry a source cue, and AI-assisted summaries are disclosed beside the exact official post link.
- **Mission intelligence relevance** resolves the structured mission name before
  building source-specific caches and searches. News and community candidates
  must match a distinctive mission phrase, identifier, or multiple mission
  terms; provider and vehicle overlap alone cannot populate the panel, so an
  honest empty state replaces cross-mission coverage.
- **Retained Watch data** remains actionable after a shared-feed refresh failure,
  but live state is no longer authoritative: global chrome, the Watch masthead,
  coverage stage, mission badge, and queue remove live claims and autoplay until
  a focus-stable retry restores a current feed.
- **Retained global mission data** remains linked from the desktop status bar
  after either a refresh failure or a successful stale-cache response, but the
  Home schedule and ticker use the amber unconfirmed treatment and suppress
  live claims until the shared feed is current again.
- **History** provides search, provider/year/outcome filters, a newest/oldest chronology control for the visible feed window, expandable visual summaries, and stable links to details and available replays. A past-window mission whose provider has not published success or failure is labeled `Outcome unconfirmed`, uses the amber caution treatment, and remains isolatable through the URL-backed Unconfirmed outcome filter instead of inheriting a green success signal from a stale provider status. Filter and chronology context is bounded in the URL and survives mission-detail return navigation; the archive also restores the selected mission's result batch and link focus. When a compact archive record does not include coverage, expansion checks that one canonical detail route on demand and reports checking, unavailable, or confirmed-replay state without inflating the 100-record archive request. Its controls expose the current feed's oldest and newest records, and identify when the 100-mission response cap is full, so archive searches never imply unbounded retention.
- **Detail** resolves current and completed missions with the same layout and actions, keeps valid provider launch windows visible in the primary mission summary, presents one eligible vehicle or mission visual before telemetry and trajectory, then adapts countdown, timeline, video, and return navigation to mission state. Horizontally scrollable provider timelines expose their currently readable event range and total as the viewport changes.

All routes provide loading, empty, unavailable, and retry states. Coarse launch
targets use stable date estimates rather than ticking countdowns, and calendar
or alert actions stay disabled until the provider supplies at least minute-level
precision. Primary controls meet a minimum 44-pixel touch target and remain
keyboard accessible. Mission briefings keep the first eight provider timeline
events compact while reporting and revealing every additional event on demand;
the expanded state resets when the briefing closes.

## Visual Provenance Boundary

Provider media URLs are data, not permission. Normalization stores structured
`vehicleVisual` and `missionVisual` records beside the backward-compatible flat
URLs. The client selector prefers a vehicle reference, validates the image
origin, and requires a meaningful creator credit, explicit reusable license with
an HTTPS license link, and `singleUse === false`. When LL2 supplies both launch
and mission media, normalization preserves the first candidate that passes this
boundary instead of allowing an ineligible launch photo to mask a reusable
mission image. Unsupported or incomplete records
produce a missing or rights-unverified state instead of an image request.
That same policy gate supplies launch-detail social metadata, preventing hidden
or single-use imagery from bypassing the visible UI rules. Canonical mission
details publish the same mission-specific title, description, URL, image, and
attribution across Open Graph and Twitter cards so the share action cannot
produce a mixed generic/mission preview.

CC BY-NC assets are eligible only while LaunchWatch remains an informational,
noncommercial experience. A commercial or monetized release must audit and
revise the accepted-license policy before deployment.

This policy adds no client-side provider calls or bulk media joins. Home and
Watch begin with the shared feed; when a selected feed record lacks eligible
rights metadata, the existing cached canonical-detail route can enrich that one
mission. History uses its existing archive response, and detail already uses the
canonical launch response. Figures keep a stable aspect ratio, report detail
acquisition in that same footprint, load lazily except for route-leading
imagery, expose source, license, and full-resolution links, and retain visible
attribution.

## Cache Layers

| Layer | Policy |
| --- | --- |
| SpaceX upcoming adapter | 5-minute in-memory freshness, stale fallback |
| LL2 upcoming/detail adapter | 30-minute in-memory freshness, stale fallback |
| SpaceX history/detail adapter | 60-minute in-memory freshness, stale fallback |
| `type=all` CDN response | 5 minutes + 10 minutes stale-while-revalidate |
| `type=live` CDN response | 1 minute + 2 minutes stale-while-revalidate |
| `type=next` CDN response | 2 minutes + 4 minutes stale-while-revalidate |
| `type=history` CDN response | 60 minutes + 120 minutes stale-while-revalidate |
| `/api/launches/[id]` CDN response | 5 minutes + 15 minutes stale-while-revalidate |
| Launch-intel aggregate | 2 minutes fresh + 10 minutes stale fallback |

Provider transport failures also carry a bounded 30-second per-resource
cooldown. The cooldown does not turn an error into a cache hit: provider
metadata remains `error`, or `stale` when last-known data exists, until an
upstream retry succeeds.

The in-memory cache is per server instance and is an optimization, not durable storage.

## PWA and Service Worker Policy

The service worker is deliberately narrow:

- `/api/*` always goes to the network;
- Next.js flight and router-prefetch requests are never cached;
- navigations are network-first and fall back only to `offline.html`;
- arbitrary same-origin GET requests and URLs with query strings are not cached;
- explicit shell icons and the offline document are pre-cached;
- only content-hashed `/_next/static/*` assets use cache-first storage;
- version changes remove old LaunchWatch caches;
- production clients check hourly and apply waiting updates explicitly;
- a postponed waiting update is offered again when the client returns visible
  and online, while keeping the interrupted workflow focused.

This policy prevents an installed PWA from pinning stale app shells or launch data.

## Environment Boundary

All credentials use server-only names:

- `LL2_API_KEY`
- `NASA_API_KEY`
- `YOUTUBE_DATA_API_KEY`
- `XAI_API_KEY`
- `X_BEARER_TOKEN`, or the complete X OAuth 1.0a credential set

`YOUTUBE_DAILY_LOOKUP_BUDGET` is a non-secret quota guard (default `25`) that
caps cold YouTube verification lookups per warm server runtime.

`XAI_MODEL` (default `grok-4.3`) and `XAI_DAILY_LOOKUP_BUDGET` (default `4`,
maximum `24`) control optional xAI enrichment. xAI never replaces canonical
provider facts: it searches only the official `@SpaceX` account near T-0 after
direct official X results are absent. A six-hour persistent cache, two-turn
request cap, strict response schema, and canonical status-URL validation bound
cost and trust. Set the daily budget to `0` as an immediate kill switch.

Launch Library requests always use the supported production API at
`https://ll.thespacedevs.com/2.3.0`; an optional `LL2_API_KEY` only adds the
provider token and never switches traffic to the development service.

`SPACEX_API_BASE_URL` and `LL2_API_BASE_URL` are non-secret, server-only
integration seams used by the Playwright mock provider and optional controlled
mirrors. The archived public r/SpaceX API is not requested by default; setting
`SPACEX_API_BASE_URL` opts a compatible mirror into schedule and history
aggregation. Launch Library 2 defaults to its production origin.

No secret should use a `NEXT_PUBLIC_` prefix. Client components receive only normalized application responses and public links.

## Known Boundaries

- There is no database, authentication layer, or queue.
- History uses Launch Library 2 and can merge an explicitly configured SpaceX
  mirror; it remains usable when either requested provider is unavailable.
- In-memory cache contents are not shared across serverless instances.
- Browser notification delivery remains platform-dependent.
- The mission map is an in-app geographic visualization, not a GIS.
