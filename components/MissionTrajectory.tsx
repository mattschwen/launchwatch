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
import { geoEquirectangular, geoPath } from 'd3-geo';
import { feature, mesh } from 'topojson-client';
import type {
  GeometryCollection as TopologyGeometryCollection,
  Topology,
} from 'topojson-specification';
import landTopology from 'world-atlas/land-110m.json';
import { Info, MapPin, Maximize2, Route, X } from 'lucide-react';
import { MAP_HEIGHT, MAP_WIDTH } from '@/lib/map-geometry';
import {
  buildIllustrativeTrajectory,
  TRAJECTORY_DISCLOSURE,
  type IllustrativeTrajectory,
} from '@/lib/trajectory';
import type { Launch } from '@/lib/types';

interface MissionTrajectoryProps {
  launch: Launch | null;
  className?: string;
}

interface TrajectoryMapGraphicProps {
  launch: Launch | null;
  trajectory: IllustrativeTrajectory | null;
  expanded?: boolean;
}

const topology = landTopology as unknown as Topology;
const landObject = topology.objects.land as TopologyGeometryCollection;
const landFeatures = feature(topology, landObject);
const projection = geoEquirectangular().fitSize(
  [MAP_WIDTH, MAP_HEIGHT],
  { type: 'Sphere' }
);
const path = geoPath(projection).digits(1);
const LAND_PATH = path(landFeatures) || '';
const COAST_PATH = path(mesh(topology, landObject)) || '';

const statusLabels: Record<Launch['status'], string> = {
  live: 'Live',
  upcoming: 'Upcoming',
  success: 'Successful',
  failure: 'Unsuccessful',
  tbd: 'To be determined',
};

function compactLabel(value: string, length = 24): string {
  return value.length > length ? `${value.slice(0, length - 1)}…` : value;
}

function sourceLabel(source: Launch['source']): string {
  return source === 'll2' ? 'Launch Library 2' : 'SpaceX';
}

function statusTone(status: Launch['status']): string {
  if (status === 'live' || status === 'failure') {
    return 'text-[var(--console-red)]';
  }
  if (status === 'tbd') return 'text-[var(--console-amber)]';
  return 'text-[var(--console-green)]';
}

