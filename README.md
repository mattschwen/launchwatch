<div align="center">
  <img src="public/newlogo.jpeg" alt="LaunchWatch logo" width="220" height="220">

  # LaunchWatch

  Mission control for rocket enthusiasts: live launch tracking, ranked stream discovery, mission briefings, launch-site telemetry, and a real-time media companion feed.

  [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
  [![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
</div>

## Overview

LaunchWatch is a Next.js 16 app for rocket enthusiasts who want one operational surface for launches, livestreams, geography, and public mission context. The current product direction is:

- `public/newlogo.jpeg` as the active product logo
- a green-and-black mission-control interface with console typography and telemetry styling
- a first-visit boot sequence that hands off into the live board
- ranked stream intelligence backed by provider links, YouTube leads, coverage, and community signal
- an expandable telemetry globe with explicit close controls and active-pad follow mode
- archive/history views that reuse the same mission-control shell

## Current Features

- Upcoming launch feed sourced from SpaceX and Launch Library 2
- Live-launch detection for launches within approximately `±2 hours`
- Mission-control hero with countdown and calendar actions
- Embedded livestreams when a valid webcast URL is available
- Ranked stream candidates via the launch-intel layer
- Stream fallback links to provider channels, YouTube search, Reddit search, and X live search
- Launch briefing drawer with news and community context
- Launch filtering by search, provider, status, and sort order
- Expandable telemetry globe with active-site follow mode, network arcs, and explicit close controls
- Past SpaceX launch history with success and failure stats
- Watch-room surface with stream info plus mission-control feed panels
- Browser notification prompts and local notification scheduling
- Calendar export for Google Calendar and `.ics` downloads
- PWA manifest, service worker, and offline fallback page
- Rotating rocket facts sourced from SpaceX rocket data and NASA APOD

## Tech Stack

- Framework: Next.js 16 App Router
- Runtime: React 19
- Language: TypeScript 5
- Styling: Tailwind CSS 4 plus app-level CSS variables in [app/globals.css](/Users/matthewschwen/projects/launchwatch/app/globals.css)
- Deployment target: Vercel

## Data Sources

- SpaceX API v4 for upcoming launches, past launches, and rocket metadata
- The Space Devs Launch Library 2 for cross-provider upcoming launches and launch pad coordinates
- NASA APOD for rotating header facts

## Quick Start

```bash
git clone https://github.com/mattschwen/launchwatch.git
cd launchwatch
npm install
npm run dev
```

Open `http://localhost:3000`. If that port is busy, Next.js will automatically choose another open port.

## Environment Variables

All environment variables are optional.

```env
NEXT_PUBLIC_NASA_API_KEY=your_nasa_key
NEXT_PUBLIC_LL2_API_KEY=your_launch_library_key
YOUTUBE_DATA_API_KEY=your_youtube_data_api_key
NEXT_PUBLIC_YOUTUBE_API_KEY=your_youtube_data_api_key
X_BEARER_TOKEN=your_x_api_bearer_token
X_ACCESS_TOKEN=your_x_access_token
X_ACCESS_TOKEN_SECRET=your_x_access_token_secret
X_CONSUMER_KEY=your_x_consumer_key
X_CONSUMER_KEY_SECRET=your_x_consumer_key_secret
```

For X recent search, configure either `X_BEARER_TOKEN` or the four OAuth 1.0a credentials above. Without keys, the app still runs against public endpoints and falls back to the NASA `DEMO_KEY`.

## Routes

- `/` for the mission-control board, boot sequence, hero countdown, launch list, and telemetry globe
- `/watch` for the watch-room view and media companion feed
- `/launch/[id]` for mission detail, briefing, stream intelligence, and timeline views
- `/history` for past SpaceX launches and archive stats
- `/api/launches?type=all|live|next` for the app’s internal cached launch API
- `/api/launch-intel` for ranked stream leads, news, social items, and quick links

## Caching Model

- `all` launches are cached server-side for `30 minutes`
- `live` launches are cached server-side for `2 minutes`
- `next` launch is cached server-side for `5 minutes`
- client hooks refresh on their own intervals for upcoming, live, and next-launch views
- Launch Library 2 uses a longer in-memory cache to stay under free-tier rate limits

## Quality Checks

```bash
npm run lint
npm run build
```

At the time of this documentation refresh, both commands pass.

## Project Structure

```text
launchwatch/
├── app/                  # App Router pages, layout, watch/detail/history routes, API routes
├── components/           # Mission-control UI, launch intel, map, media, and layout components
├── lib/                  # Data fetching, launch-intel aggregation, hooks, calendar, notifications, types
├── public/               # Active logo, icons, manifest, service worker, offline page
├── docs/                 # User-facing and contributor documentation
└── .memory/              # Internal reference notes for future work
```

## Documentation

- [docs/README.md](/Users/matthewschwen/projects/launchwatch/docs/README.md)
- [docs/ARCHITECTURE.md](/Users/matthewschwen/projects/launchwatch/docs/ARCHITECTURE.md)
- [docs/API.md](/Users/matthewschwen/projects/launchwatch/docs/API.md)
- [docs/DEPLOYMENT.md](/Users/matthewschwen/projects/launchwatch/docs/DEPLOYMENT.md)
- [CONTRIBUTING.md](/Users/matthewschwen/projects/launchwatch/CONTRIBUTING.md)

## Contributing

Pull requests are welcome. Keep documentation changes in the same PR as the code they describe.

## License

This project is licensed under the MIT License. See [LICENSE](/Users/matthewschwen/projects/launchwatch/LICENSE).
