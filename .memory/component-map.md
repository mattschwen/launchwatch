# Component Map & Dependencies

## Component Hierarchy

```
Page (/)
├── NotificationPrompt
├── Header
│   └── Link to /history
├── LiveLaunches
│   └── LiveNow (if launches within ±2 hours)
│       ├── Countdown
│       └── YouTube Iframe
├── NextLaunch
│   ├── Countdown
│   └── AddToCalendar
└── LaunchList
    ├── FilterBar
    └── LaunchCard[]
        └── AddToCalendar

Page (/history)
├── Header
│   └── Link to /
└── PastLaunches
    ├── Statistics Dashboard
    ├── FilterBar
    └── LaunchCard[]
        └── AddToCalendar
```

---

## Component Details

### `/app/page.tsx` (Server → Client)
**Type**: Page Component
**Rendering**: Server Component (initial), Client Components (children)
**Purpose**: Home page with upcoming launches

**Imports**:
- `Link` from 'next/link'
- `LiveLaunches` from '@/components/LiveLaunches'
- `NextLaunch` from '@/components/NextLaunch'
- `LaunchList` from '@/components/LaunchList'
- `RocketFacts` from '@/components/RocketFacts'
- `NotificationPrompt` from '@/components/NotificationPrompt'

**Props**: None

**State**: None (delegated to child components)

---

### `/app/history/page.tsx` (Server → Client)
**Type**: Page Component
**Rendering**: Server Component (initial), Client Components (children)
**Purpose**: Launch history archive

**Imports**:
- `Link` from 'next/link'
- `PastLaunches` from '@/components/PastLaunches'

**Props**: None

**Metadata**:
```typescript
{
  title: 'Launch History | LaunchWatch',
  description: 'Browse past rocket launches and their outcomes'
}
```

---

### `/app/layout.tsx` (Server)
**Type**: Root Layout
**Rendering**: Server Component
**Purpose**: Global layout, metadata, fonts

**Imports**:
- `Metadata`, `Viewport` from 'next'
- `Geist`, `Geist_Mono` from 'next/font/google'
- `RegisterServiceWorker` from './register-sw'

**Features**:
- Google Fonts (Geist family)
- Global CSS
- Metadata (title, description, OG tags)
- Viewport configuration
- PWA manifest link
- Service Worker registration

---

### `/components/AddToCalendar.tsx` ✅ Client
**Type**: Dropdown Menu
**Purpose**: Export launch to calendar

**Props**:
```typescript
interface AddToCalendarProps {
  launch: Launch;
  variant?: 'button' | 'icon';
}
```

**State**:
- `showMenu: boolean` - Dropdown visibility
- `copied: boolean` - Clipboard copy feedback

**Functions**:
- `handleCopy()` - Copy to clipboard
- `handleDownloadICS()` - Download .ics file
- `handleGoogleCalendar()` - Open Google Calendar

**Dependencies**:
- `@/lib/types` - Launch type
- `@/lib/calendar` - Calendar utilities

**Styling**: Dropdown menu with backdrop

---

### `/components/Countdown.tsx` ✅ Client
**Type**: Timer Display
**Purpose**: Live countdown to launch

**Props**:
```typescript
interface CountdownProps {
  targetDate: string;
  className?: string;
}
```

**State**: None (uses custom hook)

**Hooks**:
- `useCountdown(targetDate)` - Live time calculation

**Display**:
- Days (if >24 hours)
- Hours (2 digits)
- Minutes (2 digits)
- Seconds (2 digits, pulsing)

**Special States**:
- "LAUNCHING NOW!" when time <= 0

---

### `/components/FilterBar.tsx` ✅ Client
**Type**: Search & Filter UI
**Purpose**: Filter and sort launches

**Props**:
```typescript
interface FilterBarProps {
  onFilterChange: (filters: FilterOptions) => void;
}

interface FilterOptions {
  search: string;
  provider: string;
  status: string;
  sortBy: 'date-asc' | 'date-desc' | 'name-asc' | 'name-desc';
}
```

