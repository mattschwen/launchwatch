# Deployment Guide

LaunchWatch is easiest to deploy on Vercel, but any host that can run a Next.js production build will work.

## Recommended Path: Vercel

## Prerequisites

- Node.js 20+
- optional environment variables:
  - `NEXT_PUBLIC_NASA_API_KEY`
  - `NEXT_PUBLIC_LL2_API_KEY`
  - `YOUTUBE_DATA_API_KEY`
  - `NEXT_PUBLIC_YOUTUBE_API_KEY`
  - `X_BEARER_TOKEN`
  - `X_ACCESS_TOKEN`
  - `X_ACCESS_TOKEN_SECRET`
  - `X_CONSUMER_KEY`
  - `X_CONSUMER_KEY_SECRET`

## Local Production Check

```bash
npm install
npm run lint
npm run build
npm start
```

## Vercel Dashboard Flow

1. Import the GitHub repository
2. Let Vercel detect the app as Next.js
3. Add any optional environment variables
4. Deploy

## Vercel CLI

```bash
npm i -g vercel
vercel
vercel --prod
```

## Other Hosts

Any host should be configured around:

- install: `npm install`
- build: `npm run build`
- start: `npm start`

## Deployment Notes

- The app uses an internal in-memory cache for `/api/launches`
- The launch-intel route uses server-side source caches and stale fallback windows
- The app does not require a database
- PWA assets ship from `public/`
- X recent search can run with either a bearer token or the four OAuth 1.0a credentials above
- Optional API keys only affect rate limits, X enrichment, and NASA APOD capacity
- `.npmrc` enables `legacy-peer-deps` so clean CI/Vercel installs succeed with `react-simple-maps` on React 19

## Files to Review Before Deploying

- [package.json](/Users/matthewschwen/projects/launchwatch/package.json)
- [next.config.ts](/Users/matthewschwen/projects/launchwatch/next.config.ts)
- [vercel.json](/Users/matthewschwen/projects/launchwatch/vercel.json)
- [public/manifest.json](/Users/matthewschwen/projects/launchwatch/public/manifest.json)
- [public/sw.js](/Users/matthewschwen/projects/launchwatch/public/sw.js)

## Post-Deploy Smoke Test

- home page loads
- history page loads
- `/api/launches?type=all` returns JSON
- `/api/launch-intel` returns JSON for a serialized launch payload
- logo and icons render
- expanded map opens and closes correctly
- service worker registers without obvious console errors
