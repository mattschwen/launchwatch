# Contributing to LaunchWatch

LaunchWatch is a focused Next.js application. Good contributions preserve its provider boundaries, canonical identity model, responsive information hierarchy, and explicit degraded states.

## Ground Rules

- Follow the [Code of Conduct](CODE_OF_CONDUCT.md).
- Do not commit secrets, provider responses, or local environment files.
- Keep changes focused and avoid unrelated cleanup.
- Update documentation in the same change as affected behavior.
- Use a preview deployment for product review before production.

## Local Setup

```bash
git clone https://github.com/mattschwen/launchwatch.git
cd launchwatch
npm ci
npm run dev
```

Open `http://localhost:3000`.

## Optional Environment

Create `.env.local` only when a task needs credentialed provider behavior:

```env
LL2_API_KEY=your_launch_library_2_key
NASA_API_KEY=your_nasa_key
YOUTUBE_DATA_API_KEY=your_youtube_data_api_key

# Choose the bearer token or the complete OAuth set.
X_BEARER_TOKEN=your_x_api_bearer_token
X_ACCESS_TOKEN=your_x_access_token
X_ACCESS_TOKEN_SECRET=your_x_access_token_secret
X_CONSUMER_KEY=your_x_consumer_key
X_CONSUMER_KEY_SECRET=your_x_consumer_key_secret
```

These are server-only values. Never introduce a `NEXT_PUBLIC_` alias for a secret. Rename and rotate any credential that was previously exposed through a legacy public variable.

## Repository Shape

- `app/` contains product routes, the root shell, and internal API routes.
- `components/` contains mission UI, actions, data states, media, map, and navigation.
- `lib/` contains provider adapters, normalization, canonical IDs, the shared client feed, launch intelligence, and shared types.
- `public/` contains install metadata, the offline document, icons, and the narrow service worker.
- `docs/` contains maintained architecture, API, deployment, and contributor guidance.
- `.github/workflows/` contains CI validation.

## Workflow

1. Branch from the current `main`.
2. Install with `npm ci`.
3. Make one coherent change.
4. Add or update tests for changed behavior.
5. Run the required checks.
6. Update relevant documentation.
7. Push and review the Vercel preview.
8. Open or update the pull request with evidence.

Do not promote directly from an unreviewed local build.

## Required Checks

```bash
npm run check
```

Run browser tests when a change affects navigation, routing, launch state, error handling, responsive behavior, or interactive UI:

```bash
npx playwright install chromium
npm run test:e2e
npm run test:a11y
```

Install Chromium once per fresh development environment. On a fresh Linux CI image, use `npx playwright install --with-deps chromium`.

Also run:

```bash
git diff --check
```

Useful focused commands are `npm run typecheck`, `npm test`, `npm run test:watch`, and `npm run test:coverage`.

## Data and API Guidelines

- Keep upstream providers behind server routes.
- Check provider response status and validate payload structure before normalization.
- Preserve timeout, in-flight deduplication, and stale fallback behavior.
- Return provider metadata so clients can represent partial and stale data honestly.
- Do not treat an in-memory cache as durable storage.
- Keep secrets in server-only environment variables.

### Canonical identity

All launch records use:

```text
spacex-<provider-id>
ll2-<provider-id>
```

Use `Launch.id` in links, Watch query parameters, detail requests, and intel requests. Retain `sourceId` only for the provider adapter. The legacy `past-*` form is read compatibility, not an output format.

### Internal routes

- `/api/launches?type=all|live|next|history`
- `/api/launches/[id]`
- `/api/launch-intel?id=[canonical-id]`

Launch-intel clients must send only the ID. Never put launch descriptions, stream URLs, or serialized launch objects in a query string.

## Client-State Guidelines

- Read the upcoming feed through `LaunchDataProvider`.
- Derive live and next selections from the shared feed instead of starting duplicate polls.
- Preserve existing data during a background refresh.
- Keep loading, refreshing, empty, partial, stale, error, and retry states distinct.
- Use `/api/launches/[id]` for missions absent from the current feed.
- Fetch history through the internal `type=history` route; do not import the SpaceX client into a browser component.

## UI Guidelines

LaunchWatch is a modern mission-control interface, not a generic dashboard.

- Preserve the black, green, cyan, amber, and red operational palette.
- Use typography, spacing, and surface hierarchy before adding glow or animation.
- Give each route one obvious primary action.
- Prefer readable schedule/archive rows and progressive disclosure.
- Keep the Home map secondary on small and medium screens.
- Ensure the Watch route remains useful when no stream is live.
- Keep Home, Watch, and History in both desktop and mobile primary navigation.
- Avoid full-screen startup states, orientation-specific layouts, and unlabeled icon controls.
- Respect reduced-motion preferences.

Minimum accessibility expectations:

- semantic landmarks and logical heading order;
- visible keyboard focus and a working skip link;
- accessible names for icon-only controls;
- 44-pixel minimum touch targets;
- WCAG AA text contrast;
- accurate live-region messages for asynchronous updates;
- dismissible drawers and overlays with correct focus behavior.

Reuse shared types from [`lib/types.ts`](lib/types.ts), shared formatting from [`lib/format.ts`](lib/format.ts), and design tokens from [`app/globals.css`](app/globals.css).

## PWA Guidelines

The service worker must not become a second data cache.

- Do not cache `/api/*`, Next.js flight responses, navigations, or arbitrary query-string requests.
- Keep navigations network-first with `offline.html` as the failure fallback.
- Cache only explicit shell assets and content-hashed Next.js static assets.
- Increment the cache version when the shell cache contract changes.
- Verify update activation in a production build.

## Pull Request Evidence

Include:

- what changed and why;
- commands run and their results;
- tests added or updated;
- desktop and mobile screenshots for visual changes;
- the reviewed preview URL;
- degraded-state or provider-failure coverage when applicable;
- documentation changed with the implementation.

## Documentation Policy

Update the following when their contracts change:

- [`README.md`](README.md) for product, setup, and route summaries;
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for boundaries and data flow;
- [`docs/API.md`](docs/API.md) for IDs, responses, errors, and cache policy;
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for environment and release workflow;
- [`MOBILE_OPTIMIZATION.md`](MOBILE_OPTIMIZATION.md) for responsive behavior.