**State**:
- `filters: FilterOptions` - Current filter state
- `showFilters: boolean` - Panel visibility

**Features**:
- Live search input
- Provider dropdown (SpaceX, NASA, ULA, etc.)
- Status dropdown (Upcoming, Live, Success, etc.)
- Sort dropdown
- Active filter chips
- Collapsible panel

---

### `/components/LaunchCard.tsx` ✅ Client
**Type**: Card Component
**Purpose**: Display single launch

**Props**:
```typescript
interface LaunchCardProps {
  launch: Launch;
}
```

**State**: None

**Display**:
- Mission name
- Status badge (colored)
- Rocket emoji + name
- Launch site emoji + location
- Date + time with timezone
- Description (truncated)
- Watch Stream button (if available)
- Add to Calendar button

**Styling**:
- Hover effects
- Status-based colors
- Responsive grid layout

---

### `/components/LaunchList.tsx` ✅ Client
**Type**: List Container
**Purpose**: Display all launches with filtering

**Props**: None

**State**:
- `filters: FilterOptions` - Current filters

**Hooks**:
- `useLaunches()` - Fetch and manage launches
- `useMemo()` - Filter and sort computation

**Features**:
- Loading skeleton
- Error display
- Empty state
- Filter integration
- Results counter
- Grid layout

**Filtering Logic**:
```typescript
// Search filter
if (search) filter by name/rocket/site/description

// Provider filter
switch (provider) {
  case 'spacex': match SpaceX keywords
  case 'nasa': match NASA keywords
  // etc.
}

// Status filter
filter by launch.status

// Sort
sort by date or name (asc/desc)
```

---

### `/components/LiveLaunches.tsx` ✅ Client
**Type**: Wrapper Component
**Purpose**: Display live launches if any

**Props**: None

**Hooks**:
- `useLiveLaunches()` - Fetch live launches

**Logic**:
- Returns null if no live launches
- Returns null if loading
- Maps to LiveNow components

---

### `/components/LiveNow.tsx` ✅ Client
**Type**: Banner Component
**Purpose**: Display live launch with stream

**Props**:
```typescript
interface LiveNowProps {
  launch: Launch;
}
```

**State**: None

**Features**:
- Pulsing red indicator
- YouTube embed (auto-play muted)
- Mission details
- Countdown timer
- Fallback link if no embed

**YouTube Parsing**:
```typescript
getYouTubeEmbedUrl(url) {
  // Extracts video ID from various YouTube URL formats
  // Returns: https://www.youtube.com/embed/{id}?autoplay=1
}
```

---

### `/components/NextLaunch.tsx` ✅ Client
**Type**: Banner Component
**Purpose**: Display next upcoming launch

**Props**: None

**Hooks**:
- `useNextLaunch()` - Fetch next launch

**Features**:
- Large countdown
- Mission details
- Watch stream button
- Add to calendar button

**Returns**: null if no launches or loading

---

### `/components/NotificationPrompt.tsx` ✅ Client
**Type**: Permission Dialog
**Purpose**: Request notification permission

**Props**: None

**State**:
- `showPrompt: boolean` - Display state
- `permission: NotificationPermission` - Current permission

**Lifecycle**:
1. Checks if supported
2. Waits 5 seconds
3. Shows prompt if permission = 'default'
4. Dismissal saved to localStorage

**Actions**:
- Enable → Request permission → Show test notification
- Dismiss → Hide and save to localStorage

---

### `/components/PastLaunches.tsx` ✅ Client
**Type**: List Container
**Purpose**: Display launch history

**Props**: None

**State**:
- `launches: Launch[]` - Past launches
- `loading: boolean`
- `error: string | null`
- `filters: FilterOptions`

**Features**:
- Statistics dashboard (4 cards)
- Filter integration
- Grid layout
- Success/failure badges

**Statistics**:
- Total launches
- Successful launches
- Failed launches
- Success rate %

---

### `/components/RocketFacts.tsx` ✅ Client
**Type**: Banner Component
**Purpose**: Rotating facts display

