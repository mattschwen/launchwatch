# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

LaunchWatch is a Next.js 16 app that tracks upcoming NASA and SpaceX rocket launches with live streams. Built with TypeScript, TailwindCSS 4, and the App Router.

## Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint
```

## Architecture

### Data Flow

**API Integration** (`lib/api.ts`):
- Fetches from three sources: SpaceX API, Launch Library 2 (LL2), NASA APOD
- Implements 5-minute client-side cache with timestamp-based expiration
- Combines SpaceX and LL2 data into unified `Launch` type
- Live detection: marks launches as "live" if within ±2 hours of current time

**State Management** (`lib/hooks.ts`):
- Client-side hooks with auto-refresh intervals:
  - `useLaunches`: All launches, refreshes every 2 minutes
  - `useLiveLaunches`: Live launches only, refreshes every 30 seconds
  - `useNextLaunch`: Next upcoming launch, refreshes every minute
  - `useRocketFacts`: Facts rotation every 15 seconds
  - `useCountdown`: Real-time countdown timers (updates every second)
- Each hook manages its own loading/error states

**Components Architecture**:
- **Page Components** (`app/`): SSR layout, main page with sections
- **Display Components** (`components/`):
  - `LiveNow`: Shows live launch with embedded YouTube player or search fallback
  - `LaunchCard`: Individual launch cards with status, countdown, calendar integration
  - `LaunchList`: Grid of upcoming launches with filters
  - `NextLaunch`: Highlighted next upcoming launch
  - `RocketFacts`: Rotating banner with stats and trivia
  - `NotificationPrompt`: Browser notification permission UI
  - `Countdown`: Real-time countdown timers

### Type System

All types defined in `lib/types.ts`:
- **External APIs**: `SpaceXLaunch`, `SpaceXRocket`, `LL2Launch`, `APOD`
- **Internal**: `Launch` (unified format), `RocketFact`
- Launch status enum: `'upcoming' | 'live' | 'success' | 'failure' | 'tbd'`

### Key Features

**Live Launch Detection**:
- Automatically detects launches within ±2 hours
- Sets `launch.isLive = true` and `launch.status = 'live'`
- Implemented in `getAllUpcomingLaunches()` function

**YouTube Stream Integration** (`lib/youtube.ts`):
- `getYouTubeEmbedUrl()`: Extracts video ID and creates embed URL
- `generateYouTubeSearchUrl()`: Fallback search when no stream link
- `getProviderYouTubeChannel()`: Direct links to SpaceX/NASA/ULA channels
- Video ID extraction supports multiple URL formats

**Browser Notifications** (`lib/notifications.ts`):
- Triggers at: 1 hour before, 10 minutes before, and when live
- Uses localStorage to prevent duplicate notifications
- Auto-cleanup of old notification flags (7 days)
- Click notification to open livestream

**Calendar Integration** (`lib/calendar.ts` + `components/AddToCalendar.tsx`):
- Generates `.ics` files for calendar apps
- Supports Google Calendar and Apple Calendar

### Path Aliases

Uses `@/*` for root imports (configured in `tsconfig.json`):
```typescript
import { Launch } from '@/lib/types';
import LaunchCard from '@/components/LaunchCard';
```

## Environment Variables

Optional API keys (app works without them):
```bash
# NASA APOD - get free key at https://api.nasa.gov
NEXT_PUBLIC_NASA_API_KEY=your_key_here

# YouTube API - for enhanced livestream detection
NEXT_PUBLIC_YOUTUBE_API_KEY=your_key_here
```

Without keys, app uses:
- NASA APOD: DEMO_KEY (rate-limited)
- YouTube: Manual search fallback URLs

## Mobile-First Design

Per project rules:
- All components should be mobile-first with full container width
- Sub-navigation bars use consistent color transitions (light/dark modes)
- List items have slight side padding
- Pages extend fully with left/right padding

## Architecture Principles

**No Band-Aids**: Never sacrifice architecture to fix an issue. Find the root cause and fix properly.

**Data Normalization**: External API data is converted to internal `Launch` type for consistent handling across components.

**Client-Side Rendering**: Most components are `'use client'` for real-time updates and interactivity.

**Caching Strategy**:
- Short-lived (5 min): Upcoming launches
- Long-lived (24 hrs): Rocket specs, APOD
- Client-side cache prevents excessive API calls

## Working with Launch Data

When adding features that use launch data:

1. Check if data exists in unified `Launch` type
2. If new data needed, update both `lib/api.ts` conversion logic and `lib/types.ts`
3. Respect existing auto-refresh patterns in hooks
4. Handle loading and error states

Example pattern:
```typescript
const { launches, loading, error } = useLaunches();

if (loading) return <LoadingState />;
if (error) return <ErrorState />;
return <YourComponent launches={launches} />;
```

## Testing Approach

No test framework configured yet. To add tests:
- Check README.md or package.json for any test scripts
- Search codebase for existing test files before adding framework

## Deployment

Primary target: Vercel (optimized for Next.js)
- Set environment variables in Vercel dashboard
- Auto-deploys from main branch
- See `DEPLOYMENT.md` for detailed deployment guide
