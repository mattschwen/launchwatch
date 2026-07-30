# Responsive and Mobile Validation

LaunchWatch supports portrait, landscape, and resizable desktop layouts. The PWA manifest does not lock orientation, and no route should require portrait mode.

## Information Priority

On narrow screens, content should appear in this order:

1. sticky product header and any live indicator;
2. live or next-mission hero with one clear primary action;
3. upcoming mission schedule;
4. collapsed mission-map disclosure;
5. footer and fixed Home/Watch/History navigation.

The schedule must remain reachable without scrolling through a fully rendered map or dense telemetry wall.

## Navigation

- Desktop uses the sticky top navigation for Home, Watch, and History.
- Mobile uses a safe-area-aware fixed bottom navigation with the same three destinations.
- The external source-code link remains secondary and is not a primary mobile destination.
- The app shell includes a keyboard skip link.
- Live state may add an indicator to Watch but must not change the navigation order.

## Home

- The featured mission uses fluid type and a single-column action hierarchy on narrow screens.
- Countdown values wrap without horizontal overflow.
- Mission metadata adapts from multiple columns to stacked groups.
- Upcoming missions render as compact responsive rows.
- Filters are collapsed until requested.
- The featured mission may show one fixed-aspect licensed vehicle or mission
  visual. It must preserve its caption and full-image action without widening
  the page.
- While richer detail metadata is requested, the same fixed visual footprint
  reports acquisition progress so content below it does not jump.
- The map appears beside the hero only at wide desktop widths.
- On smaller widths, the map is behind an explicit disclosure after the schedule.

The optional expanded map remains a modal dialog. It must:

- move focus to its Close Map control;
- trap focus while open;
- close with Escape and the labeled close control;
- restore focus to the expand control;
- remain usable in portrait and landscape.

## Watch

- Video preserves its aspect ratio without forcing horizontal overflow.
- When no verified stream is available, the route presents the next mission,
  countdown, provider fallback, and one eligible mission visual instead of an
  empty stage. A verified stream remains the primary visual.
- The mission queue follows the stage on smaller screens and becomes a side rail on larger screens.
- The selected mission trajectory follows the stage and queue, and uses the same
  disclosed illustrative model as mission detail.
- Coverage signal bars represent the presence of verified stream, news, and
  community records; they do not imply measured radio strength.
- Mission selection updates the canonical `?id=` URL without a full navigation.
- Launch actions wrap into labeled, touch-friendly controls.
- Schedule recovery keeps its retry control focused while busy, suppresses duplicate requests, and moves focus to the restored mission.

## History

- Search and provider/year/outcome filters stack on narrow screens.
- Each archive row keeps the mission and View Mission action readable before exposing secondary metadata.
- Expanded summaries remain in normal document flow.
- Licensed imagery loads only inside an expanded row so the collapsed archive
  remains compact and scan-efficient.
- Replay and detail links use canonical `spacex-*` IDs.
- Empty, error, stale, and retry states must fit without overflow.

## Mission Detail

- Long names wrap as phrases within the available width.
- The status, title, description, actions, and telemetry summary stack on narrow screens.
- One licensed vehicle or mission visual appears before the telemetry card and
  trajectory; when rights cannot be verified, the layout presents a compact,
  honest unavailable state in the same stable visual footprint.
- Primary and secondary actions remain labeled; icon-only controls require accessible names.
- Timeline events use compact `T−`/`T+` mission offsets and scroll within
  their own region when necessary.
- Video and intelligence sections become a single column.
- Every canonical detail renders exactly one selected-mission trajectory before
  timeline and intelligence support.
- Completed missions return to History and omit future-only calendar actions.

## Touch and Keyboard Requirements

- Minimum interactive target: 44 by 44 CSS pixels.
- Keep fixed navigation clear of `env(safe-area-inset-bottom)`.
- Do not hide focus outlines.
- Keep the active navigation item available through `aria-current`.
- Connect disclosures to controlled regions with `aria-expanded` and `aria-controls`.
- Give icon-only buttons an accessible name.
- Prevent background scrolling while modal drawers or the expanded map are open.

## Motion and Readability

- Respect `prefers-reduced-motion`.
- Trajectory drawing, telemetry flow, beacon pulses, and holographic sheen stop
  under reduced motion while their final visual state remains legible.
- Visual figures reserve the same viewport and caption footprint while rights
  metadata loads, then use a fixed image aspect ratio to avoid layout shifts.
  Their scanline/sheen treatment is decorative, low contrast, and disabled with
  reduced motion; image failures resolve to a readable amber state with a
  focus-safe retry that returns keyboard users to the recovered full-image
  action.
- Avoid using animation as the only live-status cue.
- Pair every semantic signal with text: green for nominal, magenta for live
  coverage, red for critical/hold states, cyan for trajectory data, and amber
  for caution or incomplete data.
- Keep body text at a readable size and WCAG AA contrast.
- Avoid dense all-uppercase labels for primary reading content.
- The first-visit synchronization status is a small dismissible toast and must never cover the page or delay interaction.

## PWA and Offline Behavior

- Installed mode uses the same responsive layouts and supports both orientations.
- API responses and navigations are not served from a service-worker cache.
- Offline navigation displays the static offline document.
- A newly available worker is applied explicitly before reloading into a new shell.
- Bottom navigation and safe-area spacing remain correct in standalone mode.

## Manual QA Matrix

Test at minimum:

| Viewport | Orientation | Focus |
| --- | --- | --- |
| `320 × 568` | Portrait | Long text, countdown, actions, bottom nav |
| `390 × 844` | Portrait | Primary mobile journey and safe areas |
| `844 × 390` | Landscape | Height constraints, video, dialogs |
| `768 × 1024` | Portrait | Tablet stacking and map disclosure |
| `1024 × 768` | Landscape | Tablet/desktop transition |
| `1440 × 900` | Landscape | Full navigation, hero/map split, status bar |

For each relevant viewport:

- visit `/`, `/watch`, `/history`, and one `/launch/[id]`;
- test no-live-stream and unavailable-provider states;
- open and close filters, briefing drawer, calendar menu, and expanded map;
- navigate by keyboard only;
- enable reduced motion;
- simulate offline navigation;
- check for horizontal overflow with long mission names;
- confirm Home, Watch, and History remain reachable.

## Related Files

- [`app/page.tsx`](app/page.tsx)
- [`app/watch/page.tsx`](app/watch/page.tsx)
- [`app/history/page.tsx`](app/history/page.tsx)
- [`app/launch/[id]/page.tsx`](<app/launch/[id]/page.tsx>)
- [`components/LaunchList.tsx`](components/LaunchList.tsx)
- [`components/PastLaunches.tsx`](components/PastLaunches.tsx)
- [`components/LaunchMap.tsx`](components/LaunchMap.tsx)
- [`components/layout/MobileNav.tsx`](components/layout/MobileNav.tsx)
- [`app/globals.css`](app/globals.css)
- [`public/manifest.json`](public/manifest.json)
- [`public/sw.js`](public/sw.js)
