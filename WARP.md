# Warp Developer Guide

Fast reference for working on LaunchWatch from a terminal or assistant-driven workflow.

## Core Commands

```bash
npm install
npm run dev
npm run lint
npm run build
npm start
```

## Primary Files

- [app/page.tsx](/Users/matthewschwen/projects/launchwatch/app/page.tsx)
- [app/history/page.tsx](/Users/matthewschwen/projects/launchwatch/app/history/page.tsx)
- [app/api/launches/route.ts](/Users/matthewschwen/projects/launchwatch/app/api/launches/route.ts)
- [components/LaunchList.tsx](/Users/matthewschwen/projects/launchwatch/components/LaunchList.tsx)
- [components/LaunchMap.tsx](/Users/matthewschwen/projects/launchwatch/components/LaunchMap.tsx)
- [lib/api.ts](/Users/matthewschwen/projects/launchwatch/lib/api.ts)
- [lib/hooks.ts](/Users/matthewschwen/projects/launchwatch/lib/hooks.ts)

## Current UI Direction

- active logo: `public/newlogo.jpeg`
- green-and-black mission-control shell
- console panels and telemetry styling
- green, cyan, amber, and live-state red palette
- one-time boot sequence on first load
- watch/intel surfaces behave like a media companion feed
- map overlay must always offer an explicit close path

## Data Model

- SpaceX upcoming and past launches come from `lib/api.ts`
- Launch Library 2 augments upcoming launches and provides coordinates
- NASA APOD feeds the rotating fact ribbon
- `/api/launches` exposes `all`, `live`, and `next` payloads with server-side cache
- `/api/launch-intel` exposes ranked stream, news, social, and quick-link data

## Cache Snapshot

- `all`: 30 minutes
- `live`: 2 minutes
- `next`: 5 minutes

## Sanity Checks Before Shipping

```bash
npm run lint
npm run build
```

## Docs to Update with Behavior Changes

- [README.md](/Users/matthewschwen/projects/launchwatch/README.md)
- [docs/ARCHITECTURE.md](/Users/matthewschwen/projects/launchwatch/docs/ARCHITECTURE.md)
- [docs/API.md](/Users/matthewschwen/projects/launchwatch/docs/API.md)
- [.memory/README.md](/Users/matthewschwen/projects/launchwatch/.memory/README.md)
