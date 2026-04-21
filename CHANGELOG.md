# Changelog

All notable changes to LaunchWatch are documented here.

The format follows Keep a Changelog and the project uses semantic versioning.

## [Unreleased]

### Changed

- Refreshed the documentation set to match the current branding, UI, and runtime behavior
- Shifted the app back to the green mission-control identity with the restored logo and shell
- Added a one-time mission boot sequence, shared media-companion intel deck, and upgraded telemetry globe behavior

## [1.1.1] - 2026-04-20

### Added

- Integrated the launch-sites map into the main upcoming-launch experience
- Added explicit `Collapse Map` and `×` controls for the expanded map overlay

### Changed

- Updated the visual documentation to reflect the then-current light-space glass UI and active logo
- Tightened internal API cache durations for `live` and `next` launch views
- Improved filter behavior so history-only filters match the data they actually support

### Fixed

- Fixed notification flag expiry bookkeeping
- Fixed service-worker icon references and `/api/launches` response handling
- Fixed multiple React and ESLint violations in interactive components
- Fixed stale and inconsistent documentation across root docs, `docs/`, and `.memory/`

## [1.0.0] - 2025-11-16

### Added

- Initial LaunchWatch release
- Upcoming launch tracking
- Live launch detection
- Countdown timers
- Calendar export
- Launch history page
- Rocket fact ribbon
- PWA manifest and service worker

## Links

- [Unreleased]: https://github.com/mattschwen/launchwatch/compare/v1.1.1...HEAD
- [1.1.1]: https://github.com/mattschwen/launchwatch/compare/v1.0.0...v1.1.1
- [1.0.0]: https://github.com/mattschwen/launchwatch/releases/tag/v1.0.0
