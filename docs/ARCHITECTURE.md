# Architecture Overview

LaunchWatch is a Next.js 16 App Router application with a mostly client-rendered UI layer sitting on top of a thin internal API route.

## Tech Stack

| Layer | Current Choice | Notes |
| --- | --- | --- |
| Framework | Next.js 16 | App Router |
| UI Runtime | React 19 | Client components for interactive sections |
| Language | TypeScript 5 | Strict mode |
| Styling | Tailwind CSS 4 | Backed by CSS variables in `app/globals.css` |
| Hosting | Vercel | Also works on any Node-compatible host |

## Current Visual System

The active product look is:

- logo: `public/newlogo.jpeg`
- background: black mission-control shell with green/cyan telemetry glow
- surfaces: console panels rather than glass cards
- accents: green, cyan, amber, and live-state red
- typography treatment: Space Grotesk + IBM Plex Mono with console labels and telemetry readouts

## App Structure

```text
app/
  layout.tsx              Root metadata, fonts, service-worker registration
  page.tsx                Home page shell
  watch/page.tsx          Watch-room route
  launch/[id]/page.tsx    Launch detail route
  history/page.tsx        Past-launch history page
  api/launches/route.ts   Internal cached launch API
  api/launch-intel/route.ts Launch-intel aggregation API

components/
  launch/HeroSection.tsx  Mission-control hero
  launch/LaunchIntelDeck.tsx Shared media companion feed surface
  LaunchList.tsx          Upcoming board, filters, and actions
  LaunchMap.tsx           Telemetry globe with follow mode and expansion state
  PastLaunches.tsx        History archive stats and list
  LaunchBriefingDrawer.tsx Mission briefing drawer
  ...

lib/
  api.ts                  External API integration and normalization
  hooks.ts                Client-side data hooks
  launch-intel.ts         Ranked stream/news/social aggregation
  notifications.ts        Browser notification logic
  calendar.ts             Google Calendar and ICS helpers
  youtube.ts              Stream and channel helper logic
  types.ts                Shared types
```

## Data Flow

```text
SpaceX API + Launch Library 2 + NASA APOD
        ↓
      lib/api.ts
        ↓
 app/api/launches/route.ts       for upcoming/live/next launch payloads
 app/api/launch-intel/route.ts   for stream/news/social aggregation
        ↓
      lib/hooks.ts
        ↓
     components/*
```

## Routes

- `/` shows the boot sequence, mission-control hero, upcoming launch board, filters, and telemetry globe
- `/watch` shows the watch-room experience with stream/video and the shared intel deck
- `/launch/[id]` shows launch detail, timeline, and mission intelligence
- `/history` shows past SpaceX launches and aggregate archive stats
- `/api/launches?type=all|live|next` exposes normalized launch data with server-side cache
- `/api/launch-intel` exposes launch-specific stream/news/social intelligence

## Cache Model

| Key | Source | Server Cache |
| --- | --- | --- |
| `all` | merged upcoming launches | 30 minutes |
| `live` | launches within the live window | 2 minutes |
| `next` | first upcoming launch | 5 minutes |

Client hooks poll on their own intervals after that:

- upcoming launches: 10 minutes
- live launches: 2 minutes
- next launch: 5 minutes

## Key Components

- `HeroSection` highlights the live or next launch and exposes stream/calendar/briefing actions
- `LaunchList` owns search, provider, status, sort, and the integrated launch board
- `LaunchMap` renders the telemetry globe, active-pad following, and site network view
- `LaunchIntelDeck` renders ranked stream leads, coverage, and community signal
- `PastLaunches` renders the SpaceX-only historical archive page
- `LaunchBriefingDrawer` exposes the quick mission briefing flow

## Notifications and PWA

- Notification permission is requested from the client UI only
- Notifications are scheduled locally from fetched launch data
- The service worker caches same-origin GET responses and serves `offline.html` for failed navigation requests
- The manifest and icons support installation as a PWA

## Known Boundaries

- There is no database
- History is currently SpaceX-only
- Browser notifications remain platform-dependent
- The map is a lightweight in-app projection, not a GIS or Google Maps integration
- There is no dedicated automated test suite yet
