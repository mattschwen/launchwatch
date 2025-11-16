# Architecture Overview

LaunchWatch is a Next.js 16 application using the App Router with TypeScript and Tailwind CSS.

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Framework** | Next.js 16 | React framework with App Router |
| **Language** | TypeScript 5 | Type-safe JavaScript |
| **Styling** | Tailwind CSS 4 | Utility-first CSS |
| **Deployment** | Vercel | Serverless hosting |
| **CI/CD** | GitHub Actions | Automated testing and deployment |

## Project Structure

```
launchwatch/
├── app/                          # Next.js App Router
│   ├── api/launches/route.ts     # API endpoint for launch data
│   ├── history/page.tsx          # Past launches page
│   ├── page.tsx                  # Home page
│   ├── layout.tsx                # Root layout
│   ├── globals.css               # Global styles
│   └── register-sw.tsx           # PWA service worker registration
├── components/                   # React components
│   ├── AddToCalendar.tsx         # Calendar integration
│   ├── Countdown.tsx             # Countdown timer
│   ├── FilterBar.tsx             # Launch filtering UI
│   ├── LaunchCard.tsx            # Individual launch card
│   ├── LaunchList.tsx            # Grid of launch cards
│   ├── LiveLaunches.tsx          # Live launches section
│   ├── LiveNow.tsx               # Live launch display
│   ├── NextLaunch.tsx            # Next upcoming launch
│   ├── NotificationPrompt.tsx    # Push notification permission
│   ├── PastLaunches.tsx          # Historical launches
│   └── RocketFacts.tsx           # Rotating facts banner
├── lib/                          # Utilities and logic
│   ├── api.ts                    # External API integrations
│   ├── hooks.ts                  # React hooks
│   ├── types.ts                  # TypeScript type definitions
│   ├── calendar.ts               # ICS calendar generation
│   ├── notifications.ts          # Push notifications
│   └── youtube.ts                # YouTube URL utilities
├── public/                       # Static assets
│   ├── manifest.json             # PWA manifest
│   ├── sw.js                     # Service worker
│   ├── offline.html              # Offline fallback page
│   └── *.svg                     # Icons and images
├── docs/                         # Documentation
└── .github/                      # GitHub configuration
    ├── workflows/ci-web.yml      # CI/CD pipeline
    └── ISSUE_TEMPLATE/           # Issue templates
```

## Data Flow

```
External APIs
    ↓
lib/api.ts (functions)
    ↓
app/api/launches/route.ts (server-side cache)
    ↓
lib/hooks.ts (client-side hooks)
    ↓
Components (UI)
    ↓
User
```

### Data Sources

1. **SpaceX API v4**: SpaceX launch data
2. **Launch Library 2**: Global launch data (all agencies)
3. **NASA API**: Astronomy Picture of the Day

### Caching Strategy

- **Server-side**: 30-minute cache in memory (`app/api/launches/route.ts`)
- **Client-side**: 10-minute refresh interval in React hooks
- **Stale-while-revalidate**: Serve stale data if API fails

## Key Components

### LaunchCard
Displays individual launch information with:
- Mission name, rocket, launch site, time
- Status badge (live, upcoming, success, failure)
- Countdown timer (if upcoming)
- Livestream embed or link
- Add to calendar button

### LiveLaunches
Detects launches happening within ±2 hours and displays:
- Large hero layout with embedded livestream
- Real-time countdown
- Launch details

### FilterBar
Allows filtering launches by:
- Date range (7 days, 30 days, 3 months)
- Space agency (SpaceX, NASA, ESA, etc.)
- Rocket type (Falcon 9, Starship, etc.)

### RocketFacts
Rotating banner displaying:
- Rocket specifications (height, mass, success rate)
- NASA Astronomy Picture of the Day
- Curated space trivia
- Auto-rotates every 15 seconds

## React Hooks

### useLaunches()
Fetches all upcoming launches:
- Refreshes every 10 minutes
- Returns: `{ launches, loading, error }`

