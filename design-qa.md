# Design QA — Home mission control

## Evidence

- Source reference: `/var/folders/tz/nfmk1ytx27q87ql3tz1l6zdr0000gp/T/TemporaryItems/NSIRD_screencaptureui_Y2lJNA/Screenshot 2026-07-26 at 11.26.22 PM.png`
- Source dimensions: `3206 × 2128` pixels, with the concept framed inside the source canvas.
- Implementation capture: `/private/tmp/launchwatch-home-final-20260726.png`
- Implementation dimensions: `1272 × 1118` pixels, full-page capture from the in-app browser.
- Browser viewport: `1280 × 720` CSS pixels at DPR 2.
- Full comparison: `/private/tmp/launchwatch-qa-full-side-by-side.png`
- Focused comparison: `/private/tmp/launchwatch-qa-focus-side-by-side.png`
- State: Home, next launch loaded, five upcoming missions visible, desktop trajectory panel visible.

The reference was cropped to its app frame and normalized to the implementation
capture width for comparison. Mission names, dates, provider status, and partial
feed state differ because the implementation uses the live normalized provider
feed instead of the reference's static concept data.

## Comparison findings

### Full page

- The header, 50/50 featured mission and map row, five-column schedule, five
  visible rows, and refresh footer now follow the reference's reading order and
  density.
- Header and page gutters align to the same 90rem container.
- The former fixed ticker, oversized hero description, third calendar action,
  map controls, site chips, and duplicate footer chrome are removed from Home.
- Panel treatments are flatter, borders are quieter, and spacing is materially
  closer to the reference.
- The development-only Next.js control overlaps the far-left footer edge in the
  local capture; it is not part of the production build.

### Featured mission

- Countdown, four metadata cells, and two equal-width actions match the
  reference structure.
- Long real mission names wrap to two lines at the 1280px review viewport.
- Real provider fallbacks retain accurate labels such as `Provider channel`
  instead of claiming that a playable mission stream exists.

### Mission trajectory

- The map now presents distinct solid-green `Ascent model` and dashed-cyan
  `Target-orbit model` sections, transition and target markers, a semantic
  legend, and a functional expanded view.
- Generated paths are padded inside the SVG frame and verified with browser and
  unit tests, so the route is not cut off.
- The disclosure remains visible: the geometry is illustrative and is not
  vehicle telemetry or a planned flight path.
- Weather, wind, temperature, booster serials, and stage claims from the concept
  were not copied because the connected data sources do not provide them.
  Status, target orbit, reported site, and source use real normalized fields.

### Responsive and interaction review

- Desktop uses the split composition from 1024px upward.
- Tablet and mobile retain a compact 2×2 metadata grid and a collapsed map after
  the initial schedule.
- The expanded map traps focus, closes with Escape or its close control, and
  restores focus to the launch control.
- Filter, View all/Show fewer, briefing, navigation, refresh, launch rows, and
  mobile disclosure are functional.
- Desktop and mobile checks report no horizontal overflow and no serious WCAG
  A/AA violations.

## Iteration history

1. Replaced the variable 54/46 hero and site-network panel with a fixed-density
   50/50 mission overview.
2. Rebuilt the hero and schedule to the reference's compact hierarchy.
3. Added bounded, segmented trajectory geometry plus honest missing-data
   fallbacks and an expanded map dialog.
4. Unified source freshness and refresh controls in the footer.
5. Corrected mobile disclosure selection and verified phase bounds, focus
   restoration, and accessibility.

## Validation

- `npm run lint`: passed
- `npm run typecheck`: passed
- `npm test`: 57 passed
- `npm run test:e2e`: 11 passed in the full run; the only initially failing
  mobile trajectory assertion was corrected and then passed in both desktop and
  mobile focused reruns
- `npm run test:a11y`: 8 passed
- `npm run build`: passed with network access for the configured Google fonts
- `git diff --check`: passed

final result: passed
