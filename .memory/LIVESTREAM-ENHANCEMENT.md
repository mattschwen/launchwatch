# Livestream Detection Enhancement

**Date**: November 15, 2025
**Status**: ✅ Complete

---

## Problem

User reported that the current launch (Galaxy 33 & 34 on Falcon 9) had no stream button even though the livestream was available on YouTube at: https://www.youtube.com/watch?v=ioX1OpWjFls

The Launch Library 2 API doesn't always provide livestream URLs immediately, causing launches to display without a way to watch them.

---

## Solution

Implemented automatic livestream search fallback system with three-tier approach:

### 1. Created `lib/youtube.ts`

**Functions**:

- `extractYouTubeId(url)` - Extracts video ID from various YouTube URL formats
  - Supports: youtube.com/watch?v=, youtu.be/, youtube.com/embed/, youtube.com/live/
  - Returns: Video ID or null

- `getYouTubeEmbedUrl(url)` - Converts any YouTube URL to embed format
  - Returns: `https://www.youtube.com/embed/{id}?autoplay=1&mute=0`

- `generateYouTubeSearchUrl(launch)` - Creates intelligent search URL
  - Builds query from: provider + rocket + mission name + "launch livestream"
  - Returns: YouTube search results URL

- `getProviderYouTubeChannel(launch)` - Returns provider's channel URL
  - Supported providers:
    - SpaceX → https://www.youtube.com/@SpaceX/streams
    - NASA → https://www.youtube.com/@NASA/streams
    - ULA → https://www.youtube.com/@ulalaunch/streams
    - Rocket Lab → https://www.youtube.com/@RocketLab/streams
    - Blue Origin → https://www.youtube.com/@blueorigin/streams

- `searchYouTubeLivestream(launch)` - Main search function (for future use)
  - Validates existing livestream URL
  - Can integrate YouTube Data API v3 if key provided
  - Falls back to search URL generation

- `buildSearchQuery(launch)` - Builds intelligent search query
  - Detects provider from name/rocket
  - Includes rocket type and mission name
  - Adds "launch livestream" keywords

### 2. Enhanced `components/LiveNow.tsx`

**New Features**:

- State management for embed URL and search helper visibility
- `useEffect` hook to check for valid embed URL
- Shows search helper if no embed URL available

**Search Helper UI**:
```tsx
<div className="bg-yellow-900/20 border-2 border-yellow-500/50 rounded-lg p-6 mb-6">
  <h3>🔍 Find Livestream</h3>
  <p>The API doesn't have a livestream link yet. You can search for it:</p>

  <button>🔍 Search YouTube</button>      // Specific launch search
  <button>📺 Provider Channel</button>   // Provider's live streams page
  <button>🚀 All Space Streams</button>  // General space launch search
</div>
```

**Logic Flow**:
1. Check if launch has livestream URL
2. Try to get embed URL from livestream
3. If no embed URL → show search helper
4. If embed URL exists → show YouTube iframe
5. Always show "Watch Live Stream" button if livestream URL exists

---

## User Experience

### Before Enhancement:
- Launch with no API livestream → No way to watch
- User manually searches YouTube
- Frustrating experience

### After Enhancement:
- Launch with no API livestream → Search helper appears
- Three convenient search options:
  1. **Search YouTube** - Pre-filled search for this specific launch
  2. **Provider Channel** - Direct link to SpaceX/NASA/etc streams page
  3. **All Space Streams** - Fallback to general space launch search
- User finds stream in 1-2 clicks
- Seamless experience

---

## Technical Details

### URL Pattern Matching

Supports all YouTube URL formats:
```javascript
// Standard watch URL
https://www.youtube.com/watch?v=ioX1OpWjFls

// Short URL
https://youtu.be/ioX1OpWjFls

// Embed URL
https://www.youtube.com/embed/ioX1OpWjFls

// Live URL
https://www.youtube.com/live/ioX1OpWjFls
```

### Search Query Building

Example for Galaxy 33 & 34 launch:
```
Input: Launch {
  name: "Galaxy 33 & 34 | Falcon 9 Block 5",
  rocket: "Falcon 9 Block 5"
}

Output Query: "SpaceX Falcon 9 Block 5 Galaxy 33 & 34 launch livestream"
```

### Provider Detection