### useLiveLaunches()
Fetches launches happening now (±2 hours):
- Refreshes every 2 minutes
- Returns: `{ liveLaunches, loading, error }`

### useNextLaunch()
Fetches next upcoming launch:
- Refreshes every 5 minutes
- Returns: `{ nextLaunch, loading, error }`

### useCountdown(targetDate)
Real-time countdown to a specific date:
- Updates every second
- Returns: `{ days, hours, minutes, seconds, total }`

## PWA Features

### Service Worker (`public/sw.js`)
- Caches static assets
- Provides offline fallback
- Enables "Add to Home Screen"

### Web Push Notifications
- Request permission via `NotificationPrompt` component
- Notify users 30 minutes before launches
- Check permission and send via `lib/notifications.ts`

### Manifest (`public/manifest.json`)
- App name, icons, colors
- Display mode: standalone
- Theme color: space-themed dark

## API Routes

### GET /api/launches?type={all|live|next}
Server-side API route that:
1. Checks server-side cache (30 min TTL)
2. If cache miss, calls external APIs
3. Combines and normalizes data
4. Returns JSON response
5. Caches result for future requests

**Benefits**:
- Shared cache across all users
- Reduced external API calls
- Stays within rate limits
- Fast response times

## Deployment

### Vercel (Production)
- **Platform**: Vercel Serverless
- **Build Command**: `npm run build`
- **Output**: `.next` directory
- **Environment Variables**: Set in Vercel dashboard
- **Domain**: TBD

### GitHub Actions CI/CD
Workflow (`.github/workflows/ci-web.yml`):
1. **Lint**: Run ESLint
2. **Type Check**: TypeScript compilation
3. **Build**: Next.js build
4. **Deploy**: Push to Vercel (on `main` branch)

## Environment Variables

```env
# Optional: NASA API Key
NEXT_PUBLIC_NASA_API_KEY=your_key_here

# Optional: Launch Library 2 API Key (for higher rate limits)
NEXT_PUBLIC_LL2_API_KEY=your_key_here
```

All vars prefixed with `NEXT_PUBLIC_` are exposed to the browser.

## Performance Optimizations

1. **Image Optimization**: Next.js Image component with lazy loading
2. **Code Splitting**: Automatic with Next.js App Router
3. **API Caching**: Multi-layer caching (client + server)
4. **Static Assets**: Served via CDN on Vercel
5. **Font Optimization**: Next.js font optimization

## Browser Support

- **Chrome/Edge**: Latest 2 versions
- **Safari**: Latest 2 versions
- **Firefox**: Latest 2 versions
- **Mobile Safari (iOS)**: iOS 15+
- **Chrome Mobile (Android)**: Android 8+

## Known Limitations

1. **No Database**: All data from external APIs (by design for MVP)
2. **Rate Limits**: LL2 free tier limited to 15 req/hour
3. **Push Notifications**: Limited on iOS (PWA only when installed)
4. **Offline Mode**: Shows cached data only, no new launches

## Future Architecture Considerations

For future versions, consider:
- **Database**: PostgreSQL for user accounts, favorites, and custom alerts
- **Backend API**: Separate API layer for better scalability
- **Real-time Updates**: WebSockets for live launch updates
- **Mobile App**: React Native for better native experience
- **CDN**: CloudFlare for global edge caching

## Security

- **No Authentication**: Not required for MVP
- **API Keys**: Stored in environment variables
- **HTTPS**: Enforced by Vercel
- **CORS**: Handled by external APIs
- **XSS Protection**: React's built-in escaping
- **CSP**: Content Security Policy via Next.js headers

## Monitoring

- **Vercel Analytics**: Page views, performance
- **GitHub Actions**: Build and deployment status
- **Browser Console**: Client-side error logging
- **Vercel Logs**: Server-side error logging

---

**Last Updated**: 2025-11-16  
**Version**: 1.0.0

