'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ExternalLink, Info, Maximize2, X } from 'lucide-react';
import ExternalLinkHint from '@/components/ui/ExternalLinkHint';
import LaunchSiteAtlas from '@/components/mission-map/LaunchSiteAtlas';
import MissionMapCanvas, { type MissionMapSelection } from '@/components/mission-map/MissionMapCanvas';
import MissionPhaseRail, { formatLaunchCoordinates } from '@/components/mission-map/MissionPhaseRail';
import { isCriticalLaunchStatusName, isMeaningfulLaunchValue } from '@/lib/format';
import { MAP_HEIGHT, MAP_WIDTH, type MapViewport } from '@/lib/map-geometry';
import { buildReportedSiteMapUrl } from '@/lib/site-map';
import { buildIllustrativeTrajectory, TRAJECTORY_DISCLOSURE } from '@/lib/trajectory';
import type { Launch } from '@/lib/types';

interface MissionTrajectoryProps {
  className?: string;
  embedded?: boolean;
  launch: Launch | null;
  onReady?: () => void;
  sectionId?: string;
  variant?: 'compact' | 'detail';
}

const ATLAS_DISCLOSURE = 'Pad locations, descriptions, imagery, and launch counts are supplied by Launch Library 2. The open base map is rendered with Leaflet and OpenStreetMap contributor data.';

function statusTone(launch: Launch): string {
  if (launch.status === 'live') return 'text-[var(--console-magenta)]';
  if (launch.status === 'failure' || isCriticalLaunchStatusName(launch.statusName)) return 'text-[var(--console-red)]';
  if (launch.status === 'tbd') return 'text-[var(--console-amber)]';
  return 'text-[var(--console-green)]';
}

