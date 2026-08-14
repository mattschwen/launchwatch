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
- Activating the already-current primary route resets its transient filters or
  mission selection and returns the viewport to the top without animated
  travel. Clean routes do not create redundant browser-history entries, while
  filtered routes retain Back and Forward recovery.
- Desktop keeps a 44-pixel system bar below page content with the current feed
  condition and a persistent link to the live or next mission. If a refresh
  fails after a successful load or the API serves a stale fallback, the link
  remains available as an amber last-known mission; retained live state is
  labeled unconfirmed instead of presented as current coverage. Short landscape
  viewports keep the equivalent feed condition and UTC readout in the top
  navigation, and release the duplicate bottom bar so it cannot cover primary
  mission telemetry.
- Mobile uses a safe-area-aware fixed bottom navigation with the same three destinations.
- Short phone-landscape viewports move those same three destinations into the
  otherwise unused header and remove the duplicate bottom overlay, preserving
  44-pixel controls while giving mission content the full constrained height.
  On first visit, the compact brand emblem yields its wordmark to keep every
  route command visible beside the temporary synchronization status instead of
  hiding navigation until that status clears.
  At the narrowest landscape boundary, the auxiliary clock yields before route
  labels or controls can clip.
- Route content hands off directly to the footer instead of reserving a second
  fixed-navigation gap. The footer owns the bottom-navigation and safe-area
  clearance, so its final controls remain visible without adding an empty band
  between mission content and source status.
- Mission details keep the originating Home, Watch, or History destination
  visibly and semantically current; direct canonical detail links default to
  Home context.
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
- A connection loss immediately changes retained mission data to the amber
  offline state, removes live claims, and labels refresh actions as unavailable
  until reconnecting. The mission schedule and archive remain readable instead
  of being replaced by an avoidable error state.
- The visual feed-health readout is a 44-pixel shortcut to the footer's
  provider breakdown. It moves focus with the viewport without motion and
  keeps source provenance reachable from long routes.
- At enlarged text sizes, the sticky header treats recognizable branding and
  the feed-health shortcut as its essential controls. The redundant live
  shortcut and UTC clock yield first; at the 320px / 200%-text boundary, the
  complete wordmark becomes the branded emblem while its full accessible name
  remains. Live state stays named in the fixed Watch destination.
- The desktop mission ticker preserves provider date precision: minute- and
  hour-level targets keep quietly ticking at the available granularity without
  repeating the primary countdown animation, while day-and-coarser targets
  remain stable estimates. Its compact `T−` shorthand stays visual; assistive
  technology receives the complete duration with correctly singular or plural
  units.
- Live state may add an indicator to Watch but must not change the navigation order.

## Home

- The featured mission uses fluid type and keeps its primary mission actions
  ahead of secondary imagery in a single-column hierarchy on narrow screens.
- At the supported 320-pixel boundary, the featured mission uses a 16-pixel
  inset so telemetry words remain whole without shrinking the established type
  scale; wider mobile layouts retain the standard 20-pixel inset.
- On compact mobile viewports up to 430 × 760, featured mission actions precede
  the telemetry grid so both 44-pixel controls remain fully available above the
  fixed primary navigation.
- Countdown values wrap without horizontal overflow.
- The compact featured readiness badge keeps probability first while naming
  provider-reported hold and weather categories on the same short line. It
  preserves the schedule-first hero height at narrow breakpoints, while the
  exact constraint wording remains available in the briefing and accessible
  name.
- Provider minute/hour targets retain a live amber countdown that visibly ticks
  every second toward the approximate provider target; the `≈T−` prefix and
  estimate note preserve the source precision. Day/month/quarter/year targets
  remain stable amber estimates. Calendar export and launch alerts remain
  visibly pending until the provider confirms a minute-level target. The
  pending control remains keyboard-focusable and exposes its precision-aware
  explanation on focus or hover without opening calendar actions.
- Validated provider launch windows keep the UTC range authoritative and add a
  compact duration cue plus a hydration-safe inline switch between the viewer
  and launch-site start/end ranges without adding a row to the primary mission
  summary. Equivalent ranges collapse, and midnight crossings name both dates
  instead of one day.
