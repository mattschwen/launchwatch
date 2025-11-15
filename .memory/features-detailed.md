# Features - Detailed Documentation

## Core Features (MVP)

### 1. Launch List Display
**Description**: Shows upcoming rocket launches from multiple providers

**Data Sources**:
- SpaceX API (SpaceX launches)
- Launch Library 2 (Global launches)

**Information Displayed**:
- Mission name
- Rocket name
- Launch site/location
- Launch date/time (with timezone)
- Status (upcoming, live, success, failure, TBD)
- Mission description
- Livestream link (if available)

**Update Frequency**: Every 2 minutes

**Components**:
- `LaunchList.tsx` - Container with filtering
- `LaunchCard.tsx` - Individual launch card
- `FilterBar.tsx` - Search and filter controls

**File Location**: `/components/LaunchList.tsx`, `/components/LaunchCard.tsx`

---

### 2. Live Launch Detection
**Description**: Automatically detects and highlights launches happening within ±2 hours

**Detection Logic**:
```typescript
const now = Date.now() / 1000;
const twoHours = 2 * 60 * 60;
const timeDiff = Math.abs(launch.dateUnix - now);
if (timeDiff <= twoHours) {
  launch.isLive = true;
  launch.status = 'live';
}
```

**Display Features**:
- Red pulsing indicator
- Large banner at top of page
- Embedded YouTube livestream (auto-play muted)
- Live countdown timer
- Quick mission facts

**Components**:
- `LiveLaunches.tsx` - Wrapper component
- `LiveNow.tsx` - Live launch display

**File Location**: `/components/LiveNow.tsx`

---

### 3. Countdown Timers
**Description**: Real-time countdown to launch time

**Update Frequency**: Every 1 second

**Display Format**:
- Days (only if >24 hours)
- Hours (2 digits)
- Minutes (2 digits)
- Seconds (2 digits, pulsing animation)

**Special States**:
- "LAUNCHING NOW!" when countdown reaches zero
- Smooth animations on updates

**Component**: `Countdown.tsx`

**File Location**: `/components/Countdown.tsx`

---

### 4. Livestream Integration
**Description**: Embeds YouTube livestreams directly in the app

**Supported Formats**:
- youtube.com/watch?v=
- youtu.be/
- youtube.com/live/
- youtube.com/embed/

**Features**:
- Auto-play (muted for UX)
- Full screen support
- Direct link fallback
- Aspect ratio 16:9

**YouTube Embed URL**:
```typescript
`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=0`
```

**File Location**: `/components/LiveNow.tsx`

---

### 5. Rocket Facts Banner
**Description**: Rotating banner showing space facts and statistics

**Data Sources**:
- SpaceX rockets API (specifications)
- NASA APOD API (astronomy picture of the day)
- Curated trivia (hardcoded)

**Fact Types**:
- 📊 **Stats**: Height, mass, success rate
- 🎯 **Mission**: Purpose, description
- 🌌 **APOD**: NASA's daily space image
- 💡 **Trivia**: Curated interesting facts

**Rotation**: Every 15 seconds with fade animation

**Component**: `RocketFacts.tsx`

**File Location**: `/components/RocketFacts.tsx`

---

## Enhanced Features (v2.0)

### 6. Add to Calendar
**Description**: Export launches to calendar apps

**Export Formats**:
1. **Google Calendar** - Opens in new tab with pre-filled form
2. **Apple/Outlook (.ics)** - Downloads .ics file
3. **Copy to Clipboard** - Formatted text

**iCal Format**:
```
BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
SUMMARY: Mission Name
DTSTART: 20250115T100000Z
DTEND: 20250115T120000Z
DESCRIPTION: Rocket info + livestream link
LOCATION: Launch Site
VALARM: -PT1H (1 hour reminder)
END:VEVENT
END:VCALENDAR
```

**Features**:
- Automatic 1-hour reminder
- Full mission details in description
- Livestream URL included
- 2-hour event duration

**Component**: `AddToCalendar.tsx`

**File Location**: `/components/AddToCalendar.tsx`, `/lib/calendar.ts`

---

### 7. Filter & Sort System
**Description**: Advanced search and filtering for launches

**Search Features**:
- Live search (instant results)
- Searches across:
  - Mission name
  - Rocket name
  - Launch site
  - Description

**Filters**:
1. **Provider Filter**:
   - All Providers
   - SpaceX
   - NASA
   - ULA
   - Rocket Lab
   - Blue Origin
   - Arianespace