function CompactFacts({ launch }: { launch: Launch | null }): React.ReactElement {
  const trajectory = launch ? buildIllustrativeTrajectory(launch) : null;
  const reportedSiteMapUrl = buildReportedSiteMapUrl(launch?.location);
  const facts = launch && trajectory ? [
    {
      label: 'Status',
      value: isMeaningfulLaunchValue(launch.statusName) ? launch.statusName.trim() : launch.status === 'success' ? 'Successful' : launch.status === 'failure' ? 'Unsuccessful' : launch.status === 'live' ? 'Live' : launch.status === 'tbd' ? 'To be determined' : 'Upcoming',
      className: statusTone(launch),
    },
    { label: 'Target orbit', value: trajectory.orbitAvailable ? trajectory.orbitLabel : 'Not supplied', className: trajectory.orbitAvailable ? 'text-[var(--text-primary)]' : 'text-[var(--console-amber)]' },
    { label: 'Reported site', value: trajectory.siteLabel, className: 'text-[var(--text-primary)]' },
    { label: 'Coordinates', value: formatLaunchCoordinates(launch), className: launch.location ? 'text-[var(--text-primary)]' : 'text-[var(--console-amber)]', href: reportedSiteMapUrl },
  ] : [
    { label: 'Status', value: 'No mission', className: '' },
    { label: 'Target orbit', value: '—', className: '' },
    { label: 'Reported site', value: '—', className: '' },
    { label: 'Coordinates', value: '—', className: '' },
  ];

  return (
    <dl className="grid grid-cols-2 border-t border-[var(--border-subtle)] sm:grid-cols-4">
      {facts.map((item, index) => (
        <div key={item.label} className={`min-w-0 px-3 py-2.5 ${index % 2 ? 'border-l border-[var(--border-subtle)]' : ''} ${index >= 2 ? 'border-t border-[var(--border-subtle)] sm:border-t-0' : ''} ${index > 0 ? 'sm:border-l sm:border-[var(--border-subtle)]' : ''}`}>
          <dt className="font-mono text-[9px] font-semibold uppercase tracking-[0.11em] text-[var(--text-muted)]">{item.label}</dt>
          <dd className={`mt-1 break-words text-[11px] font-semibold leading-4 ${item.className}`}>
            {'href' in item && item.href ? (
              <a href={item.href} target="_blank" rel="noopener noreferrer" title="Open reported launch site in OpenStreetMap" className="-my-2 inline-flex min-h-11 max-w-full items-center gap-1.5 text-[var(--console-cyan)] transition-colors hover:text-[var(--text-primary)]">
                <span>{item.value}</span><ExternalLink aria-hidden="true" className="shrink-0" size={12} /><ExternalLinkHint />
              </a>
            ) : item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function TrajectoryDisclosure({
  launch,
}: {
  launch: Launch | null;
}): React.ReactElement {
  return (
    <div className="flex flex-col border-t border-[var(--border-subtle)] px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5">
      <p className="flex items-start gap-2 text-[10px] leading-relaxed text-[var(--text-muted)] sm:text-[11px]">
        <Info
          aria-hidden="true"
          className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--console-cyan)]"
        />
        {TRAJECTORY_DISCLOSURE}
      </p>
      {launch?.trajectorySimulationUrl ? (
        <a
          href={launch.trajectorySimulationUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-flex min-h-11 shrink-0 items-center gap-1.5 self-start font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--console-cyan)] transition-colors hover:text-[var(--text-primary)] sm:-my-2 sm:mt-0 sm:self-center"
        >
          FlightClub simulation
          <ExternalLink aria-hidden="true" size={13} />
          <ExternalLinkHint />
        </a>
      ) : null}
    </div>
  );
}

export default function MissionTrajectory({
  className = '',
  embedded = false,
  launch,
  onReady,
  sectionId,
  variant = 'compact',
}: MissionTrajectoryProps): React.ReactElement {
  const Root = embedded ? 'div' : 'section';
  const rawId = useId().replaceAll(':', '');
  const sectionTitleId = `${rawId}-mission-map-title`;
  const dialogTitleId = `${rawId}-atlas-dialog-title`;
  const dialogDescriptionId = `${rawId}-atlas-dialog-description`;
  const [expanded, setExpanded] = useState(false);
  const [activeSelection, setActiveSelection] = useState<MissionMapSelection>(null);
  const expandButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const trajectory = useMemo(() => launch ? buildIllustrativeTrajectory(launch) : null, [launch]);
  const viewport: MapViewport = trajectory?.focusViewport || {
    x: 0,
    y: 0,
    width: MAP_WIDTH,
    height: MAP_HEIGHT,
    zoom: 1,
  };

  useEffect(() => onReady?.(), [onReady]);

  const openExpanded = useCallback(() => {
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setExpanded(true);
  }, []);
  const closeExpanded = useCallback(() => setExpanded(false), []);

  useEffect(() => {
    if (!expanded) return;
    const previousOverflow = document.body.style.overflow;
    const previousFocus = previousFocusRef.current;
    const expandButton = expandButtonRef.current;
    const backgroundElements = [...document.body.querySelectorAll<HTMLElement>(':scope > :not([data-mission-map-dialog])')].filter((element) => !['LINK', 'SCRIPT', 'STYLE'].includes(element.tagName));
    const backgroundState = backgroundElements.map((element) => ({ element, ariaHidden: element.getAttribute('aria-hidden'), inert: element.inert }));
    backgroundElements.forEach((element) => { element.inert = true; element.setAttribute('aria-hidden', 'true'); });
    document.body.style.overflow = 'hidden';
    const frame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); closeExpanded(); return; }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])')];
      if (!focusable.length) return;
      if (event.shiftKey && document.activeElement === focusable[0]) { event.preventDefault(); focusable.at(-1)?.focus(); }
      else if (!event.shiftKey && document.activeElement === focusable.at(-1)) { event.preventDefault(); focusable[0].focus(); }
    };
    window.addEventListener('keydown', keydown);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('keydown', keydown);
      document.body.style.overflow = previousOverflow;
      backgroundState.forEach(({ element, ariaHidden, inert }) => { element.inert = inert; if (ariaHidden === null) element.removeAttribute('aria-hidden'); else element.setAttribute('aria-hidden', ariaHidden); });
      (expandButton || previousFocus)?.focus();
      previousFocusRef.current = null;
    };
  }, [closeExpanded, expanded]);

  const dialog = expanded && launch && typeof document !== 'undefined' ? createPortal(
    <div data-mission-map-dialog className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-black/80 p-3 backdrop-blur-sm sm:p-5" onMouseDown={(event) => { if (event.currentTarget === event.target) closeExpanded(); }}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={dialogTitleId} aria-describedby={dialogDescriptionId} className="surface-card holo-card signal-cold flex h-[min(94svh,64rem)] min-h-[24rem] w-full max-w-[96rem] flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-strong)] bg-[var(--surface-base)] shadow-[var(--shadow-elevated)]">
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-[var(--border-subtle)] px-4 py-3 sm:px-5">
          <div className="min-w-0"><p className="console-label">Full mission map</p><h2 id={dialogTitleId} className="mt-1 break-words text-lg font-bold leading-snug text-[var(--text-primary)] sm:text-xl">{launch.name}</h2><p id={dialogDescriptionId} className="mt-1 text-xs text-[var(--text-muted)]">Keep the modeled ascent in view while you zoom from the launch region to individual pads.</p></div>
          <button ref={closeButtonRef} type="button" className="icon-button shrink-0" aria-label="Close launch site atlas" onClick={closeExpanded}><X aria-hidden="true" className="h-5 w-5" /></button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto lg:overflow-hidden"><LaunchSiteAtlas launch={launch} trajectory={trajectory!} expanded /></div>
        <p className="flex shrink-0 items-start gap-2 border-t border-[var(--border-subtle)] px-4 py-2.5 text-[10px] leading-relaxed text-[var(--text-muted)] sm:px-5 sm:text-[11px]"><Info aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--console-cyan)]" />{ATLAS_DISCLOSURE}</p>
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <>
      <Root id={embedded ? undefined : sectionId} tabIndex={!embedded && sectionId ? -1 : undefined} aria-labelledby={embedded ? undefined : sectionTitleId} className={`surface-card holo-card signal-cold flex min-h-0 flex-col overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--console-cyan)] ${variant === 'detail' ? 'min-h-[48rem]' : 'lg:h-full lg:min-h-[27.5rem]'} ${className}`} data-mission-map-variant={variant}>
        <header className="flex items-center justify-between gap-4 border-b border-[var(--border-subtle)] px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2"><h2 id={sectionTitleId} className="font-mono text-xs font-bold uppercase tracking-[0.13em] text-[var(--text-secondary)]">Mission trajectory</h2><span className="rounded border border-[rgba(88,200,232,0.3)] bg-[rgba(88,200,232,0.08)] px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.09em] text-[var(--console-cyan)]">Illustrative model</span>{variant === 'detail' ? <span className="rounded border border-[rgba(94,230,168,0.3)] bg-[rgba(94,230,168,0.08)] px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.09em] text-[var(--console-green)]">Open pad atlas</span> : null}</div>
            <p className="mt-1 truncate text-xs text-[var(--text-muted)]">{launch?.name || 'No mission selected'}</p>
          </div>
          <button ref={expandButtonRef} type="button" className="action-button action-button-quiet min-h-11 min-w-11 shrink-0 px-2.5 text-xs" onClick={openExpanded} disabled={!launch} aria-label="Enlarge launch site atlas"><span className="hidden sm:inline">Explore full screen</span><Maximize2 aria-hidden="true" className="h-4 w-4" /></button>
        </header>

        {variant === 'detail' && launch && trajectory ? (
          <div className="grid min-h-0">
            <section aria-labelledby={`${sectionTitleId}-flight-path`} className="border-b border-[var(--border-strong)] bg-[var(--surface-sunken)]">
              <div className="border-b border-[var(--border-subtle)] px-4 py-3 sm:px-5">
                <p className="console-label">Animated flight path</p>
                <h3 id={`${sectionTitleId}-flight-path`} className="mt-1 text-base font-bold text-[var(--text-primary)]">Stage-by-stage mission model</h3>
                <p className="mt-1 text-xs text-[var(--text-muted)]">Choose a stage to inspect its animated path, timing, altitude, and downrange context.</p>
              </div>
              <MissionMapCanvas activeSelection={activeSelection} launch={launch} trajectory={trajectory} variant="detail" viewMode="focus" viewport={viewport} />
              <MissionPhaseRail activeSelection={activeSelection} launch={launch} onSelect={setActiveSelection} trajectory={trajectory} />
              <TrajectoryDisclosure launch={launch} />
            </section>
            <section aria-labelledby={`${sectionTitleId}-atlas`}>
              <div className="border-b border-[var(--border-subtle)] px-4 py-3 sm:px-5">
                <p className="console-label text-[var(--console-green)]">Launch complex field guide</p>
                <h3 id={`${sectionTitleId}-atlas`} className="mt-1 text-base font-bold text-[var(--text-primary)]">Launch site atlas</h3>
                <p className="mt-1 text-xs text-[var(--text-muted)]">Zoom closer to reveal every neighboring pad, then explore its photo, history, operators, and launch facts.</p>
              </div>
              <LaunchSiteAtlas launch={launch} trajectory={trajectory} />
              <p className="flex items-start gap-2 border-t border-[var(--border-subtle)] px-4 py-2.5 text-[10px] leading-relaxed text-[var(--text-muted)] sm:px-5 sm:text-[11px]"><Info aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--console-cyan)]" />{ATLAS_DISCLOSURE}</p>
            </section>
          </div>
        ) : (
          <>
            <MissionMapCanvas activeSelection={null} launch={launch} trajectory={trajectory} variant="compact" viewMode="focus" viewport={viewport} />
            <TrajectoryDisclosure launch={launch} />
          </>
        )}
        {variant === 'compact' ? <CompactFacts launch={launch} /> : null}
      </Root>
      {dialog}
    </>
  );
}