- Calendar-specific featured targets and schedule rows prefix the UTC date with
  a short weekday; week, month, quarter, and broader estimates remain unchanged.
- When two calendar-ready provider windows overlap, the schedule surfaces the
  nearest shared UTC interval before the result rows. The signal wraps long
  mission names without widening the page, follows active result filters, and
  identifies partial or retained data instead of presenting it as a complete
  current planning picture.
- Mission metadata adapts from multiple columns to stacked groups and wraps
  complete provider-supplied values instead of clipping them with ellipses.
- Upcoming missions render as compact responsive rows while keeping the full
  UTC date, mission, provider, vehicle, launch-site telemetry, and operational
  status readable at every viewport width instead of hiding or clipping
  provider-supplied values. At phone widths, each row gives timing a full-width
  first scan line, then aligns mission identity with its operational status;
  enlarged text reflows those regions into a single column.
- A touch-safe `Calendar-ready only` checkbox isolates exact or minute targets
  without conflating target precision with provider status. Its active state is
  represented in the filter count and URL, survives detail return navigation,
  and reflows with the existing filter grid at phone and desktop widths.
- The labeled planning-horizon control can reduce a dense feed to the next
  seven days of day-or-better provider targets. Month and broader placeholders
  stay out of that near-term claim, while active missions remain visible; the
  selection shares the same URL, filter-count, reset, and return behavior.
- Large mission queues report the visible and total result count, then reveal
  five more rows per touch-safe command instead of mounting the full provider
  schedule at once. The batch rail keeps a direct return to schedule filters;
  it opens the controls, focuses search, and scrolls that focus clear of fixed
  navigation after long mission queues have been revealed.
- Filters are collapsed until requested. Once open, every control keeps a
  visible category label as values change, and the reset action uses text as
  well as an icon so its purpose remains clear on narrow screens.
- Schedule search enforces the same 120-character boundary as its canonical
  URL state, preventing a visible filter from diverging from reload, share, or
  mission-return context. Whitespace-only search stays inactive across the
  result count, URL, active-filter badge, and clear action.
- Schedule and archive search cover the complete provider-backed mission
  profile—including description, program, orbit, vehicle, site, provider, and
  status—and allow terms to match across those fields.
- Entered schedule and archive queries replace the desktop shortcut badge with
  a 44-pixel inline clear command at every width. Clearing restores search
  focus and preserves provider, status, year, outcome, and sort selections.
- When filters are active, the schedule disclosure keeps their total visibly
  counted while open or collapsed and includes that count in its accessible
  name, so hidden constraints never look like an unfiltered queue.
- If a refresh fails after missions have loaded, the featured mission and
  schedule switch to the amber retained-data treatment, identify their records
  as last-known, and keep a touch-safe retry action available without discarding
  the usable schedule. A retained live state is labeled coverage unconfirmed
  instead of continuing to claim that the mission is live now.
- Schedule recovery holds its pending keyboard-focus handoff through
  enrichment rerenders, so the restored mission or schedule command receives
  focus only after its final frame is available.
- A successful response containing any incomplete mission record is treated as
  a failed refresh, preserving the complete last-known schedule rather than
  replacing it with a partial or unusable mission collection.
- A restored provider filter stays visibly selected and is labeled as absent
  when that provider is no longer represented in the current or partial feed.
- Active schedule filters travel through mission details as bounded return
  context, then reopen with the same visible result set.
- A schedule detail return reveals the progressive batch containing the
  selected mission, scrolls it clear of persistent chrome, and returns keyboard
  focus to its link.
- Global Home commands clear same-route schedule filters and restore the full
  mission queue, commit the clean URL before the client state changes, and
  leave browser Back and Forward navigation able to recover the prior filtered
  context without waiting for a server route transition.
- The featured mission keeps its optional licensed vehicle or mission visual
  behind a touch-safe disclosure after the schedule and mobile trajectory
  disclosure. Opening it must preserve the caption and full-image action
  without widening the page; the image itself should not load before
  disclosure.
