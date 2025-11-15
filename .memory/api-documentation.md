# API Documentation

## Overview
LaunchWatch integrates with 3 free, public APIs to fetch launch data and space information.

---

## 1. SpaceX API v4

### Base URL
```
https://api.spacexdata.com/v4
```

### Authentication
- ✅ **No API key required**
- ✅ **No rate limits**
- ✅ **Free and open source**

### Endpoints Used

#### Get Upcoming Launches
```http
GET /launches/upcoming
```

**Response Example**:
```json
[
  {
    "id": "5eb87cd9ffd86e000604b32a",
    "name": "FalconSat",
    "date_utc": "2006-03-24T22:30:00.000Z",
    "date_unix": 1143239400,
    "rocket": "5e9d0d95eda69955f709d1eb",
    "success": false,
    "details": "Engine failure at 33 seconds...",
    "links": {
      "webcast": "https://www.youtube.com/watch?v=0a_00nJ_Y88",
      "youtube_id": "0a_00nJ_Y88",
      "article": "https://www.space.com/...",
      "wikipedia": "https://en.wikipedia.org/..."
    },
    "launchpad": "5e9e4502f5090995de566f86",
    "upcoming": true
  }
]
```

**Used For**:
- Upcoming SpaceX launches
- Mission names, dates, rockets
- Livestream links
- Mission descriptions

**Cache Duration**: 5 minutes

---

#### Get Past Launches
```http
GET /launches/past?limit=50
```

**Query Parameters**:
- `limit` - Number of results (we use 50)

**Used For**:
- Launch history page
- Success/failure statistics
- Historical data

