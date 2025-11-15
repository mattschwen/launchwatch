# Technical Architecture

## Tech Stack

### Frontend Framework
- **Next.js 16** (App Router)
  - Server Components for initial render
  - Client Components for interactivity
  - Turbopack for fast bundling
  - Automatic code splitting

### Languages
- **TypeScript 5.9**
  - Full type safety
  - Interface definitions
  - Strict mode enabled

### Styling
- **TailwindCSS 4**
  - Utility-first CSS
  - Dark theme only
  - Custom animations
  - Responsive breakpoints

### State Management
- **React Hooks** (useState, useEffect, useMemo)
- **Custom Hooks** for data fetching
- **LocalStorage** for preferences and notification flags

## Project Structure

```
launchwatch/
├── app/                          # Next.js App Router
│   ├── layout.tsx               # Root layout with metadata
│   ├── page.tsx                 # Home page
│   ├── globals.css              # Global styles & animations
│   ├── register-sw.tsx          # Service Worker registration
│   └── history/
│       └── page.tsx             # Launch history page
│
├── components/                   # React Components
│   ├── AddToCalendar.tsx        # Calendar export dropdown
│   ├── Countdown.tsx            # Live countdown timer
│   ├── FilterBar.tsx            # Search & filter UI
│   ├── LaunchCard.tsx           # Individual launch card
│   ├── LaunchList.tsx           # Grid of launches with filters
│   ├── LiveLaunches.tsx         # Live launch wrapper
│   ├── LiveNow.tsx              # Live launch with stream embed
│   ├── NextLaunch.tsx           # Next upcoming launch
│   ├── NotificationPrompt.tsx   # Browser notification permission
│   ├── PastLaunches.tsx         # History page component
│   └── RocketFacts.tsx          # Rotating facts banner
│
├── lib/                          # Utilities & Logic
│   ├── api.ts                   # API integration with caching
│   ├── hooks.ts                 # Custom React hooks
│   ├── types.ts                 # TypeScript type definitions
│   ├── calendar.ts              # iCal/Google Calendar generation
│   └── notifications.ts         # Browser notifications logic
│
├── public/                       # Static Assets
│   ├── manifest.json            # PWA manifest
│   ├── sw.js                    # Service Worker
│   ├── offline.html             # Offline fallback page
│   ├── icon-192.svg             # PWA icon (192x192)
│   ├── icon-512.svg             # PWA icon (512x512)
│   └── [Next.js default files]
│
├── .env.local                    # Environment variables
├── .env.example                  # Environment template
├── package.json                  # Dependencies
├── tsconfig.json                 # TypeScript config
├── next.config.ts                # Next.js config
├── postcss.config.mjs            # PostCSS config
├── tailwind.config.js            # Tailwind config
├── README.md                     # Project documentation
├── DEPLOYMENT.md                 # Deployment guide
└── vercel.json                   # Vercel deployment config
```

## Data Flow

### 1. Initial Page Load
```
User visits /
  → Next.js SSR renders page structure
  → Client hydrates React components
  → useEffect hooks trigger API calls
  → Data fetched and cached
  → Components update with launch data
  → Service Worker registers in background
```

### 2. Data Fetching
```
useLaunches() hook
  → getAllUpcomingLaunches()
    → Parallel API calls:
      - SpaceX API (upcoming launches)
      - Launch Library 2 API (global launches)
    → Merge and normalize data
    → Sort by date
    → Detect live launches (±2 hours)
    → Check for notifications
  → Update state
  → Re-render components
```

### 3. Auto-Refresh Cycle
```
Every 2 minutes:
  → Fetch latest launch data
  → Check for notification triggers
  → Update countdown timers (every second)
  → Rotate rocket facts (every 15 seconds)
  → Sync service worker cache
```

## Caching Strategy

### API Cache (In-Memory)
- **Duration**: 5 minutes
- **Keys**: `spacex_upcoming`, `ll2_upcoming_20`, etc.
- **Logic**: Check timestamp, return cached if fresh

### Next.js Cache
- **Static**: 24 hours for rocket data
- **Dynamic**: 5 minutes for launches
- **ISR**: Not used (client-side refresh preferred)

### Service Worker Cache
- **Static assets**: Cached indefinitely
- **Pages**: Cache-first, network fallback
- **API responses**: Network-first, cache fallback

### Browser LocalStorage
- **Notification flags**: `notified-1h-{id}`, `notified-10m-{id}`
- **Dismissed prompts**: `notification-prompt-dismissed`
- **Cleanup**: Automatic (7 days old removed)

## API Integration

### SpaceX API v4
- **Base URL**: https://api.spacexdata.com/v4
- **Endpoints**:
  - `/launches/upcoming` - Future SpaceX launches
  - `/launches/past?limit=50` - Historical launches
  - `/rockets` - Rocket specifications
- **Rate Limit**: None (public API)
- **Caching**: 5 min (upcoming), 1 hour (past), 24 hours (rockets)

### Launch Library 2
- **Base URL**: https://ll.thespacedevs.com/2.2.0
- **Endpoints**:
  - `/launch/upcoming/?limit=20` - Global upcoming launches
- **Rate Limit**: 15 requests/hour (free tier)
- **Caching**: 5 minutes

### NASA API
- **Base URL**: https://api.nasa.gov
- **Endpoints**:
  - `/planetary/apod?api_key={key}` - Astronomy Picture of the Day
- **API Key**: Required (free, 1000 req/hour)
- **Caching**: 24 hours (APOD changes daily)

## Component Architecture

### Client Components (Interactive)
All components in `/components` are client-side:
- Use React hooks
- Handle user interactions
- Manage local state
- Subscribe to real-time updates

### Server Components
Only `/app/page.tsx` and `/app/layout.tsx` initially render on server:
- Generate initial HTML
- Set metadata
- Then hydrate to client components

### Composition Pattern
```
Page (Server)
  └─ NotificationPrompt (Client)
  └─ Header (Static)
  └─ LiveLaunches (Client)
      └─ LiveNow (Client)
          └─ Countdown (Client)
  └─ NextLaunch (Client)
      └─ Countdown (Client)
      └─ AddToCalendar (Client)
  └─ LaunchList (Client)
      └─ FilterBar (Client)
      └─ LaunchCard (Client)
          └─ AddToCalendar (Client)
  └─ RocketFacts (Client)
```

## Performance Optimizations

### Bundle Size
- Code splitting per route
- Dynamic imports for heavy components
- Tree-shaking unused code
- Minification in production

### Runtime Performance
- useMemo for filtered data
- Debounced search input
- Virtual scrolling (not implemented, lists are small)
- Lazy loading images

### Network Optimization
- Parallel API calls
- Request deduplication
- Response caching
- Service Worker precaching

### User Experience
- Skeleton loading states
- Optimistic UI updates
- Error boundaries
- Graceful fallbacks

## Security Considerations

### API Keys
- NASA key in environment variables
- Prefixed with `NEXT_PUBLIC_` for client access
- Not committed to git (.env.local in .gitignore)
- Rate limiting handled by APIs

### XSS Prevention
- React escapes all user input
- No dangerouslySetInnerHTML used
- Iframe only for trusted YouTube embeds

### Content Security Policy
- YouTube embeds allowed
- No inline scripts
- Service Worker same-origin only

## Browser Compatibility

### Required Features
- ES6+ JavaScript
- Fetch API
- LocalStorage
- Notification API (optional)
- Service Worker (optional)

### Supported Browsers
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS 14+, Android Chrome)

### Progressive Enhancement
- Core functionality works without:
  - Service Worker
  - Notifications
  - PWA features
- App gracefully degrades on older browsers