- At the 320-pixel / 200%-text boundary, the mobile trajectory and optional
  visual disclosures give their full row to readable labels; their decorative
  icons yield before words fragment into narrow letter columns. Normal phone
  and desktop disclosure styling remains unchanged.
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

- The sticky five-destination console index stays a single, compact row at
  normal phone sizes. When enlarged text makes that internal rail scrollable,
  it reports the fully visible range and exposes contained 44-pixel previous
  and next controls while retaining swipe and arrow-key navigation. The extra
  chrome remains absent when every destination already fits.
- Video preserves its aspect ratio without forcing horizontal overflow.
- If a refresh fails after Watch has loaded missions, the room keeps the
  last-known queue and coverage link available but replaces every live claim,
  pulse, and autoplay treatment with an amber unconfirmed state. The retained
  notice exposes a touch-safe retry, holds its focus while retrying, and moves
  focus to the recovered mission when the feed is current again.
- When no verified stream is available, the route presents the next mission,
  countdown, provider fallback, and one eligible mission visual instead of an
  empty stage. A verified stream remains the primary visual.
- Once canonical mission details finish loading without a verified stream, the
  standby stage names that checked state explicitly instead of continuing to
  imply that provider details are still being updated. Loading and failed
  checks retain their distinct progress and recovery messages.
- A stream newly announced by the current shared feed stays on the coverage
  stage when an older canonical detail snapshot settles; enrichment must not
  regress Watch to standby or replace the current provider handoff.
- At the supported 320-pixel boundary, the standby console removes decorative
  bulk and stacks long mission names above the compact countdown so both remain
  readable, touch-safe, and fully above fixed navigation; wider mobile and
  desktop stages retain the established media-scale composition.
- The coverage stage owns Watch's single primary stream or provider action;
  the selected-mission summary keeps briefing and calendar tools without a
  redundant self-link or duplicate fallback.
- Scheduled provider coverage and completed replays keep the cyan secondary
  signal treatment. Magenta live framing and actions are reserved for a
  provider-confirmed active broadcast.
- Scheduled provider coverage exposes its exact UTC and local start time plus
  its offset from the provider launch target above the media surface on Watch
  and mission detail. The timing strip wraps without displacing the primary
  stream action or implying that coverage is already live.
- The mission queue follows primary coverage on smaller screens, ahead of the
  selected mission briefing and secondary vehicle imagery, so switching missions
  does not require traversing details for the current selection. It becomes a side
  rail on larger screens. Long queues use a bounded four-row-height viewport on
  smaller screens with a visible count and scroll cue. Mission, timing, and
  provider identities wrap instead of disappearing behind ellipses, while ten
  queued missions remain keyboard and touch reachable without pushing coverage
  intelligence down another viewport. The rail is labeled as a mission queue—not
  a list of missions after the current selection—and marks the active item with a
  persistent `On console` cue in addition to its selected surface. When the
  provider returns more missions, the rail reports the visible and total counts
  and exposes a 44-pixel path that lands directly on the batched full schedule
  without implying every provider record will mount at once.
- On larger screens, the mission queue and its optional licensed vehicle reference
  share one bounded side rail so secondary context does not create an empty grid
  column or expand ahead of mission intelligence. Their mobile document order
  remains coverage, queue, summary, then visual.
- When no reusable Watch visual is available, the side rail keeps an honest
  touch-safe disclosure instead of expanding a non-actionable placeholder.
  Opening it reveals the full rights, missing-source, loading, or degraded state;
  an eligible visual still remains visible when it is the primary no-stream
  fallback. That visible fallback receives eager, high-priority image loading
  as prominent Watch media; verified-stream imagery remains lazy and unmounted
  behind its disclosure.
- The bounded queue is one page Tab stop. Up and Down select adjacent missions,
  Home and End jump to its boundaries, and only the selected mission remains in
  the Tab order while every item stays directly touch and pointer operable. A
  deep-linked selection outside the first ten missions replaces the final bounded
  row and is revealed inside the rail without moving focus or scrolling the page
  away from its primary coverage context. A visible, announced handoff identifies
  the omitted range and the selected mission's true provider-feed position, so the
  compact rail never implies those nonadjacent missions are consecutive.
