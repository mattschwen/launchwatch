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
- Desktop keeps a 44-pixel system bar below page content with the current feed
  condition and a persistent link to the live or next mission. If a refresh
  fails after a successful load, the link remains available as an amber last-known
  mission; retained live state is labeled unconfirmed instead of presented as
  current coverage.
- Mobile uses a safe-area-aware fixed bottom navigation with the same three destinations.
- Server route transitions retain a visible route-level heading, truthful
  synchronization copy, and named mission-control status while application and
  provider data resolve; decorative loading geometry stays hidden from
  assistive technology.
- The external source-code link remains secondary and is not a primary mobile destination.
- The app shell includes a keyboard skip link that reveals above the sticky
  header, meets the 44-pixel target minimum, and lands main content below the
  header edge.
- Shared chrome reports synchronization, refresh, partial, stale, offline, and
  nominal feed health truthfully on every route. Narrow headers show a compact
  non-nominal status without displacing primary navigation. One persistent
  header live region announces feed-state transitions; repeated visual status
  readouts must not create duplicate assistive-technology announcements.
- The desktop mission ticker preserves provider date precision: minute- and
  hour-level targets keep quietly ticking at the available granularity without
  repeating the primary countdown animation, while day-and-coarser targets
  remain stable estimates.
- Live state may add an indicator to Watch but must not change the navigation order.

## Home

- The featured mission uses fluid type and keeps its primary mission actions
  ahead of secondary imagery in a single-column hierarchy on narrow screens.
- At the smallest short viewport, featured mission actions precede the telemetry
  grid so Watch and Briefing remain visible above the fixed primary navigation.
- Countdown values wrap without horizontal overflow.
- Provider minute/hour targets retain a live amber countdown that visibly ticks
  every second toward the approximate provider target; the `≈T−` prefix and
  estimate note preserve the source precision. Day/month/quarter/year targets
  remain stable amber estimates. Calendar export and launch alerts remain
  visibly pending until the provider confirms a minute-level target. The
  pending control remains keyboard-focusable and exposes its precision-aware
  explanation on focus or hover without opening calendar actions.
- Mission metadata adapts from multiple columns to stacked groups and wraps
  complete provider-supplied values instead of clipping them with ellipses.
- Upcoming missions render as compact responsive rows while keeping complete
  mission, provider, vehicle, and launch-site telemetry readable instead of
  clipping provider-supplied values.
- Filters are collapsed until requested. Once open, every control keeps a
  visible category label as values change, and the reset action uses text as
  well as an icon so its purpose remains clear on narrow screens.
- Active schedule filters travel through mission details as bounded return
  context, then reopen with the same visible result set.
- The featured mission keeps its optional licensed vehicle or mission visual
  behind a touch-safe disclosure after the schedule and mobile trajectory
  disclosure. Opening it must preserve the caption and full-image action
  without widening the page; the image itself should not load before
  disclosure.
- When the feed does not yet include official coverage, the featured mission
  holds the generic search fallback while canonical detail is checked. The
  loading action keeps its 44px footprint; a failed check labels the fallback
  as degraded instead of implying that coverage was verified.
- While richer detail metadata is requested, the same fixed visual footprint
  reports acquisition progress so content below it does not jump.
- The map appears beside the hero only at wide desktop widths.
- On smaller widths, the map is behind an explicit disclosure after the schedule.

The optional expanded map remains a modal dialog. It must:

- move focus to its Close Map control;
- trap focus while open;
- close with Escape and the labeled close control;
- restore focus to the expand control;
- show the complete mission title without ellipsis, wrapping long provider
  names while keeping the close control fixed and reachable;
- remain usable in portrait and landscape.

## Watch

- Video preserves its aspect ratio without forcing horizontal overflow.
- When no verified stream is available, the route presents the next mission,
  countdown, provider fallback, and one eligible mission visual instead of an
  empty stage. A verified stream remains the primary visual.
- The coverage stage owns Watch's single primary stream or provider action;
  the selected-mission summary keeps briefing and calendar tools without a
  redundant self-link or duplicate fallback.
- The mission queue follows the selected mission summary and actions on smaller
  screens, ahead of secondary vehicle imagery, and becomes a side rail on larger
  screens. Long queues use a bounded four-row-height viewport on smaller screens
  with a visible count and scroll cue. Mission, timing, and provider identities
  wrap instead of disappearing behind ellipses, while all ten queued missions
  remain keyboard and touch reachable without pushing coverage intelligence down
  another viewport.
- The selected mission trajectory follows the stage and queue, and uses the same
  disclosed illustrative model as mission detail. Stream and coverage
  intelligence appears before that illustrative telemetry so Watch keeps its
  primary coverage task ahead of secondary mission context.
- Coverage signal bars represent the presence of verified stream, news, and
  community records; they do not imply measured radio strength. A generic
  search fallback remains a clearly labeled action and never increments the
  stream-lead count or appears as an identified broadcast.
- Identified stream titles and channel names wrap completely inside the
  intelligence grid so provider identity is never hidden by clipping or an
  ellipsis.
- Failed mission-intelligence requests keep a stable, touch-safe recovery
  action, suppress duplicate retries, and move keyboard focus to the restored
  intelligence region after recovery.
- The secondary trajectory is deferred until it approaches the viewport. Its
  reserved surface preserves layout stability and exposes a keyboard-operable
  load action before the interactive map controls.
- Mission selection updates the canonical `?id=` URL without a full navigation.
- The selected mission exposes a labeled, 44px share action. It prefers the
  platform share sheet and otherwise copies the canonical detail URL, with
  visible recovery copy when both browser paths are unavailable.