function TrajectoryMapGraphic({
  launch,
  trajectory,
  expanded = false,
}: TrajectoryMapGraphicProps): React.ReactElement {
  const rawId = useId();
  const id = rawId.replaceAll(':', '');
  const titleId = `${id}-title`;
  const descriptionId = `${id}-description`;
  const glowId = `${id}-glow`;
  const gridId = `${id}-grid`;
  const launchPoint = trajectory?.launchPoint;
  const transitionPoint = trajectory?.transitionPoint;
  const targetPoint = trajectory?.targetPoint;
  const labelOnLeft = Boolean(launchPoint && launchPoint.x > MAP_WIDTH * 0.72);
  const phaseTextSize = expanded ? 13 : 15;
  const siteTextSize = expanded ? 14 : 16;

  return (
    <div
      className={`relative min-h-0 overflow-hidden bg-[#070b12] ${
        expanded
          ? 'h-full rounded-md border border-[var(--border-subtle)]'
          : 'aspect-[1.8/1] lg:aspect-auto lg:flex-1'
      }`}
    >
      <svg
        viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
        preserveAspectRatio="xMidYMid meet"
        className="h-full w-full"
        role="img"
        aria-labelledby={`${titleId} ${descriptionId}`}
        data-trajectory-map
      >
        <title id={titleId}>
          {launch
            ? `Illustrative trajectory model for ${launch.name}`
            : 'Mission trajectory model unavailable'}
        </title>
        <desc id={descriptionId}>
          {trajectory
            ? trajectory.disclosure
            : 'Choose a mission to view an illustrative trajectory model.'}
        </desc>
        <defs>
          <pattern
            id={gridId}
            width="50"
            height="50"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 50 0 L 0 0 0 50"
              fill="none"
              stroke="rgba(94,230,168,0.075)"
              strokeWidth="0.8"
            />
          </pattern>
          <filter id={glowId} x="-150%" y="-150%" width="400%" height="400%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <radialGradient id={`${id}-ambient`} cx="48%" cy="48%" r="62%">
            <stop offset="0%" stopColor="#58c8e8" stopOpacity="0.11" />
            <stop offset="100%" stopColor="#070b12" stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect width={MAP_WIDTH} height={MAP_HEIGHT} fill="#070b12" />
        <rect
          width={MAP_WIDTH}
          height={MAP_HEIGHT}
          fill={`url(#${id}-ambient)`}
        />
        <rect width={MAP_WIDTH} height={MAP_HEIGHT} fill={`url(#${gridId})`} />

        <path d={LAND_PATH} fill="#17212d" fillRule="evenodd" />
        <path
          d={COAST_PATH}
          fill="none"
          stroke="rgba(151,174,197,0.3)"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />

        {trajectory?.phases.map((phase) => {
          const ascent = phase.id === 'ascent-model';
          return (
            <g key={phase.id}>
              <path
                d={phase.path}
                data-trajectory-phase={phase.id}
                fill="none"
                stroke={ascent ? '#5ee6a8' : '#58c8e8'}
                strokeWidth={ascent ? 3.5 : 3}
                strokeDasharray={ascent ? undefined : '10 10'}
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                filter={`url(#${glowId})`}
              >
                <title>{phase.description}</title>
              </path>
              <text
                x={phase.labelPoint.x}
                y={phase.labelPoint.y}
                fill={ascent ? '#72edb7' : '#70d4ef'}
                fontFamily="var(--font-mono)"
                fontSize={phaseTextSize}
                fontWeight="700"
                letterSpacing="1.2"
                textAnchor="middle"
                paintOrder="stroke"
                stroke="#070b12"
                strokeWidth="5"
                strokeLinejoin="round"
              >
                {ascent ? 'ASCENT MODEL' : 'TARGET-ORBIT MODEL'}
              </text>
            </g>
          );
        })}

        {launchPoint && trajectory ? (
          <g data-trajectory-marker="reported-launch-site">
            <circle
              cx={launchPoint.x}
              cy={launchPoint.y}
              r="22"
              fill="rgba(94,230,168,0.08)"
              stroke="rgba(94,230,168,0.4)"
              strokeWidth="1.5"
            />
            <circle
              cx={launchPoint.x}
              cy={launchPoint.y}
              r="10"
              fill="#5ee6a8"
              stroke="#e9fff4"
              strokeWidth="2"
              filter={`url(#${glowId})`}
            />
            <line
              x1={launchPoint.x}
              y1={launchPoint.y}
              x2={launchPoint.x + (labelOnLeft ? -18 : 18)}
              y2={launchPoint.y + 20}
              stroke="rgba(94,230,168,0.62)"
              strokeWidth="1.25"
            />
            <text
              x={launchPoint.x + (labelOnLeft ? -23 : 23)}
              y={launchPoint.y + 35}
              fill="#f3f6fa"
              fontFamily="var(--font-sans)"
              fontSize={siteTextSize}
              fontWeight="700"
              textAnchor={labelOnLeft ? 'end' : 'start'}
              paintOrder="stroke"
              stroke="#070b12"
              strokeWidth="5"
              strokeLinejoin="round"
            >
              {compactLabel(trajectory.siteLabel, expanded ? 32 : 24)}
            </text>
          </g>
        ) : null}

        {transitionPoint ? (
          <g data-trajectory-marker="model-transition">
            <circle
              cx={transitionPoint.x}
              cy={transitionPoint.y}
              r="6"
              fill="#dce6ef"
              stroke="#070b12"
              strokeWidth="2"
            />
            <circle
              cx={transitionPoint.x}
              cy={transitionPoint.y}
              r="11"
              fill="none"
              stroke="rgba(220,230,239,0.45)"
              strokeWidth="1"
            />
          </g>
        ) : null}

        {targetPoint ? (
          <g data-trajectory-marker="target-orbit">
            <circle
              cx={targetPoint.x}
              cy={targetPoint.y}
              r="10"
              fill="#070b12"
              stroke="#58c8e8"
              strokeWidth="3"
              filter={`url(#${glowId})`}
            />
            <circle
              cx={targetPoint.x}
              cy={targetPoint.y}
              r="4"
              fill="#58c8e8"
            />
          </g>
        ) : null}
      </svg>

      {!launch ? (
        <div className="absolute inset-0 grid place-items-center p-6 text-center">
          <div className="max-w-xs rounded-md border border-[var(--border-strong)] bg-[rgba(8,12,18,0.92)] p-4">
            <Route
              aria-hidden="true"
              className="mx-auto mb-2 h-5 w-5 text-[var(--text-muted)]"
            />
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              Awaiting mission selection
            </p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Choose a launch to generate an illustrative model.
            </p>
          </div>
        </div>
      ) : trajectory?.availability === 'missing-location' ? (
        <div className="absolute inset-0 grid place-items-center p-6 text-center">
          <div className="max-w-sm rounded-md border border-[var(--border-strong)] bg-[rgba(8,12,18,0.94)] p-4">
            <MapPin
              aria-hidden="true"
              className="mx-auto mb-2 h-5 w-5 text-[var(--console-amber)]"
            />
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              Launch coordinates unavailable
            </p>
            <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
              A trajectory model cannot be drawn until the source reports a
              geographic launch location.
            </p>
          </div>
        </div>
      ) : !trajectory?.orbitAvailable ? (
        <div className="absolute right-3 top-3 rounded border border-[rgba(244,185,95,0.3)] bg-[rgba(8,12,18,0.9)] px-2.5 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--console-amber)]">
          Target orbit unavailable
        </div>
      ) : null}

      <ul
        aria-label="Trajectory model legend"
        className="absolute bottom-3 right-3 grid gap-1.5 rounded-md border border-[var(--border-strong)] bg-[rgba(8,12,18,0.9)] px-3 py-2 text-[10px] font-medium text-[var(--text-secondary)] shadow-lg backdrop-blur-sm sm:text-[11px]"
      >
        <li className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="h-0.5 w-7 rounded-full bg-[var(--console-green)]"
          />
          Ascent model
        </li>
        <li
          className={`flex items-center gap-2 ${
            trajectory?.orbitAvailable ? '' : 'text-[var(--text-muted)]'
          }`}
        >
          <span
            aria-hidden="true"
            className={`w-7 border-t-2 border-dashed ${
              trajectory?.orbitAvailable
                ? 'border-[var(--console-cyan)]'
                : 'border-[var(--text-muted)]'
            }`}
          />
          {trajectory?.orbitAvailable
            ? 'Target-orbit model'
            : 'Target orbit unavailable'}
        </li>
        <li className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="ml-2 h-2.5 w-2.5 rounded-full border-2 border-[var(--console-green)]"
          />
          Reported launch site
        </li>
      </ul>
    </div>
  );
}

