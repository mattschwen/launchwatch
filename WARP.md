# WARP Developer Guide

Quick reference for working with LaunchWatch in Warp terminal or AI assistants.

## Project Summary

LaunchWatch - Next.js 16 app tracking NASA and SpaceX rocket launches with live streams.

**Tech Stack**: Next.js 16, TypeScript 5, Tailwind CSS 4, React 19

## Quick Commands

```bash
npm run dev          # Dev server (localhost:3000)
npm run build        # Production build
npm run lint         # ESLint check
npm start            # Run production build
```

## Key Files

### API Layer (`lib/`)
- `api.ts` - External API integrations (SpaceX, LL2, NASA)
- `hooks.ts` - React hooks for data fetching
- `types.ts` - TypeScript type definitions
- `notifications.ts` - Push notification logic
- `calendar.ts` - ICS calendar generation
- `youtube.ts` - YouTube URL utilities

### Components (`components/`)
- `LaunchCard.tsx` - Individual launch display
- `LaunchList.tsx` - Grid of launches
- `LiveLaunches.tsx` - Live launch section
- `FilterBar.tsx` - Launch filtering
- `Countdown.tsx` - Timer component
- `RocketFacts.tsx` - Rotating facts banner

### App Router (`app/`)
- `page.tsx` - Home page
- `layout.tsx` - Root layout
- `api/launches/route.ts` - Server API endpoint
- `history/page.tsx` - Past launches

## Architecture

**Data Flow**:
```
External APIs → lib/api.ts → app/api/launches → lib/hooks.ts → Components
```

**Caching**:
- Server: 30 min cache in API route
- Client: 10 min refresh in hooks
- Stale-while-revalidate on errors

**APIs Used**:
1. SpaceX API v4 - SpaceX launches
2. Launch Library 2 - Global launches (rate limited 15/hour free)
3. NASA API - Astronomy Picture of the Day

## Common Tasks

### Add New Component
```bash
# Create in components/
touch components/NewComponent.tsx
# Use 'use client' if it needs client-side state
```

### Modify API Integration
Edit `lib/api.ts`:
- Add new function
- Update types in `lib/types.ts`
- Use caching helpers

### Add New Page
```bash
mkdir app/newpage
touch app/newpage/page.tsx
# Auto-routed to /newpage
```

### Update Styling
- Use Tailwind utilities
- CSS variables in `app/globals.css`
- Color scheme: `--primary`, `--surface`, `--text-primary`, etc.

## Environment Variables

```env
NEXT_PUBLIC_NASA_API_KEY=optional_nasa_key
NEXT_PUBLIC_LL2_API_KEY=optional_ll2_key
```

## Deployment

Push to `main` → GitHub Actions → Vercel (auto-deploy)

## Documentation

- [README](./README.md) - Project overview
- [CONTRIBUTING](./CONTRIBUTING.md) - Contribution guide
- [ARCHITECTURE](./docs/ARCHITECTURE.md) - System design
- [API](./docs/API.md) - API integration details

## Debugging

```bash
# Check TypeScript errors
npx tsc --noEmit

# Check bundle size
npm run build
# Output shows page sizes

# View console logs
# Open browser DevTools (F12)
```

## Testing Locally

1. Start dev server: `npm run dev`
2. Open http://localhost:3000
3. Check browser console for errors
4. Test on mobile viewport (Chrome DevTools)

## Need Help?

- [Open an issue](https://github.com/yourusername/launchwatch/issues)
- [Read the docs](./docs/)
- Check existing code for patterns

---

**Pro Tip**: Use `cmd/ctrl + P` in VS Code to quickly navigate files.
