'use client';

import { useId, useMemo, useRef, useState } from 'react';
import {
  geoEquirectangular,
  geoGraticule10,
  geoPath,
} from 'd3-geo';
import { feature, mesh } from 'topojson-client';
import type {
  GeometryCollection as TopologyGeometryCollection,
  Topology,
} from 'topojson-specification';
import countriesTopology from 'world-atlas/countries-110m.json';
import { ExternalLink, MapPin, Move, Route } from 'lucide-react';
import {
  getFocusLabelBox,
  getMapFrame,
  getRouteGeometry,
  MAP_HEIGHT,
  MAP_WIDTH,
  type MapViewport,
} from '@/lib/map-geometry';
import {
  getLaunchSiteDisplay,
  isCriticalLaunchStatusName,
} from '@/lib/format';
import { buildReportedSiteMapUrl } from '@/lib/site-map';
import type {
  IllustrativeTrajectory,
  TrajectoryPhaseId,
} from '@/lib/trajectory';
import type { Launch } from '@/lib/types';

export type MissionMapSelection =
  | 'reported-site'
  | TrajectoryPhaseId
  | null;

interface MissionMapCanvasProps {
  activeSelection: MissionMapSelection;
  expanded?: boolean;
  launch: Launch | null;
  onPan?: (deltaX: number, deltaY: number) => void;
  onReset?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  trajectory: IllustrativeTrajectory | null;
  variant: 'compact' | 'detail';
  viewMode: 'focus' | 'world' | 'site';
  viewport: MapViewport;
}

const WORLD_COPIES = [-1, 0, 1];
const topology = countriesTopology as unknown as Topology;
const landObject = topology.objects.land as TopologyGeometryCollection;
const countryObject =
  topology.objects.countries as TopologyGeometryCollection;
const landFeatures = feature(topology, landObject);
const projection = geoEquirectangular().fitSize(
  [MAP_WIDTH, MAP_HEIGHT],
  { type: 'Sphere' }
);
const path = geoPath(projection).digits(1);
const LAND_PATH = path(landFeatures) || '';
const COAST_PATH = path(mesh(topology, landObject)) || '';
const COUNTRY_PATH =
  path(mesh(topology, countryObject, (a, b) => a !== b)) || '';
const GRATICULE_PATH = path(geoGraticule10()) || '';

function compactLabel(value: string, length = 30): string {
  return value.length > length ? `${value.slice(0, length - 1)}…` : value;
}

function selectionOpacity(
  activeSelection: MissionMapSelection,
  selection: Exclude<MissionMapSelection, null>
): number {
  return !activeSelection || activeSelection === selection ? 1 : 0.25;
}

function missionSignalColor(launch: Launch | null): string {
  if (launch?.status === 'live') return '#ff4fd8';
  if (
    launch?.status === 'failure' ||
    isCriticalLaunchStatusName(launch?.statusName)
  ) {
    return '#ff5c6c';
  }
  if (launch?.status === 'tbd') return '#ffc45c';
  return '#63f6b2';
}

function formatCoordinate(
  value: number,
  positive: string,
  negative: string
): string {
  return `${Math.abs(value).toFixed(4)}°${
    value >= 0 ? positive : negative
  }`;
}

