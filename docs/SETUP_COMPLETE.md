# Setup Status

LaunchWatch is ready for local development with Node.js 22+ and npm.

## Install and Validate

```bash
npm ci
npm run check
```

Run browser tests for route, data-state, responsive, or interaction changes:

```bash
npx playwright install chromium
npm run test:e2e
npm run test:a11y
```

## Optional Server Environment

- `LL2_API_KEY`
- `NASA_API_KEY`
- `YOUTUBE_DATA_API_KEY`
- `X_BEARER_TOKEN`, or the complete X OAuth 1.0a credential set

Legacy `NEXT_PUBLIC_*` secret names are unsupported.

## Current Entry Points

- `/` — live/next mission, schedule, filters, and responsive map
- `/watch` — stream or next-mission fallback and queue
- `/history` — completed-launch archive
- `/launch/[id]` — current or historical canonical detail
- `/api/launches?type=all|live|next|history`
- `/api/launches/[id]`
- `/api/launch-intel?id=[id]`

## Release Path

Validate locally, review a Vercel preview, complete the route/API/responsive/PWA smoke checks, and only then promote to production. See [`DEPLOYMENT.md`](DEPLOYMENT.md).