function MissionFacts({ launch }: { launch: Launch | null }): React.ReactElement {
  const facts = launch
    ? [
        {
          label: 'Status',
          value: launch.statusName?.trim() || statusLabels[launch.status],
          className: statusTone(launch.status),
        },
        {
          label: 'Target orbit',
          value: launch.orbit?.trim() || 'Not supplied',
          className: launch.orbit
            ? 'text-[var(--text-primary)]'
            : 'text-[var(--console-amber)]',
        },
        {
          label: 'Reported site',
          value:
            launch.location?.name?.trim() ||
            launch.launchSite?.trim() ||
            'Not supplied',
          className: 'text-[var(--text-primary)]',
        },
        {
          label: 'Data source',
          value: sourceLabel(launch.source),
          className: 'text-[var(--text-primary)]',
        },
      ]
    : [
        { label: 'Status', value: 'No mission', className: '' },
        { label: 'Target orbit', value: '—', className: '' },
        { label: 'Reported site', value: '—', className: '' },
        { label: 'Data source', value: '—', className: '' },
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
            title={fact.value}
            className={`mt-1 truncate text-xs font-semibold ${fact.className}`}
          >
            {fact.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export default function MissionTrajectory({
  launch,
  className = '',
}: MissionTrajectoryProps): React.ReactElement {
  const [expanded, setExpanded] = useState(false);
  const expandButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const trajectory = useMemo(
    () => (launch ? buildIllustrativeTrajectory(launch) : null),
    [launch]
  );

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
      window.requestAnimationFrame(() => {
        (expandButton ?? previousFocus)?.focus();
        previousFocusRef.current = null;
      });
    };
  }, [closeExpanded, expanded]);

  const dialog =
    expanded && typeof document !== 'undefined'
      ? createPortal(
          <div
            className="fixed inset-0 z-[100] grid place-items-center bg-black/75 p-3 backdrop-blur-sm sm:p-6"
            onMouseDown={(event) => {
              if (event.currentTarget === event.target) closeExpanded();
            }}
          >
            <div
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="expanded-trajectory-title"
              aria-describedby="expanded-trajectory-description"
              className="flex h-[min(90vh,54rem)] w-full max-w-7xl flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-strong)] bg-[var(--surface-base)] shadow-[var(--shadow-elevated)]"
            >
              <header className="flex items-start justify-between gap-4 border-b border-[var(--border-subtle)] px-4 py-3 sm:px-5">
                <div className="min-w-0">
                  <p className="console-label">Expanded model</p>
                  <h2
                    id="expanded-trajectory-title"
                    className="mt-1 truncate text-lg font-bold text-[var(--text-primary)] sm:text-xl"
                  >
                    {launch?.name || 'Mission trajectory'}
                  </h2>
                  <p
                    id="expanded-trajectory-description"
                    className="mt-1 text-xs text-[var(--text-muted)]"
                  >
                    Inspect the illustrative phase geometry at a larger scale.
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

              <div className="min-h-0 flex-1 p-3 sm:p-5">
                <TrajectoryMapGraphic
                  launch={launch}
                  trajectory={trajectory}
                  expanded
                />
              </div>
              <p className="flex items-start gap-2 border-t border-[var(--border-subtle)] px-4 py-3 text-xs leading-relaxed text-[var(--text-muted)] sm:px-5">
                <Info
                  aria-hidden="true"
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--console-cyan)]"
                />
                {TRAJECTORY_DISCLOSURE}
              </p>
              <MissionFacts launch={launch} />
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <section
        aria-labelledby="mission-trajectory-title"
        className={`surface-card flex min-h-0 flex-col overflow-hidden lg:h-[27.5rem] ${className}`}
      >
        <header className="flex items-center justify-between gap-3 border-b border-[var(--border-subtle)] px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2
                id="mission-trajectory-title"
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
          <button
            ref={expandButtonRef}
            type="button"
            className="action-button action-button-quiet shrink-0 px-2.5 text-xs"
            onClick={openExpanded}
            disabled={!launch}
            aria-label="View full illustrative trajectory map"
          >
            <span className="hidden sm:inline">View full map</span>
            <Maximize2 aria-hidden="true" className="h-4 w-4" />
          </button>
        </header>

        <TrajectoryMapGraphic launch={launch} trajectory={trajectory} />

        <p className="flex items-start gap-2 border-t border-[var(--border-subtle)] px-4 py-2.5 text-[10px] leading-relaxed text-[var(--text-muted)] sm:px-5 sm:text-[11px]">
          <Info
            aria-hidden="true"
            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--console-cyan)]"
          />
          {TRAJECTORY_DISCLOSURE}
        </p>
        <MissionFacts launch={launch} />
      </section>
      {dialog}
    </>
  );
}
