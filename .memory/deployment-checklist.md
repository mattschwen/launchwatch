# Deployment Checklist

## Before Deploying

- `npm install`
- `npm run lint`
- `npm run build`
- verify optional env vars if you rely on higher NASA or LL2 limits

## Smoke Test After Deploy

- home page loads
- history page loads
- `/api/launches?type=all` returns JSON
- logo renders
- map expands and collapses correctly
- notification prompt does not immediately throw client errors
- service worker registers

## Docs to Review with Deployment Changes

- `README.md`
- `docs/DEPLOYMENT.md`
- `.memory/deployment-checklist.md`