- Touch and pointer selection on narrow layouts returns the viewport to the
  updated mission console so the new coverage and summary are immediately
  visible. Keyboard selection retains queue focus and keeps the queue in view
  for efficient arrow-key browsing.
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
  mobile command state stays compact instead of reserving an unloaded map-sized
  skeleton, while wider screens retain the larger preload preview. Pointer
  scrolling can preload the map, but once keyboard navigation begins the
  command state remains mounted so its load action cannot disappear or shift a
  later focus target offscreen. Both paths reach the same interactive controls.
- Mission selection updates the canonical `?id=` URL without a full navigation.
- Activating the already-current Watch command returns to the live-or-next
  default mission and a clean `/watch` URL; Back and Forward restore the prior
  mission selection without remounting the Watch room.
- Pointer clicks and keyboard activation add the canonical mission selection to
  browser history, so Back and Forward restore missions compared in Watch.
  Directional-key roving still synchronizes the same-document URL immediately
  but replaces the current entry, avoiding a history step for every arrow key.
- Mission selection also closes any open calendar options before the new
  mission commands become active, so a transient action cannot silently switch
  from one canonical launch to another while queue focus stays in place.
- Browser and history context follow the selected mission as well: Watch uses a
  route-specific title while data is resolving, then names the active mission
  without leaking the transient selection query into its canonical URL or
  allowing route metadata to overwrite a completed client-side selection.
- The selected mission exposes a labeled, 44px share action. It prefers the
  platform share sheet and otherwise copies the canonical detail URL, with
  a visible, selectable canonical detail URL when both browser paths are
  unavailable. Recovery must never tell users to copy the Watch address,
  which carries transient room state instead of the durable mission route.
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
- Tablet layouts keep the complete top navigation while deferring the redundant
  fixed status rail until the `lg` mission-control layout, so mission commands
  and queue rows retain the full viewport height without bottom-chrome overlap.
- Intelligence rate limits expose the provider recovery window directly on the
  retry command, keep it unavailable until that window opens, and preserve
  keyboard focus when coverage is restored.

## History

- Initial archive synchronization exposes a visible section heading, truthful
  provider-acquisition copy, and a named busy region while decorative result
  placeholders stay out of the accessibility tree.
- An expanded mission with no verified replay keeps that state explicit and
  offers a 44-pixel mission-specific replay search. If a retry reaches this
  final state, keyboard focus follows the changing recovery control to the
  search handoff instead of falling back to the document.
- Search stays immediately available on narrow screens while secondary
  provider/year/outcome and chronology controls use a touch-safe disclosure.
  The disclosure keeps its visible `Filters` label at the supported 320-pixel
  boundary, so the archive never relies on a funnel glyph alone to reveal its
  hidden controls.
- Below 360px, the archive masthead keeps its route identity and title but
  yields descriptive and repeated source copy to the search-and-results
  workflow, placing the first recovered mission above fixed navigation.
  Active secondary controls reopen from URL return context and remain visibly
  counted.
- Search, provider, launch year, outcome, and chronology retain visible field labels as
  values change, so restored or shared archive filters remain self-identifying.
- Past-window records without a terminal provider result use an amber
  `Outcome unconfirmed` label and can be isolated with the URL-persistent
  Unconfirmed outcome filter; the complete label wraps in compact rows instead
  of being ellipsized, and never inherits the green success treatment.
- Chronology reverses only the current bounded archive response, explicitly
  offering newest-first or oldest-first scanning without implying access beyond
  the labeled feed window. It survives mission-detail return navigation.
- An archive detail return restores the progressive batch containing the
  selected mission and returns keyboard focus to its View mission action.
- Activating the already-current History command resets archive filters and
  results together, while Back and Forward restore the prior URL-bound context.
- The archive exposes a labeled clear action only while filters are active, so
  its compact result toolbar never presents a disabled icon-only dead end.
- Settled archive results keep a labeled, touch-safe refresh action at every
  width. Refreshing preserves the current records and keyboard focus; a failed
  request identifies them as retained until a later refresh recovers.
