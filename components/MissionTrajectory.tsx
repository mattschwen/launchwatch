'use client';

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import {
  Focus,
  Globe2,
  Info,
  Maximize2,
  Minus,
  Plus,
  RotateCcw,
  X,
} from 'lucide-react';
import MissionMapCanvas, {
  type MissionMapSelection,
} from '@/components/mission-map/MissionMapCanvas';
import MissionPhaseRail, {
  formatLaunchCoordinates,
} from '@/components/mission-map/MissionPhaseRail';
import { isMeaningfulLaunchValue } from '@/lib/format';
import {
  clamp,
  MAP_HEIGHT,
  MAP_WIDTH,
  type MapViewport,
} from '@/lib/map-geometry';
import {
  buildIllustrativeTrajectory,
  TRAJECTORY_DISCLOSURE,
  type IllustrativeTrajectory,
} from '@/lib/trajectory';
import type { Launch } from '@/lib/types';

interface MissionTrajectoryProps {
  className?: string;
  launch: Launch | null;
  variant?: 'compact' | 'detail';
}

type MapViewMode = 'focus' | 'world';

const WORLD_VIEWPORT: MapViewport = {
  x: 0,
  y: 0,
  width: MAP_WIDTH,
  height: MAP_HEIGHT,
  zoom: 1,
};

function zoomViewport(
  viewport: MapViewport,
  zoomLevel: number
): MapViewport {
  if (!zoomLevel) return viewport;

  const scale = Math.max(0.58, 1 - zoomLevel * 0.16);
  const width = viewport.width * scale;
  const height = viewport.height * scale;
  const centerX = viewport.x + viewport.width / 2;
  const centerY = viewport.y + viewport.height / 2;

  return {
    x: centerX - width / 2,
    y: clamp(centerY - height / 2, 0, MAP_HEIGHT - height),
    width,
    height,
    zoom: MAP_WIDTH / width,
  };
}

function statusTone(status: Launch['status']): string {
  if (status === 'live' || status === 'failure') {
    return 'text-[var(--console-red)]';
  }
  if (status === 'tbd') return 'text-[var(--console-amber)]';
  return 'text-[var(--console-green)]';
}