**Props**: None

**Hooks**:
- `useRocketFacts()` - Fetch and rotate facts

**State**: Managed by hook

**Rotation**:
- Every 15 seconds
- Fade out → change → fade in

**Fact Types**:
- 📊 Stats (height, mass, etc.)
- 🌌 NASA APOD
- 💡 Trivia

---

## Custom Hooks

### `useLaunches()`
**Location**: `/lib/hooks.ts`

**Returns**:
```typescript
{
  launches: Launch[];
  loading: boolean;
  error: string | null;
}
```

**Behavior**:
- Fetches on mount
- Checks for notifications
- Refreshes every 2 minutes
- Clears old notification flags

---

### `useLiveLaunches()`
**Location**: `/lib/hooks.ts`

**Returns**:
```typescript
{
  liveLaunches: Launch[];
  loading: boolean;
  error: string | null;
}
```

**Behavior**:
- Fetches live launches
- Refreshes every 30 seconds

---

### `useNextLaunch()`
**Location**: `/lib/hooks.ts`

**Returns**:
```typescript
{
  nextLaunch: Launch | null;
  loading: boolean;
  error: string | null;
}
```

**Behavior**:
- Fetches soonest launch
- Refreshes every 1 minute

---

### `useRocketFacts()`
**Location**: `/lib/hooks.ts`

**Returns**:
```typescript
{
  currentFact: RocketFact | null;
  facts: RocketFact[];
  loading: boolean;
  error: string | null;
}
```

**Behavior**:
- Fetches all facts once
- Rotates current fact every 15 seconds

---

### `useCountdown(targetDate)`
**Location**: `/lib/hooks.ts`

**Returns**:
```typescript
{
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number; // milliseconds
}
```

**Behavior**:
- Updates every second
- Calculates time difference
- Returns 0s when past target

---

## Utility Functions

### `/lib/api.ts`
- `getSpaceXUpcomingLaunches()`
- `getSpaceXPastLaunches(limit)`
- `getSpaceXRockets()`
- `getLL2UpcomingLaunches(limit)`
- `getNASAAPOD()`
- `getAllUpcomingLaunches()`
- `getLiveLaunches()`
- `getRocketFacts()`
- `getNextLaunch()`

### `/lib/calendar.ts`
- `generateICS(launch)` - Create .ics file
- `downloadICS(launch)` - Trigger download
- `getGoogleCalendarUrl(launch)` - Generate URL
- `copyToClipboard(launch)` - Copy details

### `/lib/notifications.ts`
- `requestNotificationPermission()` - Request permission
- `showLaunchNotification(launch, time)` - Show notification
- `checkAndNotify(launches)` - Check triggers
- `clearOldNotificationFlags()` - Cleanup

---

## Type Definitions

### `/lib/types.ts`

```typescript
// Main types
export interface Launch { ... }
export interface SpaceXLaunch { ... }
export interface LL2Launch { ... }
export interface APOD { ... }
export interface RocketFact { ... }
export interface SpaceXRocket { ... }
```

---

## Component Size & Complexity

| Component | Lines | Complexity | Dependencies |
|-----------|-------|------------|--------------|
| AddToCalendar | ~110 | Medium | calendar.ts |
| Countdown | ~40 | Low | hooks.ts |
| FilterBar | ~180 | High | - |
| LaunchCard | ~100 | Medium | AddToCalendar |
| LaunchList | ~150 | High | FilterBar, hooks.ts |
| LiveLaunches | ~20 | Low | LiveNow |
| LiveNow | ~110 | Medium | Countdown |
| NextLaunch | ~80 | Medium | Countdown, AddToCalendar |
| NotificationPrompt | ~90 | Medium | notifications.ts |
| PastLaunches | ~200 | High | FilterBar, hooks.ts |
| RocketFacts | ~70 | Medium | hooks.ts |

**Total**: ~1,150 lines of component code
**Average Complexity**: Medium
**Reusability**: High (modular design)