- Partial-provider guidance remains informational and points to that persistent
  refresh action instead of adding a duplicate recovery command or keyboard stop.
- Each archive row keeps the complete mission and provider identity readable,
  wrapping long provider-supplied names instead of hiding them behind
  ellipses, before exposing secondary metadata and the View Mission action.
  The repeated visible action stays compact while its accessible name includes
  the corresponding mission, keeping screen-reader link lists clear.
- At 1120 pixels and wider, the archive switches to its labeled six-column
  mission table so laptop-sized workspaces can scan dates, vehicles, sites,
  and outcomes without retaining the taller compact-card treatment. Its
  primary View Mission action stays on one line inside the fixed action column.
- Vehicle and launch-site telemetry also wraps within its responsive grid so
  compact rows never silently remove the identifying end of a provider value.
- Expanded summaries remain in normal document flow.
- Archive results reveal ten missions at a time, keeping the initial scan and
  footer reachable while a focus-stable command progressively loads older
  records.
- Licensed imagery loads only inside an expanded row so the collapsed archive
  remains compact and scan-efficient.
- When a compact archive record omits replay coverage, expansion checks only
  that canonical mission detail and keeps a 44-pixel checking, retry, or
  confirmed-replay control in the row without inflating the archive feed.
- A failed replay check keeps its provider explanation visible in the amber
  caution treatment and restores keyboard focus to the retry action when a
  subsequent verification attempt also fails.
- Replay and detail links use canonical provider-qualified IDs.
- Every detail link retains History as its originating surface. Active archive
  filters travel only as bounded return context, so the explicit return action
  restores the same filtered result set without accepting an arbitrary
  destination.
- Restored provider filters remain visible and explicitly identify providers
  that are absent from the current archive response.
- Empty, error, stale, and retry states must fit without overflow.

## Mission Detail

- Provider description placeholders such as `Details TBD.` normalize to a
  truthful pending state in the mission hero and briefing instead of appearing
  as substantive mission copy or page metadata.
- Long names wrap as phrases within the available width.
- The status, title, target time, and mission actions lead the detail hierarchy
  before provider narrative and telemetry. At the 320px reflow boundary, the
  primary action remains fully above persistent navigation even when the
  provider supplies a multi-paragraph mission description.
- At the desktop split-layout boundary, every T-minus cell remains fully contained
  inside the telemetry card; the visual scale adapts to the narrower side rail
  without shrinking the mobile countdown or clipping digits and unit labels.
- At the 320px reflow boundary, countdown cells reduce only their horizontal
  inset so every digit and unit label remains complete without shrinking type.
- Upcoming mission actions form a stable two-by-two command console on narrow
  screens instead of wrapping into uneven single-control rows. The calendar
  menu opens above its trigger and stays clear of persistent navigation.
- Live and upcoming mission telemetry appears before licensed imagery so the
  active state or countdown remains above secondary media on narrow screens.
  Completed missions retain their visual-first summary. When image rights
  cannot be verified, the layout presents a compact, honest unavailable state
  in the same stable visual footprint.
- Primary and secondary actions remain labeled; icon-only controls require accessible names.
- Sharing always targets the canonical mission URL without transient Watch,
  schedule, or archive return context; completed missions retain the same
  share path after future-only actions are removed.
- Timeline events use compact `T−`/`T+` mission offsets and scroll within
  their own region when necessary. Touch-safe previous/next controls expose
  one-event movement without replacing direct scrolling or arrow-key access.
  A responsive live readout reports the substantially visible event range and
  total after button, keyboard, touch, or resized-viewport movement.
  Unavailable boundary directions leave the sequential tab order while keeping
  truthful disabled semantics. A control already in use retains focus when it
  reaches the first or final event, then leaves the next Tab press for a usable
  destination. Mission-map zoom controls follow the same boundary behavior.
- Video and intelligence sections become a single column.
- Every canonical detail renders exactly one selected-mission trajectory before
  timeline and intelligence support. Its map bundle loads only as the stable,
  named trajectory panel approaches the viewport; the pending panel preserves
  section-index focus, responsive height, and honest loading semantics.