2. **Status Filter**:
   - All Status
   - Upcoming
   - Live Now
   - Success
   - Failure
   - TBD

3. **Sort Options**:
   - Date (Soonest First)
   - Date (Latest First)
   - Name (A-Z)
   - Name (Z-A)

**UI Features**:
- Collapsible filter panel
- Active filter chips (removable)
- Results counter
- Empty state messages
- Skeleton loading

**Component**: `FilterBar.tsx`

**File Location**: `/components/FilterBar.tsx`, `/components/LaunchList.tsx`

---

### 8. Browser Notifications
**Description**: Push notifications for upcoming launches

**Notification Triggers**:
1. **1 hour before launch** - First alert
2. **10 minutes before launch** - Final warning
3. **Launch goes live** - Immediate notification

**Permission Flow**:
1. Prompt appears 5 seconds after page load
2. User can enable, dismiss, or close
3. Test notification sent on enable
4. Dismissal saved to localStorage

**Notification Content**:
- Title: "🚀 {Mission Name}"
- Body: "Launching in {X} minutes\n{Rocket} from {Site}"
- Icon: Rocket icon
- Click action: Opens livestream (if available)

**Deduplication**:
- Flags stored in localStorage: `notified-1h-{id}`
- Prevents duplicate notifications
- Auto-cleanup after 7 days

**Component**: `NotificationPrompt.tsx`

**File Location**: `/components/NotificationPrompt.tsx`, `/lib/notifications.ts`

---

### 9. Launch History Archive
**Description**: Browse past SpaceX launches with statistics

**Data Source**: SpaceX Past Launches API (50 most recent)

**Statistics Dashboard**:
- Total Launches
- Successful Launches
- Failed Launches
- Success Rate (%)

**Features**:
- Same filter/sort as upcoming launches
- Success/Failure status badges
- Video replay links
- Mission descriptions
- Launch dates

**Navigation**: Click "History" button in header

**Page**: `/history`

**File Location**: `/app/history/page.tsx`, `/components/PastLaunches.tsx`

---

### 10. Progressive Web App (PWA)
**Description**: Installable app with offline support

**PWA Manifest** (`/public/manifest.json`):
```json
{
  "name": "LaunchWatch - Rocket Launch Tracker",
  "short_name": "LaunchWatch",
  "display": "standalone",
  "theme_color": "#3b82f6",
  "background_color": "#000000",
  "icons": [192x192, 512x512]
}
```

**Service Worker Features**:
- Cache-first strategy for static assets
- Network-first for API calls
- Offline fallback page
- Background sync (future enhancement)
- Push notifications (future enhancement)

**Installation**:
- Mobile: "Add to Home Screen"
- Desktop: Browser install prompt
- Standalone mode (no browser chrome)

**App Shortcuts**:
1. View Upcoming Launches (/)
2. Launch History (/history)

**Offline Support**:
- Cached pages work offline
- Custom offline page shown
- Service Worker auto-updates

**File Location**: `/public/manifest.json`, `/public/sw.js`, `/app/register-sw.tsx`

---

## Feature Matrix

| Feature | Status | Mobile | Desktop | Offline |
|---------|--------|--------|---------|---------|
| Launch List | ✅ | ✅ | ✅ | ❌ |
| Live Detection | ✅ | ✅ | ✅ | ❌ |
| Countdown | ✅ | ✅ | ✅ | ✅ |
| Livestream | ✅ | ✅ | ✅ | ❌ |
| Rocket Facts | ✅ | ✅ | ✅ | ⚠️ |
| Calendar Export | ✅ | ✅ | ✅ | ✅ |
| Filter/Sort | ✅ | ✅ | ✅ | ✅ |
| Notifications | ✅ | ✅ | ✅ | ❌ |
| History | ✅ | ✅ | ✅ | ❌ |
| PWA Install | ✅ | ✅ | ✅ | ✅ |

**Legend**:
- ✅ Fully supported
- ⚠️ Partially supported (cached data only)
- ❌ Requires internet connection

## Future Enhancement Ideas

### Short-term (Easy wins)
- Share buttons (Twitter, WhatsApp, etc.)
- Launch photos/images
- Mission patches
- Rocket comparison tool
- Launch weather info

### Medium-term (More complex)
- User accounts/authentication
- Favorite launches/rockets
- Custom notification times
- Launch map view
- Mission timeline visualization

### Long-term (Major features)
- Real-time telemetry during launches
- AR rocket viewer (3D models)
- Community comments/chat
- Launch prediction game
- Analytics dashboard
- Multi-language support
