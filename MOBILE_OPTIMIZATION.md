# Mobile Optimization Notes

This document describes the current mobile behavior of LaunchWatch and what to verify when changing responsive UI.

## Current Mobile Priorities

- readable launch cards on narrow screens
- sticky but compact headers
- clear tap targets for stream, history, home, filter, and calendar actions
- stable overlays that can always be dismissed
- countdown layouts that do not overflow
- usable expanded map behavior with visible close controls

## Current Responsive Patterns

- Header fact ribbon is hidden on smaller breakpoints and shown on large screens
- Header nav collapses to a single mobile action button
- Launch cards move from `3 columns` to `1 column`
- History stats compress into a `2 x 2` grid on smaller screens
- Filter UI uses a collapsible control panel
- Expanded map uses a full-screen modal with both `Collapse Map` and `×`

## Touch Targets to Preserve

- notification prompt buttons
- launch card stream buttons
- calendar menu trigger
- filter toggle and provider chips
- map expand and collapse controls

## Manual QA Checklist

- Load `/` on a narrow viewport
- Open and close the filter panel
- Open and close the stream fallback menu
- Open and close the calendar menu
- Expand the map and close it with both available controls
- Tap outside the expanded map and confirm it closes
- Visit `/history` and verify the header and stats remain readable

## Known Constraints

- countdown tiles get visually dense on very narrow widths
- browser notifications remain platform-dependent, especially on iOS
- offline mode only serves cached content and the offline fallback page

## Related Files

- [app/page.tsx](/Users/matthewschwen/projects/launchwatch/app/page.tsx)
- [app/history/page.tsx](/Users/matthewschwen/projects/launchwatch/app/history/page.tsx)
- [components/LaunchCard.tsx](/Users/matthewschwen/projects/launchwatch/components/LaunchCard.tsx)
- [components/LaunchList.tsx](/Users/matthewschwen/projects/launchwatch/components/LaunchList.tsx)
- [components/LaunchMap.tsx](/Users/matthewschwen/projects/launchwatch/components/LaunchMap.tsx)
- [app/globals.css](/Users/matthewschwen/projects/launchwatch/app/globals.css)