function CompactFacts({
  launch,
  trajectory,
}: {
  launch: Launch | null;
  trajectory: IllustrativeTrajectory | null;
}): React.ReactElement {
  const facts = launch && trajectory
    ? [
        {
          label: 'Status',
          value: isMeaningfulLaunchValue(launch.statusName)
            ? launch.statusName.trim()
            : launch.status === 'success'
              ? 'Successful'
              : launch.status === 'failure'
                ? 'Unsuccessful'
                : launch.status === 'live'
                  ? 'Live'
                  : launch.status === 'tbd'
                    ? 'To be determined'
                    : 'Upcoming',
          className: statusTone(launch.status),
        },
        {
          label: 'Target orbit',
          value: trajectory.orbitAvailable
            ? trajectory.orbitLabel
            : 'Not supplied',
          className: trajectory.orbitAvailable
            ? 'text-[var(--text-primary)]'
            : 'text-[var(--console-amber)]',
        },
        {
          label: 'Reported site',
          value: trajectory.siteLabel,
          className: 'text-[var(--text-primary)]',
        },
        {
          label: 'Coordinates',
          value: formatLaunchCoordinates(launch),
          className: launch.location
            ? 'text-[var(--text-primary)]'
            : 'text-[var(--console-amber)]',
        },
      ]
    : [
        { label: 'Status', value: 'No mission', className: '' },
        { label: 'Target orbit', value: '—', className: '' },
        { label: 'Reported site', value: '—', className: '' },
        { label: 'Coordinates', value: '—', className: '' },
      ];

  return (
    <dl className="grid grid-cols-2 border-t border-[var(--border-subtle)] sm:grid-cols-4">
      {facts.map((fact, index) => (
        <div
          key={fact.label}
          className={`min-w-0 px-3 py-2.5 ${
            index % 2 ? 'border-l border-[var(--border-subtle)]' : ''
          } ${index >= 2 ? 'border-t border-[var(--border-subtle)] sm:border-t-0' : ''} ${
            index > 0 ? 'sm:border-l sm:border-[var(--border-subtle)]' : ''
          }`}
        >
          <dt className="font-mono text-[9px] font-semibold uppercase tracking-[0.11em] text-[var(--text-muted)]">
            {fact.label}
          </dt>
          <dd
            className={`mt-1 break-words text-[11px] font-semibold leading-4 ${fact.className}`}
          >
            {fact.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

interface MapToolbarProps {
  canFocus: boolean;
  disabled: boolean;
  expandButtonRef?: React.RefObject<HTMLButtonElement | null>;
  onEnlarge: () => void;
  onReset: () => void;
  onViewMode: (mode: MapViewMode) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  viewMode: MapViewMode;
  zoomLevel: number;
  showEnlarge?: boolean;
}

function MapToolbar({
  canFocus,
  disabled,
  expandButtonRef,
  onEnlarge,
  onReset,
  onViewMode,
  onZoomIn,
  onZoomOut,
  viewMode,
  zoomLevel,
  showEnlarge = true,
}: MapToolbarProps): React.ReactElement {
  const zoomOutUnavailable = disabled || zoomLevel === 0;
  const zoomInUnavailable = disabled || zoomLevel === 2;

  return (
    <div className="flex w-full flex-wrap items-center justify-end gap-1.5 sm:w-auto">
      <div
        role="group"
        aria-label="Map view"
        className="flex w-full rounded-md border border-[var(--border-subtle)] bg-[var(--surface-base)] p-0.5 sm:w-auto"
      >
        <button
          type="button"
          aria-pressed={viewMode === 'focus'}
          disabled={!canFocus}
          onClick={() => onViewMode('focus')}
          className={`flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded px-2.5 text-xs font-semibold transition-colors sm:flex-none ${
            viewMode === 'focus'
              ? 'bg-[rgba(94,230,168,0.1)] text-[var(--console-green)]'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Focus aria-hidden="true" size={14} />
          <span className="hidden sm:inline">Mission focus</span>
          <span className="sm:hidden">Focus</span>
        </button>
        <button
          type="button"
          aria-pressed={viewMode === 'world'}
          onClick={() => onViewMode('world')}
          className={`flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded px-2.5 text-xs font-semibold transition-colors sm:flex-none ${
            viewMode === 'world'
              ? 'bg-[rgba(88,200,232,0.1)] text-[var(--console-cyan)]'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Globe2 aria-hidden="true" size={14} />
          Global
        </button>
      </div>

      <button
        type="button"
        className="icon-button h-11 w-11"
        onClick={() => {
          if (!zoomOutUnavailable) onZoomOut();
        }}
        disabled={disabled}
        aria-disabled={zoomOutUnavailable}
        aria-label="Zoom map out"
      >
        <Minus aria-hidden="true" size={16} />
      </button>
      <button
        type="button"
        className="icon-button h-11 w-11"
        onClick={() => {
          if (!zoomInUnavailable) onZoomIn();
        }}
        disabled={disabled}
        aria-disabled={zoomInUnavailable}
        aria-label="Zoom map in"
      >
        <Plus aria-hidden="true" size={16} />
      </button>
      <span
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        Map zoom level {zoomLevel + 1} of 3.
      </span>
      <button
        type="button"
        className="icon-button h-11 w-11"
        onClick={onReset}
        disabled={disabled}
        aria-label="Reset map view"
      >
        <RotateCcw aria-hidden="true" size={16} />
      </button>
      {showEnlarge ? (
        <button
          ref={expandButtonRef}
          type="button"
          className="action-button action-button-quiet min-h-11 min-w-11 shrink-0 px-2.5 text-xs"
          onClick={onEnlarge}
          disabled={disabled}
          aria-label="Enlarge illustrative trajectory map"
        >
          <span className="hidden sm:inline">Enlarge map</span>
          <Maximize2 aria-hidden="true" className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}

function MissionTrajectoryController({
  launch,
  className = '',
  variant = 'compact',
}: MissionTrajectoryProps): React.ReactElement {
  const rawInstanceId = useId();
  const instanceId = rawInstanceId.replaceAll(':', '');
  const sectionTitleId = `${instanceId}-mission-trajectory-title`;
  const dialogTitleId = `${instanceId}-enlarged-trajectory-title`;
  const dialogDescriptionId = `${instanceId}-enlarged-trajectory-description`;
  const [expanded, setExpanded] = useState(false);
  const [viewMode, setViewMode] = useState<MapViewMode>('focus');
  const [zoomLevel, setZoomLevel] = useState(0);
  const [activeSelection, setActiveSelection] =
    useState<MissionMapSelection>(null);
  const expandButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const trajectory = useMemo(
    () => (launch ? buildIllustrativeTrajectory(launch) : null),
    [launch]
  );
  const canFocus = Boolean(
    trajectory?.launchPoint || trajectory?.phases.length
  );
  const effectiveViewMode =
    viewMode === 'focus' && !canFocus ? 'world' : viewMode;
  const activeSelectionAvailable =
    activeSelection === 'reported-site'
      ? Boolean(trajectory?.launchPoint)
      : activeSelection
        ? Boolean(
            trajectory?.phases.some((phase) => phase.id === activeSelection)
          )
        : true;
  const effectiveSelection = activeSelectionAvailable
    ? activeSelection
    : null;
  const baseViewport =
    effectiveViewMode === 'focus' && trajectory
      ? trajectory.focusViewport
      : WORLD_VIEWPORT;
  const viewport = useMemo(
    () => zoomViewport(baseViewport, zoomLevel),
    [baseViewport, zoomLevel]
  );

  const resetMap = useCallback((): void => {
    setViewMode(canFocus ? 'focus' : 'world');
    setZoomLevel(0);
    setActiveSelection(null);
  }, [canFocus]);

  const changeViewMode = useCallback((mode: MapViewMode): void => {
    setViewMode(mode);
    setZoomLevel(0);
  }, []);

  const closeExpanded = useCallback((): void => {
    setExpanded(false);
  }, []);

  const openExpanded = useCallback((): void => {
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setExpanded(true);
  }, []);

  useEffect(() => {
    if (!expanded) return;

    const previousOverflow = document.body.style.overflow;
    const expandButton = expandButtonRef.current;
    const previousFocus = previousFocusRef.current;
    const backgroundElements = [
      ...document.body.querySelectorAll<HTMLElement>(
        ':scope > :not([data-mission-map-dialog])'
      ),
    ].filter(
      (element) =>
        !['LINK', 'SCRIPT', 'STYLE'].includes(element.tagName)
    );
    const backgroundState = backgroundElements.map((element) => ({
      element,
      ariaHidden: element.getAttribute('aria-hidden'),
      inert: element.inert,
    }));

    backgroundElements.forEach((element) => {
      element.inert = true;
      element.setAttribute('aria-hidden', 'true');
    });
    document.body.style.overflow = 'hidden';
    const frame = window.requestAnimationFrame(() => {
      closeButtonRef.current?.focus();
    });

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeExpanded();
        return;
      }

      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = [
        ...dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
        ),
      ];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      backgroundState.forEach(({ element, ariaHidden, inert }) => {
        element.inert = inert;
        if (ariaHidden === null) {
          element.removeAttribute('aria-hidden');
        } else {
          element.setAttribute('aria-hidden', ariaHidden);
        }
      });
      window.requestAnimationFrame(() => {
        (expandButton ?? previousFocus)?.focus();
        previousFocusRef.current = null;
      });
    };
  }, [closeExpanded, expanded]);

  const toolbar = (
    <MapToolbar
      canFocus={canFocus}
      disabled={!launch}
      expandButtonRef={expandButtonRef}
      onEnlarge={openExpanded}
      onReset={resetMap}
      onViewMode={changeViewMode}
      onZoomIn={() => setZoomLevel((level) => Math.min(2, level + 1))}
      onZoomOut={() => setZoomLevel((level) => Math.max(0, level - 1))}
      viewMode={effectiveViewMode}
      zoomLevel={zoomLevel}
    />
  );

  const dialog =
    expanded && typeof document !== 'undefined'
      ? createPortal(
          <div
            data-mission-map-dialog
            className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-black/80 p-3 backdrop-blur-sm sm:p-5"
            onMouseDown={(event) => {
              if (event.currentTarget === event.target) closeExpanded();
            }}
          >
            <div
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={dialogTitleId}
              aria-describedby={dialogDescriptionId}
              className="flex h-[min(92svh,58rem)] min-h-[20rem] w-full max-w-[90rem] flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-strong)] bg-[var(--surface-base)] shadow-[var(--shadow-elevated)]"
            >
              <header className="flex shrink-0 items-start justify-between gap-4 border-b border-[var(--border-subtle)] px-4 py-3 sm:px-5">
                <div className="min-w-0">
                  <p className="console-label">Enlarged mission map</p>
                  <h2
                    id={dialogTitleId}
                    className="mt-1 truncate text-lg font-bold text-[var(--text-primary)] sm:text-xl"
                  >
                    {launch?.name || 'Mission trajectory'}
                  </h2>
                  <p
                    id={dialogDescriptionId}
                    className="mt-1 text-xs text-[var(--text-muted)]"
                  >
                    Geographic context and provider-reported mission profile.
                  </p>
                </div>
                <button
                  ref={closeButtonRef}
                  type="button"
                  className="icon-button shrink-0"
                  aria-label="Close full trajectory map"
                  onClick={closeExpanded}
                >
                  <X aria-hidden="true" className="h-5 w-5" />
                </button>
              </header>

              <div className="shrink-0 border-b border-[var(--border-subtle)] px-3 py-2 sm:px-5">
                <MapToolbar
                  canFocus={canFocus}
                  disabled={!launch}
                  onEnlarge={openExpanded}
                  onReset={resetMap}
                  onViewMode={changeViewMode}
                  onZoomIn={() =>
                    setZoomLevel((level) => Math.min(2, level + 1))
                  }
                  onZoomOut={() =>
                    setZoomLevel((level) => Math.max(0, level - 1))
                  }
                  showEnlarge={false}
                  viewMode={effectiveViewMode}
                  zoomLevel={zoomLevel}
                />
              </div>
              <div
                className="aspect-[2/1] min-h-0 shrink-0 p-3 sm:aspect-auto sm:flex-1 sm:shrink sm:p-4"
                data-enlarged-map-region
              >
                <MissionMapCanvas
                  activeSelection={effectiveSelection}
                  expanded
                  launch={launch}
                  trajectory={trajectory}
                  variant="detail"
                  viewport={viewport}
                />
              </div>
              {launch && trajectory ? (
                <div
                  className="min-h-0 flex-1 overflow-y-auto border-t border-[var(--border-subtle)] sm:max-h-[min(30svh,14rem)] sm:flex-none"
                  data-enlarged-map-support
                >
                  <MissionPhaseRail
                    activeSelection={effectiveSelection}
                    launch={launch}
                    onSelect={setActiveSelection}
                    trajectory={trajectory}
                  />
                  <p className="flex items-start gap-2 border-t border-[var(--border-subtle)] px-4 py-3 text-xs leading-relaxed text-[var(--text-muted)] sm:px-5">
                    <Info
                      aria-hidden="true"
                      className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--console-cyan)]"
                    />
                    {TRAJECTORY_DISCLOSURE}
                  </p>
                </div>
              ) : null}
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <section
        aria-labelledby={sectionTitleId}
        className={`surface-card flex min-h-0 flex-col overflow-hidden ${
          variant === 'detail'
            ? 'min-h-[32rem]'
            : 'lg:h-full lg:min-h-[27.5rem]'
        } ${className}`}
        data-mission-map-variant={variant}
      >
        <header
          className={`flex gap-4 border-b border-[var(--border-subtle)] px-4 py-3 sm:px-5 ${
            variant === 'detail'
              ? 'flex-col sm:flex-row sm:items-center sm:justify-between'
              : 'items-center justify-between'
          }`}
        >
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2
                id={sectionTitleId}
                className="font-mono text-xs font-bold uppercase tracking-[0.13em] text-[var(--text-secondary)]"
              >
                Mission trajectory
              </h2>
              <span className="rounded border border-[rgba(88,200,232,0.3)] bg-[rgba(88,200,232,0.08)] px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.09em] text-[var(--console-cyan)]">
                Illustrative model
              </span>
            </div>
            <p className="mt-1 truncate text-xs text-[var(--text-muted)]">
              {launch?.name || 'No mission selected'}
            </p>
          </div>

          {variant === 'detail' ? (
            toolbar
          ) : (
            <button
              ref={expandButtonRef}
              type="button"
              className="action-button action-button-quiet min-h-11 min-w-11 shrink-0 px-2.5 text-xs"
              onClick={openExpanded}
              disabled={!launch}
              aria-label="Enlarge illustrative trajectory map"
            >
              <span className="hidden sm:inline">Enlarge map</span>
              <Maximize2 aria-hidden="true" className="h-4 w-4" />
            </button>
          )}
        </header>

        <MissionMapCanvas
          activeSelection={effectiveSelection}
          launch={launch}
          trajectory={trajectory}
          variant={variant}
          viewport={viewport}
        />

        {variant === 'detail' && launch && trajectory ? (
          <MissionPhaseRail
            activeSelection={effectiveSelection}
            launch={launch}
            onSelect={setActiveSelection}
            trajectory={trajectory}
          />
        ) : null}

        <p className="flex items-start gap-2 border-t border-[var(--border-subtle)] px-4 py-2.5 text-[10px] leading-relaxed text-[var(--text-muted)] sm:px-5 sm:text-[11px]">
          <Info
            aria-hidden="true"
            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--console-cyan)]"
          />
          {TRAJECTORY_DISCLOSURE}
        </p>
        {variant === 'compact' ? (
          <CompactFacts launch={launch} trajectory={trajectory} />
        ) : null}
      </section>
      {dialog}
    </>
  );
}

export default function MissionTrajectory(
  props: MissionTrajectoryProps
): React.ReactElement {
  return (
    <MissionTrajectoryController
      key={props.launch?.id || 'no-mission'}
      {...props}
    />
  );
}