function SiteDetailOverlay({
  launch,
}: {
  launch: Launch;
}): React.ReactElement | null {
  if (!launch.location) return null;

  const site = getLaunchSiteDisplay(launch);
  const mapUrl = buildReportedSiteMapUrl(launch.location);
  const source = launch.source === 'll2' ? 'Launch Library 2' : 'SpaceX';

  return (
    <aside
      aria-label="Reported launch site detail"
      data-trajectory-site-detail
      className="absolute bottom-3 left-3 z-10 w-[min(18rem,calc(100%-1.5rem))] overflow-hidden rounded-md border border-[rgba(244,185,95,0.36)] bg-[rgba(7,11,18,0.96)] shadow-xl backdrop-blur-sm sm:bottom-4 sm:left-4"
    >
      <div className="flex items-start gap-3 border-b border-[var(--border-subtle)] px-3 py-3">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[rgba(244,185,95,0.1)] text-[var(--console-amber)]">
          <MapPin aria-hidden="true" size={15} />
        </span>
        <div className="min-w-0">
          <p className="font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--console-amber)]">
            Site detail · reported
          </p>
          <p className="mt-1 break-words text-sm font-semibold leading-5 text-[var(--text-primary)]">
            {site.label}
          </p>
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-2 px-3 py-2.5">
        <div>
          <dt className="font-mono text-[8px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">
            Latitude
          </dt>
          <dd className="mt-0.5 font-mono text-[10px] font-semibold text-[var(--text-secondary)]">
            {formatCoordinate(launch.location.lat, 'N', 'S')}
          </dd>
        </div>
        <div>
          <dt className="font-mono text-[8px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">
            Longitude
          </dt>
          <dd className="mt-0.5 font-mono text-[10px] font-semibold text-[var(--text-secondary)]">
            {formatCoordinate(launch.location.lng, 'E', 'W')}
          </dd>
        </div>
        <div>
          <dt className="font-mono text-[8px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">
            Country
          </dt>
          <dd className="mt-0.5 font-mono text-[10px] font-semibold text-[var(--text-secondary)]">
            {launch.location.countryCode || 'Not supplied'}
          </dd>
        </div>
        <div>
          <dt className="font-mono text-[8px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">
            Source
          </dt>
          <dd className="mt-0.5 font-mono text-[10px] font-semibold text-[var(--text-secondary)]">
            {source}
          </dd>
        </div>
      </dl>
      {mapUrl ? (
        <a
          href={mapUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-11 items-center justify-between gap-3 border-t border-[var(--border-subtle)] px-3 text-xs font-semibold text-[var(--console-cyan)] transition-colors hover:bg-[rgba(88,200,232,0.06)] hover:text-[var(--text-primary)]"
        >
          Inspect reported coordinates
          <ExternalLink aria-hidden="true" size={13} />
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      ) : null}
    </aside>
  );
}

function pointInViewport(
  point: { x: number; y: number },
  viewport: MapViewport
): boolean {
  return (
    point.x >= viewport.x &&
    point.x <= viewport.x + viewport.width &&
    point.y >= viewport.y &&
    point.y <= viewport.y + viewport.height
  );
}

function wrappedPointForViewport(
  point: { x: number; y: number },
  viewport: MapViewport
): { x: number; y: number } | null {
  const viewportCenter = viewport.x + viewport.width / 2;
  const candidates = WORLD_COPIES.map((copy) => ({
    x: point.x + copy * MAP_WIDTH,
    y: point.y,
  })).sort(
    (first, second) =>
      Math.abs(first.x - viewportCenter) - Math.abs(second.x - viewportCenter)
  );

  return candidates.find((candidate) => pointInViewport(candidate, viewport)) || null;
}

function UnavailableState({
  trajectory,
}: {
  trajectory: IllustrativeTrajectory;
}): React.ReactElement | null {
  if (trajectory.availability === 'ready') return null;

  if (trajectory.availability === 'site-only') {
    return (
      <div className="absolute right-3 top-3 max-w-[15rem] rounded-md border border-[rgba(244,185,95,0.32)] bg-[rgba(7,11,18,0.92)] px-3 py-2 shadow-lg sm:right-4 sm:top-4">
        <p className="font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--console-amber)] sm:text-[10px]">
          Site locator only
        </p>
        <p className="mt-1 text-[11px] leading-4 text-[var(--text-secondary)]">
          Target orbit was not supplied, so no directional path is inferred.
        </p>
      </div>
    );
  }

  const hasOrbit = trajectory.availability === 'orbit-only';

  return (
    <div className="absolute bottom-3 left-3 max-w-sm rounded-md border border-[var(--border-strong)] bg-[rgba(7,11,18,0.94)] p-4 shadow-xl sm:bottom-4 sm:left-4">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[rgba(244,185,95,0.1)] text-[var(--console-amber)]">
          <MapPin aria-hidden="true" size={17} />
        </span>
        <div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            Launch coordinates not supplied
          </p>
          <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
            {hasOrbit
              ? `The provider reports ${trajectory.orbitLabel}, but no geographic origin is available.`
              : 'The reported site remains listed below while geographic data is unavailable.'}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function MissionMapCanvas({
  activeSelection,
  expanded = false,
  launch,
  onPan,
  onReset,
  onZoomIn,
  onZoomOut,
  trajectory,
  variant,
  viewMode,
  viewport,
}: MissionMapCanvasProps): React.ReactElement {
  const dragRef = useRef<{
    pointerId: number;
    x: number;
    y: number;
  } | null>(null);
  const wheelTimestampRef = useRef(0);
  const [dragging, setDragging] = useState(false);
  const rawId = useId();
  const id = rawId.replaceAll(':', '');
  const titleId = `${id}-title`;
  const descriptionId = `${id}-description`;
  const glowId = `${id}-glow`;
  const greenArrowId = `${id}-green-arrow`;
  const cyanArrowId = `${id}-cyan-arrow`;
  const gridId = `${id}-wire-grid`;
  const signalColor = missionSignalColor(launch);
  const frame = useMemo(() => getMapFrame(viewport, 34), [viewport]);
  const viewBox = `${viewport.x} ${viewport.y} ${viewport.width} ${viewport.height}`;
  const launchPoint = trajectory?.launchPoint;
  const visibleLaunchPoint = launchPoint
    ? wrappedPointForViewport(launchPoint, viewport)
    : null;
  const siteLabel =
    trajectory && visibleLaunchPoint
      ? getFocusLabelBox(
          visibleLaunchPoint,
          frame,
          compactLabel(trajectory.siteLabel).length,
          viewport.zoom
        )
      : null;
  const edgeIndicators = useMemo(
    () =>
      trajectory?.phases
        .map((phase) => ({
          phase,
          geometry: getRouteGeometry(
            phase.start,
            phase.end,
            frame,
            viewport.zoom
          ),
        }))
        .filter(({ geometry }) => geometry.offscreen) || [],
    [frame, trajectory, viewport.zoom]
  );
  const routeVisible = Boolean(trajectory?.phases.length);
  const interactive = Boolean(
    launch && onPan && onReset && onZoomIn && onZoomOut
  );
  const showSiteDetail = Boolean(
    launch?.location &&
      trajectory?.launchPoint &&
      visibleLaunchPoint &&
      viewport.zoom >= 6
  );
  const mapSizeClass = expanded
    ? 'h-full min-h-0'
    : variant === 'detail'
      ? viewMode === 'site'
        ? 'h-[24rem] sm:h-[clamp(22rem,48vw,34rem)]'
        : 'h-[18rem] sm:h-[clamp(22rem,48vw,34rem)]'
      : 'aspect-[2/1] min-h-[12rem] lg:aspect-auto lg:flex-1';

  const finishDrag = (pointerId: number): void => {
    if (dragRef.current?.pointerId !== pointerId) return;
    dragRef.current = null;
    setDragging(false);
  };

  return (
    <div
      role={interactive ? 'region' : undefined}
      aria-label={interactive ? 'Interactive flight map' : undefined}
      aria-keyshortcuts={
        interactive ? 'ArrowUp ArrowDown ArrowLeft ArrowRight + - Home' : undefined
      }
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={(event) => {
        if (!interactive || !onPan || !onReset || !onZoomIn || !onZoomOut) {
          return;
        }
        const step = (event.shiftKey ? 0.24 : 0.1);
        if (event.key === 'ArrowLeft') onPan(-viewport.width * step, 0);
        else if (event.key === 'ArrowRight') onPan(viewport.width * step, 0);
        else if (event.key === 'ArrowUp') onPan(0, -viewport.height * step);
        else if (event.key === 'ArrowDown') onPan(0, viewport.height * step);
        else if (event.key === '+' || event.key === '=') onZoomIn();
        else if (event.key === '-' || event.key === '_') onZoomOut();
        else if (event.key === 'Home') onReset();
        else return;
        event.preventDefault();
      }}
      onPointerDown={(event) => {
        if (!interactive || event.button !== 0) return;
        if (
          event.target instanceof Element &&
          event.target.closest('a, button')
        ) {
          return;
        }
        dragRef.current = {
          pointerId: event.pointerId,
          x: event.clientX,
          y: event.clientY,
        };
        event.currentTarget.setPointerCapture(event.pointerId);
        setDragging(true);
      }}
      onPointerMove={(event) => {
        const drag = dragRef.current;
        if (!drag || drag.pointerId !== event.pointerId || !onPan) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (!bounds.width || !bounds.height) return;
        onPan(
          -((event.clientX - drag.x) / bounds.width) * viewport.width,
          -((event.clientY - drag.y) / bounds.height) * viewport.height
        );
        dragRef.current = {
          pointerId: event.pointerId,
          x: event.clientX,
          y: event.clientY,
        };
      }}
      onPointerUp={(event) => finishDrag(event.pointerId)}
      onPointerCancel={(event) => finishDrag(event.pointerId)}
      onWheel={(event) => {
        if (!interactive || !onZoomIn || !onZoomOut) return;
        const now = Date.now();
        if (now - wheelTimestampRef.current < 140) {
          event.preventDefault();
          return;
        }
        wheelTimestampRef.current = now;
        if (event.deltaY < 0) onZoomIn();
        else if (event.deltaY > 0) onZoomOut();
        else return;
        event.preventDefault();
      }}
      style={{ touchAction: expanded ? 'none' : 'pan-y' }}
      className={`mission-map-display relative min-h-0 w-full min-w-0 max-w-full overflow-hidden bg-[#050811] outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--console-cyan)] ${
        interactive ? (dragging ? 'cursor-grabbing' : 'cursor-grab') : ''
      } ${mapSizeClass}`}
      data-map-availability={trajectory?.availability || 'none'}
      data-map-interactive={interactive ? 'true' : 'false'}
      data-map-mode={viewMode}
    >
      <svg
        viewBox={viewBox}
        preserveAspectRatio="xMidYMid meet"
        className="h-full w-full"
        role="img"
        aria-labelledby={`${titleId} ${descriptionId}`}
        data-map-view={`${viewport.x.toFixed(1)}:${viewport.y.toFixed(1)}:${viewport.width.toFixed(1)}:${viewport.height.toFixed(1)}`}
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
          <filter id={glowId} x="-180%" y="-180%" width="460%" height="460%">
            <feGaussianBlur
              stdDeviation={2.8 / viewport.zoom}
              result="blur"
            />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <marker
            id={greenArrowId}
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#63f6b2" />
          </marker>
          <marker
            id={cyanArrowId}
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#58e6ff" />
          </marker>
          <pattern
            id={gridId}
            width="36"
            height="36"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 36 0 L 0 0 0 36"
              fill="none"
              stroke="rgba(88,230,255,0.065)"
              strokeWidth="0.7"
              vectorEffect="non-scaling-stroke"
            />
          </pattern>
        </defs>

        <rect
          x={viewport.x}
          y={viewport.y}
          width={viewport.width}
          height={viewport.height}
          fill="#050811"
        />
        <rect
          x={viewport.x}
          y={viewport.y}
          width={viewport.width}
          height={viewport.height}
          fill={`url(#${gridId})`}
          pointerEvents="none"
        />
        <g fill="#16202c" fillRule="evenodd">
          {WORLD_COPIES.map((copy) => (
            <path
              key={`land-${copy}`}
              d={LAND_PATH}
              transform={`translate(${copy * MAP_WIDTH} 0)`}
            />
          ))}
        </g>
        <g
          fill="none"
          stroke="rgba(112,138,163,0.15)"
          strokeWidth={0.7}
          vectorEffect="non-scaling-stroke"
        >
          {WORLD_COPIES.map((copy) => (
            <path
              key={`graticule-${copy}`}
              d={GRATICULE_PATH}
              transform={`translate(${copy * MAP_WIDTH} 0)`}
            />
          ))}
        </g>
        <line
          x1={viewport.x}
          x2={viewport.x + viewport.width}
          y1={MAP_HEIGHT / 2}
          y2={MAP_HEIGHT / 2}
          stroke="rgba(88,230,255,0.16)"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
        <g
          fill="none"
          stroke="rgba(125,153,180,0.34)"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        >
          {WORLD_COPIES.map((copy) => (
            <path
              key={`coast-${copy}`}
              d={COAST_PATH}
              transform={`translate(${copy * MAP_WIDTH} 0)`}
            />
          ))}
        </g>
        <g
          fill="none"
          stroke="rgba(99,246,178,0.14)"
          strokeWidth={0.65}
          vectorEffect="non-scaling-stroke"
        >
          {WORLD_COPIES.map((copy) => (
            <path
              key={`countries-${copy}`}
              d={COUNTRY_PATH}
              transform={`translate(${copy * MAP_WIDTH} 0)`}
            />
          ))}
        </g>

        {trajectory?.phases.map((phase) => {
          const ascent = phase.id === 'ascent-model';
          const opacity = selectionOpacity(activeSelection, phase.id);

          return (
            <g
              key={phase.id}
              data-map-phase-group={phase.id}
              opacity={opacity}
            >
              <path
                d={phase.path}
                fill="none"
                stroke="#02050a"
                strokeWidth={9}
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
              <path
                d={phase.path}
                data-trajectory-phase={phase.id}
                fill="none"
                className={
                  ascent
                    ? 'trajectory-path-ascent'
                    : 'trajectory-path-orbit'
                }
                pathLength={ascent ? 1 : undefined}
                stroke={ascent ? '#63f6b2' : '#58e6ff'}
                strokeWidth={activeSelection === phase.id ? 4.5 : 3.25}
                strokeDasharray={ascent ? '1' : '9 9'}
                strokeDashoffset={ascent ? '1' : undefined}
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                markerEnd={`url(#${ascent ? greenArrowId : cyanArrowId})`}
                filter={
                  activeSelection === phase.id ? `url(#${glowId})` : undefined
                }
              >
                <title>{phase.description}</title>
              </path>
            </g>
          );
        })}

        {visibleLaunchPoint && siteLabel && trajectory ? (
          <g
            data-trajectory-marker="reported-launch-site"
            opacity={selectionOpacity(activeSelection, 'reported-site')}
          >
            <line
              x1={visibleLaunchPoint.x}
              y1={visibleLaunchPoint.y}
              x2={siteLabel.leaderX}
              y2={siteLabel.leaderY}
              className="max-sm:hidden"
              stroke={signalColor}
              opacity="0.7"
              strokeWidth="1.25"
              vectorEffect="non-scaling-stroke"
            />
            <rect
              x={siteLabel.x}
              y={siteLabel.y}
              width={siteLabel.width}
              height={siteLabel.height}
              rx={5 / viewport.zoom}
              fill="rgba(7,11,18,0.94)"
              stroke={signalColor}
              opacity="0.92"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
              data-trajectory-label="reported-launch-site"
              className="max-sm:hidden"
            />
            <text
              x={siteLabel.x + 10 / viewport.zoom}
              y={siteLabel.y + 13 / viewport.zoom}
              className="max-sm:hidden"
              fill={signalColor}
              fontFamily="var(--font-mono)"
              fontSize={7.5 / viewport.zoom}
              fontWeight="700"
              letterSpacing={0.8 / viewport.zoom}
            >
              REPORTED SITE
            </text>
            <text
              x={siteLabel.x + 10 / viewport.zoom}
              y={siteLabel.y + 26 / viewport.zoom}
              className="max-sm:hidden"
              fill="#f5f7ff"
              fontFamily="var(--font-sans)"
              fontSize={10.5 / viewport.zoom}
              fontWeight="700"
            >
              {compactLabel(trajectory.siteLabel)}
            </text>
            <circle
              cx={visibleLaunchPoint.x}
              cy={visibleLaunchPoint.y}
              r={17 / viewport.zoom}
              fill={signalColor}
              fillOpacity="0.07"
              stroke={signalColor}
              strokeOpacity="0.38"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
              className="trajectory-site-beacon"
            />
            <circle
              cx={visibleLaunchPoint.x}
              cy={visibleLaunchPoint.y}
              r={7 / viewport.zoom}
              fill={signalColor}
              stroke="#ecfff6"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
              filter={`url(#${glowId})`}
            />
          </g>
        ) : null}

        {trajectory?.transitionPoint ? (
          <g
            data-trajectory-marker="model-transition"
            data-trajectory-label="ascent-model"
            opacity={selectionOpacity(activeSelection, 'ascent-model')}
          >
            <circle
              cx={trajectory.transitionPoint.x}
              cy={trajectory.transitionPoint.y}
              r={13 / viewport.zoom}
              fill="#07110e"
              stroke="#63f6b2"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
            <text
              x={trajectory.transitionPoint.x}
              y={trajectory.transitionPoint.y + 3.2 / viewport.zoom}
              className="max-sm:hidden"
              fill="#f5f7ff"
              fontFamily="var(--font-mono)"
              fontSize={8.5 / viewport.zoom}
              fontWeight="700"
              textAnchor="middle"
            >
              01
            </text>
          </g>
        ) : null}

        {trajectory?.targetPoint ? (
          <g
            data-trajectory-marker="target-orbit"
            data-trajectory-label="target-orbit-model"
            opacity={selectionOpacity(activeSelection, 'target-orbit-model')}
          >
            <circle
              cx={trajectory.targetPoint.x}
              cy={trajectory.targetPoint.y}
              r={13 / viewport.zoom}
              fill="#071019"
              stroke="#58e6ff"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
            <text
              x={trajectory.targetPoint.x}
              y={trajectory.targetPoint.y + 3.2 / viewport.zoom}
              className="max-sm:hidden"
              fill="#f5f7ff"
              fontFamily="var(--font-mono)"
              fontSize={8.5 / viewport.zoom}
              fontWeight="700"
              textAnchor="middle"
            >
              02
            </text>
          </g>
        ) : null}

        {edgeIndicators.map(({ phase, geometry }) => (
          <g
            key={`edge-${phase.id}`}
            data-route-edge={phase.id}
            transform={`translate(${geometry.end.x} ${geometry.end.y}) rotate(${geometry.angle})`}
            opacity={selectionOpacity(activeSelection, phase.id)}
          >
            <circle
              r={10 / viewport.zoom}
              fill="#070b12"
              stroke={
                phase.id === 'ascent-model' ? '#63f6b2' : '#58e6ff'
              }
              strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
            />
            <path
              d={`M ${-3 / viewport.zoom} ${-4 / viewport.zoom} L ${
                4 / viewport.zoom
              } 0 L ${-3 / viewport.zoom} ${4 / viewport.zoom}`}
              fill="none"
              stroke={
                phase.id === 'ascent-model' ? '#63f6b2' : '#58e6ff'
              }
              strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
            />
          </g>
        ))}
      </svg>

      {interactive && launch && trajectory?.availability === 'ready' ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-3 hidden items-center gap-2 rounded border border-[var(--border-strong)] bg-[rgba(7,11,18,0.88)] px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-[0.08em] text-[var(--text-muted)] backdrop-blur-sm sm:flex"
        >
          <Move aria-hidden="true" size={12} />
          Drag to pan · Scroll to zoom · Arrows to move
        </div>
      ) : null}

      {showSiteDetail && launch ? <SiteDetailOverlay launch={launch} /> : null}

      {!launch ? (
        <div className="absolute inset-0 grid place-items-center p-6 text-center">
          <div className="max-w-xs rounded-md border border-[var(--border-strong)] bg-[rgba(7,11,18,0.94)] p-4">
            <Route
              aria-hidden="true"
              className="mx-auto mb-2 h-5 w-5 text-[var(--text-muted)]"
            />
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              Awaiting mission selection
            </p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Choose a launch to inspect its geographic mission context.
            </p>
          </div>
        </div>
      ) : trajectory ? (
        <UnavailableState trajectory={trajectory} />
      ) : null}

      {routeVisible && variant === 'compact' ? (
        <ul
          aria-label="Trajectory model legend"
          className="absolute bottom-3 right-3 grid gap-1.5 rounded-md border border-[var(--border-strong)] bg-[rgba(7,11,18,0.92)] px-3 py-2 text-[10px] font-medium text-[var(--text-secondary)] shadow-lg"
        >
          <li className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="h-0.5 w-6 rounded-full bg-[var(--console-green)]"
            />
            Ascent model
          </li>
          <li className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="w-6 border-t-2 border-dashed border-[var(--console-cyan)]"
            />
            Target-orbit model
          </li>
        </ul>
      ) : null}
    </div>
  );
}