- The launch-site atlas uses zero-minimum grid tracks so provider facts cannot
  widen a narrow detail panel. At the 320px / 200%-text boundary, its five map
  controls wrap into complete touch targets and pad-search rows truncate only
  their mission labels while preserving distance context and keyboard access.
- Rate-limited mission intelligence remains in an honest standby state until
  its panel approaches the viewport, then begins acquisition early enough to
  resolve before the user reaches its coverage actions.
- Completed missions return to History—or the filtered archive that opened
  them—and omit future-only calendar actions. Active archive filters remain in
  the address so a filtered result set survives reloads and can be shared.
- History labels its responsive date field as provider-reported rather than
  implying that the normalized provider target is verified liftoff telemetry.
- Missing or malformed mission links explain that a flight may be upcoming or
  completed and expose touch-safe recovery paths to both the current schedule
  and searchable archive.

## Touch and Keyboard Requirements

- Minimum interactive target: 44 by 44 CSS pixels.
- Keep fixed navigation clear of `env(safe-area-inset-bottom)`.
- Keep the persistent primary navigation before main content in landmark and
  keyboard order even though its mobile presentation is visually fixed to the
  bottom edge. The brand must lead directly to Home, Watch, and History instead
  of forcing keyboard users through the full route and footer first.
- Keep focused main-content controls above persistent bottom chrome when the
  browser scrolls them into view; this applies to the mobile navigation and
  desktop mission status bar. When a service-worker update is ready, measure
  its responsive card and temporarily add that dynamic clearance as well.
- A waiting service-worker update keeps Update now as the primary action and
  offers a touch-safe Later action. Postponing removes the card and restores the
  interrupted keyboard focus; the next visible online update check offers the
  same waiting version again without forcing a reload.
- Do not hide focus outlines.
- Keep the active navigation item available through `aria-current`.
- In forced-colors mode, keep current-route and `aria-pressed` selection state
  visible with system-color outlines instead of authored fills or shadows.
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
- Below `384px`, keep the footer feed status on its own line and pair the
  refresh and repository actions beneath it. This prevents the repository
  action from becoming a stranded third row while retaining 44-pixel targets.
- At widths below `360px`, prioritize readable live and degraded-feed labels in
  the mobile header and defer the UTC clock until the header has room for all
  three signals without horizontal overflow.
- Avoid dense all-uppercase labels for primary reading content.
- Preserve provider-supplied paragraphs and bullet lists in mission narratives;
  do not collapse structured briefing copy into one dense text block.
- The first-visit synchronization status is a compact dismissible header ribbon.
  It temporarily replaces redundant feed/clock instruments, never covers the
  page or changes header height, keeps its compact label readable at 320px,
  and returns keyboard focus to the active route when dismissed. With enlarged
  text, the ribbon shares the header with the compact brand emblem; dismissing
  it restores the complete wordmark and feed-health shortcut when they fit,
  or the accessible brand emblem plus feed shortcut at the 320px boundary.

## PWA and Offline Behavior

- Installed mode uses the same responsive layouts and supports both orientations.
- API responses and navigations are not served from a service-worker cache.
- Offline cross-route navigation displays the static offline document. Links
  that remain on the loaded route preserve its retained mission state.
- A loaded shell reacts to connection loss immediately, retains its last-known
  schedule and archive, and resumes eligible refresh work after reconnecting.
- A newly available worker is applied explicitly before reloading into a new shell.
- Bottom navigation and safe-area spacing remain correct in standalone mode.
- Browsers that emit `beforeinstallprompt` expose a compact footer install
  action. The action defers to the native installer, disappears after dismissal,
  and stays hidden when LaunchWatch is already running in standalone mode.

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
- [`components/MissionDescription.tsx`](components/MissionDescription.tsx)
- [`components/ShareMissionButton.tsx`](components/ShareMissionButton.tsx)
- [`components/layout/MobileNav.tsx`](components/layout/MobileNav.tsx)
- [`app/globals.css`](app/globals.css)
- [`public/manifest.json`](public/manifest.json)
- [`public/sw.js`](public/sw.js)
