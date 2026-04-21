# Technical Architecture

## Rendering Model

- `app/page.tsx` and `app/history/page.tsx` are server-rendered route shells
- most user-facing sections are client components
- service worker registration happens from `app/register-sw.tsx`

## Core Data Path

```text
External APIs
  ↓
lib/api.ts
  ↓
app/api/launches/route.ts
  ↓
lib/hooks.ts
  ↓
components/*
```

## Cache Timing

- `all`: 30 minutes
- `live`: 2 minutes
- `next`: 5 minutes
- LL2 raw cache: 30 minutes
- APOD: 24 hours

## Primary Modules

- `lib/api.ts` handles data fetching and normalization
- `lib/hooks.ts` handles client polling and local state
- `lib/notifications.ts` handles browser notification scheduling
- `lib/calendar.ts` handles Google Calendar and ICS exports
- `lib/youtube.ts` handles YouTube URL extraction and fallback links

## UI Surface

- `LiveLaunches` renders any live-window launches
- `NextLaunch` renders the soonest launch card
- `LaunchList` renders the upcoming launch grid, filters, and integrated map
- `PastLaunches` renders the SpaceX-only history page
- `HeaderRocketFact` renders the rotating ribbon in the header

## PWA Surface

- `public/manifest.json`
- `public/sw.js`
- `public/offline.html`

## Known Architectural Constraints

- in-memory server cache only
- no background job system
- no authenticated user state
- service worker is cache-oriented, not a push backend