Detects provider from launch name or rocket name:
- "spacex" OR "falcon" OR "starship" → SpaceX
- "nasa" → NASA
- "ula" → ULA
- "rocket lab" → Rocket Lab
- "blue origin" → Blue Origin

---

## Future Enhancements (Optional)

### YouTube Data API v3 Integration

If user adds API key to `.env.local`:
```bash
NEXT_PUBLIC_YOUTUBE_API_KEY=your_key_here
```

The system can:
1. Automatically search YouTube API
2. Find live/recent videos matching the launch
3. Return direct video URL
4. Auto-embed without user interaction

**Implementation**:
- Function already exists: `searchViaAPI(launch)`
- Searches for: provider + rocket + mission + "launch livestream"
- Filters for: `eventType: 'completed,live'`
- Orders by: `date` (most recent first)
- Auto-selects: First result

**Rate Limits**:
- Free tier: 10,000 quota/day
- Cost per search: 100 quota units
- Max searches/day: ~100

---

## Files Modified

1. **lib/youtube.ts** (NEW)
   - 250 lines
   - 10 exported functions
   - YouTube search and parsing utilities

2. **components/LiveNow.tsx** (MODIFIED)
   - Added search helper UI
   - Added state management
   - Added import for YouTube utilities

---

## Testing

### Test Cases

1. ✅ Launch with valid YouTube URL → Shows embed
2. ✅ Launch with null livestream → Shows search helper
3. ✅ Launch with invalid URL → Shows search helper
4. ✅ Search YouTube button → Opens correct search
5. ✅ Provider Channel button → Opens correct channel
6. ✅ All Space Streams button → Opens general search

### Test URLs

SpaceX Launch:
```
Name: "Starlink 6-77 | Falcon 9 Block 5"
Search: "SpaceX Falcon 9 Block 5 Starlink 6-77 launch livestream"
Channel: https://www.youtube.com/@SpaceX/streams
```

NASA Launch:
```
Name: "Artemis 2 | SLS Block 1"
Search: "NASA SLS Block 1 Artemis 2 launch livestream"
Channel: https://www.youtube.com/@NASA/streams
```

---

## Code Examples

### Extract Video ID
```typescript
const url = "https://www.youtube.com/watch?v=ioX1OpWjFls";
const id = extractYouTubeId(url); // "ioX1OpWjFls"
```

### Get Embed URL
```typescript
const url = "https://youtu.be/ioX1OpWjFls";
const embed = getYouTubeEmbedUrl(url);
// "https://www.youtube.com/embed/ioX1OpWjFls?autoplay=1&mute=0"
```

### Generate Search URL
```typescript
const launch = {
  name: "Galaxy 33 & 34 | Falcon 9 Block 5",
  rocket: "Falcon 9 Block 5"
};
const search = generateYouTubeSearchUrl(launch);
// "https://www.youtube.com/results?search_query=SpaceX+Falcon+9+Block+5+Galaxy+33+%26+34+launch+livestream"
```

### Get Provider Channel
```typescript
const launch = {
  name: "Starlink | Falcon 9",
  rocket: "Falcon 9"
};
const channel = getProviderYouTubeChannel(launch);
// "https://www.youtube.com/@SpaceX/streams"
```

---

## Commit

```bash
git commit -m "feat: Enhanced livestream detection with YouTube search fallback

- Created lib/youtube.ts with search utilities
- Added extractYouTubeId() for URL parsing
- Added generateYouTubeSearchUrl() for intelligent searches
- Added getProviderYouTubeChannel() for provider links
- Enhanced LiveNow.tsx with search helper UI
- Shows 3 fallback options when API has no stream
- Supports SpaceX, NASA, ULA, Rocket Lab, Blue Origin
- Resolves issue where launches had no stream button"
```

---

## Impact

- ✅ Never miss a livestream
- ✅ Always have a way to find the stream
- ✅ One-click access to provider channels
- ✅ Intelligent search queries
- ✅ Better user experience
- ✅ No external dependencies required
- ✅ Optional YouTube API integration for auto-detection

---

**Status**: Production Ready ✅
**Testing**: Complete ✅
**Documentation**: Complete ✅
**Deployed**: Ready for deployment

🚀 LaunchWatch now intelligently finds livestreams!
