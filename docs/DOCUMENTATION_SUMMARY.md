# Documentation Summary

The maintained docs reflect the current LaunchWatch architecture and UX:

- provider-qualified `spacex-*` and `ll2-*` launch IDs;
- `all`, `live`, `next`, and `history` feeds plus canonical detail lookup;
- ID-only launch-intel requests resolved from authoritative server data;
- one deduplicated upcoming feed shared by the app shell and route selectors;
- internal server access to SpaceX history;
- explicit partial, stale, unavailable, empty, and retry states;
- Home, Watch, History, and detail responsibilities across responsive layouts;
- server-only provider credentials;
- narrow PWA caching that excludes data, navigation, and Next.js flight requests;
- the aggregate `check` gate plus browser, accessibility, and preview review gates.

The first-visit status is non-blocking, mobile orientation is unrestricted, and schedule/archive content uses responsive rows.

## Sources of Truth

- [`../README.md`](../README.md)
- [`ARCHITECTURE.md`](ARCHITECTURE.md)
- [`API.md`](API.md)
- [`DEPLOYMENT.md`](DEPLOYMENT.md)
- [`../MOBILE_OPTIMIZATION.md`](../MOBILE_OPTIMIZATION.md)
- [`../CONTRIBUTING.md`](../CONTRIBUTING.md)