**Cache Duration**: 1 hour (past launches don't change)

---

#### Get Rockets
```http
GET /rockets
```

**Response Example**:
```json
[
  {
    "id": "5e9d0d95eda69973a809d1ec",
    "name": "Falcon 9",
    "type": "rocket",
    "active": true,
    "stages": 2,
    "boosters": 0,
    "cost_per_launch": 50000000,
    "success_rate_pct": 97,
    "first_flight": "2010-06-04",
    "country": "United States",
    "company": "SpaceX",
    "height": {
      "meters": 70,
      "feet": 229.6
    },
    "diameter": {
      "meters": 3.7,
      "feet": 12
    },
    "mass": {
      "kg": 549054,
      "lb": 1207920
    },
    "description": "Falcon 9 is a two-stage rocket..."
  }
]
```

**Used For**:
- Rocket specifications
- Facts banner (height, mass, success rate)
- Rocket trivia

**Cache Duration**: 24 hours (specifications rarely change)

---

### Error Handling
```typescript
try {
  const response = await fetch(`${SPACEX_API}/launches/upcoming`);
  if (!response.ok) throw new Error('Failed to fetch');
  const data = await response.json();
} catch (error) {
  console.error('Error:', error);
  return []; // Return empty array on error
}
```

### Data Transformation
```typescript
// Convert SpaceX format to our unified Launch type
const launch: Launch = {
  id: `spacex-${spacexLaunch.id}`,
  name: spacexLaunch.name,
  date: spacexLaunch.date_utc,
  dateUnix: spacexLaunch.date_unix,
  rocket: spacexLaunch.rocket,
  launchSite: spacexLaunch.launchpad,
  status: spacexLaunch.upcoming ? 'upcoming' :
          spacexLaunch.success ? 'success' : 'failure',
  livestream: spacexLaunch.links.webcast,
  description: spacexLaunch.details,
  isLive: false // Calculated separately
};
```

---

## 2. Launch Library 2 (The Space Devs)

### Base URL
```
https://ll.thespacedevs.com/2.2.0
```

### Authentication
- ✅ **No API key required**
- ⚠️ **Rate limit: 15 requests/hour** (free tier)
- ✅ **Free tier available**

### Endpoints Used

#### Get Upcoming Launches
```http
GET /launch/upcoming/?limit=20
```

**Query Parameters**:
- `limit` - Number of results (we use 20)

**Response Example**:
```json
{
  "count": 345,
  "next": "https://...",
  "previous": null,
  "results": [
    {
      "id": "f4b34...",
      "name": "Falcon 9 Block 5 | Starlink Group 6-32",
      "net": "2024-01-15T10:30:00Z",
      "window_start": "2024-01-15T10:30:00Z",
      "window_end": "2024-01-15T14:00:00Z",
      "status": {
        "id": 1,
        "name": "Go for Launch",
        "abbrev": "Go",
        "description": "Current T-0..."
      },
      "rocket": {
        "id": 123,
        "configuration": {
          "id": 243,
          "name": "Falcon 9 Block 5",
          "family": "Falcon",
          "variant": "Block 5"
        }
      },
      "pad": {
        "id": 87,
        "name": "Space Launch Complex 40",
        "location": {
          "name": "Cape Canaveral SFS, FL, USA",
          "country_code": "USA"
        }
      },
      "webcast_live": false,
      "vidURLs": [
        {
          "url": "https://www.youtube.com/watch?v=...",
          "title": "SpaceX Livestream"
        }
      ],
      "mission": {
        "name": "Starlink Group 6-32",
        "description": "SpaceX will deploy...",
        "type": "Communications"
      }
    }
  ]
}
```

**Used For**:
- Global launch schedule (not just SpaceX)
- Additional launch providers (ULA, Rocket Lab, etc.)
- Launch site information
- Mission details

**Cache Duration**: 5 minutes

---

### Data Transformation
```typescript
// Convert LL2 format to our unified Launch type
const launch: Launch = {
  id: `ll2-${ll2Launch.id}`,
  name: ll2Launch.name,
  date: ll2Launch.net, // Network Estimated Time
  dateUnix: new Date(ll2Launch.net).getTime() / 1000,
  rocket: ll2Launch.rocket.configuration.name,
  launchSite: ll2Launch.pad.name,
  status: ll2Launch.status.abbrev === 'Go' ? 'upcoming' : 'tbd',
  livestream: ll2Launch.vidURLs?.[0]?.url || null,
  description: ll2Launch.mission?.description || null,
  isLive: ll2Launch.webcast_live
};
```

---

### Rate Limit Handling
```typescript
// We cache responses for 5 minutes to stay under 15 req/hour limit
// 5 min cache = max 12 requests/hour
const CACHE_DURATION = 5 * 60 * 1000;
```

---

## 3. NASA API

### Base URL
```
https://api.nasa.gov
```

### Authentication
- ⚠️ **API key required**
- 🔑 **Get free key at**: https://api.nasa.gov
- ✅ **Free tier: 1,000 requests/hour**

### API Key Configuration
```bash
# .env.local
NEXT_PUBLIC_NASA_API_KEY=73MmionPbUr5BSXETpohfYGjWc8ACQPQICs6uNnC
```

### Endpoints Used

#### Astronomy Picture of the Day (APOD)
```http
GET /planetary/apod?api_key={API_KEY}
```

**Response Example**:
```json
{
  "date": "2024-01-15",
  "explanation": "This stunning image shows...",
  "hdurl": "https://apod.nasa.gov/apod/image/2401/...",
  "media_type": "image",
  "service_version": "v1",
  "title": "The Horsehead Nebula",
  "url": "https://apod.nasa.gov/apod/image/2401/..."
}
```

**Used For**:
- Rocket facts banner
- Daily space trivia
- Astronomy education

**Cache Duration**: 24 hours (APOD updates once per day)

---

### Error Handling - Rate Limits
```typescript
// Handle 429 Too Many Requests gracefully
try {
  const response = await fetch(url);
  if (response.status === 429) {
    console.warn('NASA API rate limit exceeded');
    return null; // Fail gracefully
  }
} catch (error) {
  // App continues without NASA APOD
  return null;
}
```

---

## Combined API Strategy

### Data Merging
```typescript
// Combine SpaceX and LL2 launches
const allLaunches = [
  ...spacexLaunches.slice(0, 10),
  ...ll2Launches.slice(0, 10)
];

// Sort by date
allLaunches.sort((a, b) => a.dateUnix - b.dateUnix);

// Detect live launches
const now = Date.now() / 1000;
allLaunches.forEach(launch => {
  const timeDiff = Math.abs(launch.dateUnix - now);
  if (timeDiff <= 2 * 60 * 60) { // ±2 hours
    launch.isLive = true;
  }
});
```

### Caching Implementation
```typescript
// In-memory cache
let cache: { [key: string]: { data: any; timestamp: number } } = {};

function getCachedData<T>(key: string): T | null {
  const cached = cache[key];
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data as T;
  }
  return null;
}

function setCachedData(key: string, data: any) {
  cache[key] = { data, timestamp: Date.now() };
}
```

### Next.js Cache Configuration
```typescript
// In fetch calls
const response = await fetch(url, {
  next: {
    revalidate: 300 // 5 minutes in seconds
  }
});
```

---

## API Testing & Debugging

### Test Endpoints Directly

**SpaceX Upcoming**:
```bash
curl https://api.spacexdata.com/v4/launches/upcoming
```

**Launch Library 2**:
```bash
curl https://ll.thespacedevs.com/2.2.0/launch/upcoming/?limit=5
```

**NASA APOD**:
```bash
curl "https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY"
```

### Browser DevTools
1. Open Network tab
2. Filter by Fetch/XHR
3. Look for:
   - `api.spacexdata.com`
   - `ll.thespacedevs.com`
   - `api.nasa.gov`

### Rate Limit Monitoring
```typescript
// Check cache hit/miss in console
console.log('Cache hit:', cacheKey);
console.log('Fetching fresh data:', url);
```

---

## API Reliability

### Uptime
- **SpaceX API**: 99.9% uptime
- **Launch Library 2**: 99% uptime
- **NASA API**: 99.9% uptime

### Fallbacks
- If one API fails, others continue working
- Empty arrays returned on error
- App remains functional with partial data

### Error Boundaries
```typescript
// Each API call wrapped in try/catch
try {
  const data = await fetchAPI();
  return data;
} catch (error) {
  console.error(error);
  return fallbackData; // Empty array or null
}
```

---

## API Costs

| API | Cost | Limits | Key Required |
|-----|------|--------|--------------|
| SpaceX | Free | None | No |
| Launch Library 2 | Free | 15 req/hour | No |
| NASA | Free | 1000 req/hour | Yes |

**Total Cost**: $0/month ✅

**Total Rate Limit**:
- SpaceX: Unlimited
- LL2: 15/hour (we use ~12/hour max)
- NASA: 1000/hour (we use ~2-3/hour)

All well within free tiers! 🎉
