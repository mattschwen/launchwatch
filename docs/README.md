# LaunchWatch Documentation

These files describe the current product and must change with the code contracts they document.

## Start Here

- [`../README.md`](../README.md) — product overview, setup, routes, and release summary
- [`ARCHITECTURE.md`](ARCHITECTURE.md) — data boundaries, shared client feed, UX responsibilities, and PWA policy
- [`API.md`](API.md) — canonical IDs, internal endpoints, response states, and provider integrations
- [`DEPLOYMENT.md`](DEPLOYMENT.md) — local gates, preview review, production promotion, and rollback
- [`../MOBILE_OPTIMIZATION.md`](../MOBILE_OPTIMIZATION.md) — responsive behavior and QA matrix

## Contributor Docs

- [`../CONTRIBUTING.md`](../CONTRIBUTING.md)
- [`CONTRIBUTING_QUICK_START.md`](CONTRIBUTING_QUICK_START.md)
- [`DOCUMENTATION_INDEX.md`](DOCUMENTATION_INDEX.md)

## Documentation Ownership

Update docs in the same pull request when changing:

- canonical launch IDs or normalized fields;
- `/api/launches`, `/api/launches/[id]`, or `/api/launch-intel`;
- provider, cache, stale fallback, or environment behavior;
- Home, Watch, History, detail, navigation, or responsive UX;
- service-worker caching or update activation;
- validation commands, CI, preview, or production workflow.

Avoid user-specific absolute paths in tracked Markdown. Repository links should remain relative so they work in forks and code hosts.
