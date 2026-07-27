# Deployment Guide

LaunchWatch targets Vercel. Every release should be validated locally, deployed to an isolated preview, reviewed there, and promoted only after the preview passes smoke and responsive checks.

## Prerequisites

- Node.js 22+
- npm
- a Vercel project for hosted previews
- optional server-only environment variables:
  - `LL2_API_KEY`
  - `NASA_API_KEY`
  - `YOUTUBE_DATA_API_KEY`
  - `YOUTUBE_DAILY_LOOKUP_BUDGET` (optional integer, defaults to `25`)
  - `X_BEARER_TOKEN`, or:
    - `X_ACCESS_TOKEN`
    - `X_ACCESS_TOKEN_SECRET`
    - `X_CONSUMER_KEY`
    - `X_CONSUMER_KEY_SECRET`

The app remains usable without keys. Credentials improve provider limits or
enable optional enrichment. The YouTube lookup budget caps quota-expensive
verification work per warm server runtime; production edge/platform rate
limiting remains the outer protection layer.

`SPACEX_API_BASE_URL` and `LL2_API_BASE_URL` are optional server-only
integration overrides for deterministic tests or controlled provider mirrors.
Leave them unset in normal deployments to use the production providers.

Never configure `NEXT_PUBLIC_LL2_API_KEY`, `NEXT_PUBLIC_NASA_API_KEY`, or `NEXT_PUBLIC_YOUTUBE_API_KEY`. Migrate those legacy values to their server-only equivalents before releasing.

## Local Release Gate

Install exactly what is recorded in the lockfile:

```bash
npm ci
```

Run the complete validation gate:

```bash
npm run check
```

For routing, responsive UI, data-state, or interaction changes:

```bash
npx playwright install chromium
npm run test:e2e
npm run test:a11y
```

Install Chromium once per fresh development environment. A Linux CI job that runs browser tests should use `npx playwright install --with-deps chromium`; the standard web CI gate does not install browsers.

Optionally exercise the production server locally:

```bash
npm start
```

Do not deploy when a required command fails or when the lockfile has unreviewed changes.

## Environment Configuration

Use separate Vercel values for Development, Preview, and Production. Preview credentials should be restricted independently when a provider supports it.

```bash
vercel env ls
```

Key handling rules:

- keep every provider secret server-only;
- never commit `.env.local`;
- use either `X_BEARER_TOKEN` or all four OAuth 1.0a values;
- rotate any key that was previously exposed through a `NEXT_PUBLIC_` name;
- verify provider-specific restrictions before production promotion.

## Preview Deployment

### Pull request workflow

1. Push the implementation branch.
2. Wait for CI and the Vercel preview to finish.
3. Open the preview deployment, not the production alias.
4. complete the smoke and visual checks below.
5. Record the preview URL and verification commands in the pull request.

### Vercel CLI workflow

```bash
vercel
```

The command creates a preview by default. Do not add `--prod` until that preview has been reviewed.

## Preview Smoke Test

### Product routes

- `/` loads a live or next mission, the upcoming list, filters, and responsive map disclosure.
- `/watch` shows a live mission or a useful next-mission fallback when no stream exists.
- `/history` loads completed missions through the internal API; search and filters work.
- `/launch/<canonical-id>` resolves an upcoming mission.
- `/launch/<canonical-history-id>` resolves a completed mission and returns to History.
- a valid-but-missing canonical ID shows a not-found state without breaking the shell.

### API routes

- `/api/launches?type=all` returns normalized launches and provider metadata.
- `/api/launches?type=live` returns a launch array, including a valid empty array between missions.
- `/api/launches?type=next` returns `launch` or a valid `null`.
- `/api/launches?type=history&limit=20` returns completed launches with
  provider-qualified canonical IDs such as `spacex-*` or `ll2-*`.
- `/api/launches/<canonical-id>` returns that mission and `canonicalId`.
- `/api/launch-intel?id=<canonical-id>` resolves intelligence using only the ID.
- invalid `type`, `limit`, and ID inputs return `400`.
- a nonexistent valid ID returns `404`.

Confirm that responses expose partial or stale provider metadata when an upstream source is degraded.

### Responsive and accessibility checks

- test narrow mobile, tablet, desktop, and wide desktop viewports;
- verify Home, Watch, and History are present in mobile and desktop navigation;
- confirm all primary controls remain at least 44 pixels and keyboard operable;
- inspect heading order, visible focus, dialogs/drawers, and dismiss controls;
- enable reduced motion and confirm nonessential animations stop;
- test long launch names and empty descriptions;
- confirm the map is collapsed by default below the wide-desktop layout.

### PWA checks

- verify `manifest.json`, icons, and `offline.html` load;
- confirm the service worker registers only in a secure production build;
- confirm `/api/*`, navigations, Next.js flight payloads, and query-string requests do not enter Cache Storage;
- confirm content-hashed `/_next/static/*` assets can be served from the static cache;
- install an update and verify the waiting worker can be applied without trapping the old shell;
- simulate an offline navigation and verify the static offline document appears.

## Production Promotion

Promote only after CI, preview smoke tests, responsive review, and PWA checks pass.

With the Vercel CLI:

```bash
vercel --prod
```

Immediately repeat the critical API and route smoke tests against the production alias. Monitor runtime logs for provider timeouts, `502` responses, and launch-intel failures.

## Rollback

If production validation fails:

1. restore the last known-good Vercel deployment or alias;
2. confirm Home and `/api/launches?type=all` recover;
3. verify installed clients are not stuck on a bad service worker;
4. record the failure mode before preparing another preview.

The service worker cache is versioned. A corrective release that changes cached shell assets should increment its cache version so old LaunchWatch caches are removed during activation.

## Runtime Notes

- Provider caches are in memory and therefore local to a server instance.
- CDN response caching is controlled by each internal route’s `Cache-Control` header.
- Provider failures can return last-known data marked `stale`.
- The app has no database requirement.
- Data APIs are never service-worker cache sources.
- X enrichment is optional and does not block launch data.

## Files to Review

- [`package.json`](../package.json)
- [`next.config.ts`](../next.config.ts)
- [`vercel.json`](../vercel.json)
- [`app/api/launches/route.ts`](../app/api/launches/route.ts)
- [`app/api/launches/[id]/route.ts`](<../app/api/launches/[id]/route.ts>)
- [`public/manifest.json`](../public/manifest.json)
- [`public/sw.js`](../public/sw.js)
- [`.github/workflows/ci-web.yml`](../.github/workflows/ci-web.yml)
