# API Documentation

LaunchWatch uses three external APIs to provide launch data and space content.

## External APIs

### SpaceX API v4

**Base URL**: `https://api.spacexdata.com/v4`

**Authentication**: None required

**Rate Limits**: None

**Usage in LaunchWatch**:
- Fetch upcoming SpaceX launches
- Get rocket specifications
- Access launch history

**Example Request**:
```bash
curl -X POST https://api.spacexdata.com/v4/launches/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": { "upcoming": true },
    "options": {
      "populate": ["rocket", "launchpad"],
      "sort": { "date_unix": "asc" }
    }
  }'
```

**Response**:
```json
{
  "docs": [
    {
      "id": "abc123",
      "name": "Starlink Mission",
      "date_utc": "2025-12-01T10:00:00.000Z",
      "date_unix": 1733050800,
      "rocket": {
        "id": "5e9d0d95eda69973a809d1ec",
        "name": "Falcon 9"
      },
      "links": {
        "webcast": "https://youtube.com/watch?v=...",
        "youtube_id": "..."
      }
    }
  ]
}
```

**Documentation**: [SpaceX API Docs](https://github.com/r-spacex/SpaceX-API/tree/master/docs)

---

### Launch Library 2 API

**Base URL**: 
- Free: `https://ll.thespacedevs.com/2.2.0`
- Premium: `https://lldev.thespacedevs.com/2.2.0`

**Authentication**: Optional (Token in header for premium)

**Rate Limits**:
- Free: 15 requests/hour
- Premium: Higher limits

**Usage in LaunchWatch**:
- Fetch global launch schedule (all space agencies)
- Get launch status updates
- Access livestream URLs

**Example Request**:
```bash
# Free tier
curl https://ll.thespacedevs.com/2.2.0/launch/upcoming/?limit=20

# With API key (premium)
curl https://lldev.thespacedevs.com/2.2.0/launch/upcoming/?limit=20 \
  -H "Authorization: Token YOUR_API_KEY"
```

**Response**:
```json
{
  "results": [
    {
      "id": "abc-123-def",
      "name": "Falcon 9 | Starlink Mission",
      "net": "2025-12-01T10:00:00Z",
      "status": {
        "id": 1,
        "name": "Go",
        "abbrev": "Go"
      },
      "rocket": {
        "configuration": {
          "name": "Falcon 9",
          "family": "Falcon"
        }
      },
      "pad": {
        "name": "SLC-40",
        "location": {
          "name": "Cape Canaveral, FL",
          "country_code": "USA"
        }
      },
      "webcast_live": false,
      "vidURLs": [
        {
          "url": "https://youtube.com/watch?v=...",
          "title": "SpaceX Livestream"
        }
      ]
    }
  ]
}
```

**Documentation**: [Launch Library 2 Docs](https://ll.thespacedevs.com/2.2.0/swagger/)

---

### NASA API

**Base URL**: `https://api.nasa.gov`

**Authentication**: API Key required (free)

**Rate Limits**:
- DEMO_KEY: 30 requests/hour
- Personal Key: 1000 requests/hour

**Usage in LaunchWatch**:
- Fetch Astronomy Picture of the Day (APOD)
- Display space imagery and facts

**Example Request**:
```bash
curl "https://api.nasa.gov/planetary/apod?api_key=YOUR_API_KEY"
```

**Response**:
```json
{
  "date": "2025-11-16",
  "explanation": "What's that in the night sky? A beautiful nebula...",
  "hdurl": "https://apod.nasa.gov/apod/image/2511/nebula_hd.jpg",
  "media_type": "image",
  "title": "The Eagle Nebula",
  "url": "https://apod.nasa.gov/apod/image/2511/nebula.jpg"
}
```

**Get API Key**: [https://api.nasa.gov](https://api.nasa.gov)

**Documentation**: [NASA API Docs](https://api.nasa.gov/)

---

## LaunchWatch Internal API

### GET /api/launches

Internal API route for fetching launch data with server-side caching.

**Parameters**:
- `type`: string (required) - One of: `all`, `live`, `next`

**Examples**:

```bash
# Get all upcoming launches
curl http://localhost:3000/api/launches?type=all

# Get launches happening now (±2 hours)
curl http://localhost:3000/api/launches?type=live

# Get next upcoming launch
curl http://localhost:3000/api/launches?type=next
```

**Response (type=all)**:
```json
{
  "launches": [
    {
      "id": "spacex-abc123",
      "name": "Starlink Mission",
      "date": "2025-12-01T10:00:00.000Z",
      "dateUnix": 1733050800,
      "rocket": "Falcon 9",
      "launchSite": "SLC-40",
      "status": "upcoming",
      "livestream": "https://youtube.com/watch?v=...",
      "description": "Launch of 23 Starlink satellites",
      "isLive": false,
      "image": null,
      "missionPatch": null,
      "location": null
    }
  ],
  "cached": true,
  "source": "server-cache"
}
```

**Response (type=next)**:
```json
{
  "launch": {
    "id": "spacex-abc123",
    "name": "Starlink Mission",
    "date": "2025-12-01T10:00:00.000Z",
    "dateUnix": 1733050800,
    "rocket": "Falcon 9",
    "launchSite": "SLC-40",
    "status": "upcoming",
    "livestream": "https://youtube.com/watch?v=...",
    "description": "Launch of 23 Starlink satellites",
    "isLive": false
  },
  "cached": false,
  "source": "api"
}
```

**Caching**: Responses are cached server-side for 30 minutes.

---

## API Integration Code

All API integration code is in `lib/api.ts`:

- `getSpaceXUpcomingLaunches()` - Fetch SpaceX launches
- `getLL2UpcomingLaunches(limit)` - Fetch Launch Library 2 launches
- `getNASAAPOD()` - Fetch NASA Astronomy Picture of the Day
- `getAllUpcomingLaunches()` - Combined launch data from all sources
- `getLiveLaunches()` - Filter for launches happening now
- `getNextLaunch()` - Get next upcoming launch
- `getRocketFacts()` - Generate rocket facts for banner

---

## Rate Limit Handling

LaunchWatch implements smart caching to avoid hitting rate limits:

1. **Client-side caching**: Launches refresh every 10 minutes
2. **Server-side caching**: API responses cached for 30 minutes
3. **Stale-while-revalidate**: Returns stale cache on rate limit errors
4. **Extended cache for LL2**: 30-minute cache for rate-limited endpoints

---

## Error Handling

All API functions handle errors gracefully:

```typescript
try {
  const data = await fetch(API_URL);
  return data;
} catch (error) {
  console.error('API error:', error);
  // Return stale cache if available
  const staleCache = getStaleCachedData(cacheKey);
  if (staleCache) return staleCache;
  // Return empty array as fallback
  return [];
}
```

This ensures the app continues working even if external APIs are down.