- Briefing, calendar, and sharing form a labeled three-command rail on narrow
  screens instead of mixing text actions with an ambiguous icon-only control.
  Every target remains at least 44px, and the compact calendar menu opens above
  the rail so persistent mobile navigation cannot cover its options. When a
  provider time is still too coarse for calendar export, the pending explanation
  centers over its compact command and remains inside the viewport without
  widening the page or fixed navigation.
- Schedule recovery keeps its retry control focused while busy, suppresses duplicate requests, and moves focus to the restored mission.
- Initial synchronization keeps the real Watch heading and visible acquisition
  labels for coverage and the mission queue; loading geometry remains reserved
  and decorative placeholders stay hidden from assistive technology.

## History

- Initial archive synchronization exposes a visible section heading, truthful
  provider-acquisition copy, and a named busy region while decorative result
  placeholders stay out of the accessibility tree.
- Search stays immediately available on narrow screens while secondary
  provider/year/outcome filters use a touch-safe disclosure. Active secondary
  filters reopen from URL return context and remain visibly counted.
- Each archive row keeps the complete mission and provider identity readable,
  wrapping long provider-supplied names instead of hiding them behind
  ellipses, before exposing secondary metadata and the View Mission action.
- Vehicle and launch-site telemetry also wraps within its responsive grid so
  compact rows never silently remove the identifying end of a provider value.
- Expanded summaries remain in normal document flow.
- Licensed imagery loads only inside an expanded row so the collapsed archive
  remains compact and scan-efficient.
- Replay and detail links use canonical `spacex-*` IDs.
- Detail links carry only bounded active archive filters, so the explicit
  return action restores the same filtered result set without accepting an
  arbitrary destination.
- Empty, error, stale, and retry states must fit without overflow.

## Mission Detail

- Long names wrap as phrases within the available width.
- The status, title, description, actions, and telemetry summary stack on narrow screens.
- Upcoming mission actions form a stable two-by-two command console on narrow
  screens instead of wrapping into uneven single-control rows. The calendar
  menu opens above its trigger and stays clear of persistent navigation.
- One licensed vehicle or mission visual appears before the telemetry card and
  trajectory; when rights cannot be verified, the layout presents a compact,
  honest unavailable state in the same stable visual footprint.
- Primary and secondary actions remain labeled; icon-only controls require accessible names.
- Sharing always targets the canonical mission URL without transient Watch,
  schedule, or archive return context; completed missions retain the same
  share path after future-only actions are removed.
- Timeline events use compact `T−`/`T+` mission offsets and scroll within
  their own region when necessary. Touch-safe previous/next controls expose
  one-event movement without replacing direct scrolling or arrow-key access.
  Boundary controls remain focusable with truthful unavailable semantics so
  keyboard focus is not lost when the first or final event is reached.
- Video and intelligence sections become a single column.
- Every canonical detail renders exactly one selected-mission trajectory before
  timeline and intelligence support.
- Completed missions return to History—or the filtered archive that opened
  them—and omit future-only calendar actions. Active archive filters remain in
  the address so a filtered result set survives reloads and can be shared.
- Missing or malformed mission links explain that a flight may be upcoming or
  completed and expose touch-safe recovery paths to both the current schedule
  and searchable archive.

## Touch and Keyboard Requirements

- Minimum interactive target: 44 by 44 CSS pixels.
- Keep fixed navigation clear of `env(safe-area-inset-bottom)`.
- Keep focused main-content controls above persistent bottom chrome when the
  browser scrolls them into view; this applies to the mobile navigation and
  desktop mission status bar. When a service-worker update is ready, measure
  its responsive card and temporarily add that dynamic clearance as well.
- Do not hide focus outlines.
- Keep the active navigation item available through `aria-current`.
- Connect disclosures to controlled regions with `aria-expanded` and `aria-controls`.
- Give icon-only buttons an accessible name.
- Prevent background scrolling while modal drawers or the expanded map are open.
  Portal-backed modals must also make the application shell inert and hidden
  from assistive technology, expose only one close control, and restore the
  prior shell state and trigger focus when closed.

## Motion and Readability

- Respect `prefers-reduced-motion`.
- Trajectory drawing, telemetry flow, beacon pulses, and holographic sheen stop
  under reduced motion while their final visual state remains legible.
- Visual figures reserve the same viewport and caption footprint while rights
  metadata loads, then use a fixed image aspect ratio to avoid layout shifts.
  Their scanline/sheen treatment is decorative, low contrast, and disabled with
  reduced motion; image failures resolve to a readable amber state with a
  focus-safe retry that returns keyboard users to the recovered full-image
  action. Once acquisition resolves without an eligible visual, the terminal
  state replaces loading-control silhouettes with compact usage-policy copy.
- Avoid using animation as the only live-status cue.
- Pair every semantic signal with text: green for nominal, magenta for live
  coverage, red for critical/hold states, cyan for trajectory data, and amber
  for caution or incomplete data.
- Keep body text at a readable size and WCAG AA contrast.
- Repeat non-nominal feed health in the footer with the last successful refresh
  age so degraded data is never presented as a healthy live feed. Keep the
  footer status non-live and its ticking visual age out of the accessibility
  tree; assistive technology should hear each feed-state transition once, not
  a duplicate announcement or a new age every second.
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
- [`components/ShareMissionButton.tsx`](components/ShareMissionButton.tsx)
- [`components/layout/MobileNav.tsx`](components/layout/MobileNav.tsx)
- [`app/globals.css`](app/globals.css)
- [`public/manifest.json`](public/manifest.json)
- [`public/sw.js`](public/sw.js)
