# Quick Start for Contributors

## 1. Install and Run

```bash
git clone https://github.com/mattschwen/launchwatch.git
cd launchwatch
npm ci
npm run dev
```

## 2. Preserve the Core Contracts

- Provider access and secrets stay on the server.
- Launch IDs are `spacex-*` or `ll2-*`.
- Intel requests send only the canonical ID.
- Upcoming consumers share `LaunchDataProvider`.
- History uses `/api/launches?type=history`.
- Service-worker caches never contain APIs or navigations.

## 3. Verify

```bash
npm run check
```

On a fresh environment, run `npx playwright install chromium` once. Then run `npm run test:e2e` and `npm run test:a11y` for route or interaction changes.

## 4. Review a Preview

Push the branch, wait for CI and a Vercel preview, then verify Home, Watch, History, canonical detail routes, API states, responsive layouts, and PWA behavior.

## 5. Document and Open the PR

Update affected docs and include:

- a short summary and rationale;
- verification commands;
- tests added or updated;
- desktop and mobile screenshots for UI changes;
- the reviewed preview URL.

See [`../CONTRIBUTING.md`](../CONTRIBUTING.md) for the full workflow.
