'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { geoEquirectangular, geoPath } from 'd3-geo';
import { feature, mesh } from 'topojson-client';
import type {
  GeometryCollection as TopologyGeometryCollection,
  Topology,
} from 'topojson-specification';
import landTopology from 'world-atlas/land-110m.json';
import {
  ChevronRight,
  MapPin,
  Maximize2,
  Minus,
  Plus,
  Radar,
  RotateCcw,
  Rocket,
  X,
} from 'lucide-react';
import {
  getFocusLabelBox,
  getMapFrame,
  getMapViewport,
  getRouteGeometry,
  isPointInFrame,
  MAP_HEIGHT,
  MAP_WIDTH,
  projectMapPoint,
  wrapXNear,
} from '@/lib/map-geometry';
import type { Launch } from '@/lib/types';
import ConsolePanel from './ui/ConsolePanel';
import Countdown from './Countdown';
import StatusBadge from './ui/StatusBadge';

interface LaunchSite {
  name: string;
  lat: number;
  lng: number;
  count: number;
  liveCount: number;
  countryCode?: string;
  launches: Launch[];
  nextLaunch: Launch | null;
}

interface LaunchMapProps {
  launches: Launch[];
}

const WORLD_COPIES = [-1, 0, 1];

const topology = landTopology as unknown as Topology;
const landObject = topology.objects.land as TopologyGeometryCollection;
const landFeatures = feature(topology, landObject);
const worldProjection = geoEquirectangular().fitSize(
  [MAP_WIDTH, MAP_HEIGHT],
  { type: 'Sphere' }
);
const worldPath = geoPath(worldProjection).digits(1);
const LAND_PATH = worldPath(landFeatures) || '';
const COAST_PATH = worldPath(mesh(topology, landObject)) || '';

function compareLaunches(a: Launch, b: Launch): number {
  if (a.isLive && !b.isLive) return -1;
  if (!a.isLive && b.isLive) return 1;
  return a.dateUnix - b.dateUnix;
}

function sortSites(a: LaunchSite, b: LaunchSite): number {
  if (a.liveCount !== b.liveCount) return b.liveCount - a.liveCount;
  if (a.nextLaunch && b.nextLaunch) {
    return a.nextLaunch.dateUnix - b.nextLaunch.dateUnix;
  }
  if (a.nextLaunch) return -1;
  if (b.nextLaunch) return 1;
  return b.count - a.count;
}

function formatCoordinates(site: LaunchSite): string {
  return `${site.lat.toFixed(4)}°, ${site.lng.toFixed(4)}°${
    site.countryCode ? ` · ${site.countryCode}` : ''
  }`;
}

function compactSiteName(name: string): string {
  const shortName = name.split(',')[0].trim();
  return shortName.length > 24 ? `${shortName.slice(0, 23)}…` : shortName;
}

function normalizeSiteKey(site: NonNullable<Launch['location']>): string {
  return `${site.name.trim().toLocaleLowerCase('en-US')}|${
    site.countryCode?.toLocaleLowerCase('en-US') || ''
  }`;
}

function angleDifference(a: number, b: number): number {
  const difference = Math.abs(a - b) % (Math.PI * 2);
  return Math.min(difference, Math.PI * 2 - difference);
}

function selectNetworkConnections(
  origin: LaunchSite,
  sites: LaunchSite[],
  limit: number
): LaunchSite[] {
  const originPoint = projectMapPoint(origin.lng, origin.lat);
  const candidates = sites
    .filter((site) => site !== origin)
    .map((site) => {
      const projected = projectMapPoint(site.lng, site.lat);
      const x = wrapXNear(projected.x, originPoint.x);
      return {
        site,
        angle: Math.atan2(projected.y - originPoint.y, x - originPoint.x),
      };
    });
  const selected: typeof candidates = [];
  const minimumSeparation = Math.PI / 9;

  for (const candidate of candidates) {
    if (
      selected.every(
        (existing) =>
          angleDifference(existing.angle, candidate.angle) >= minimumSeparation
      )
    ) {
      selected.push(candidate);
    }
    if (selected.length === limit) break;
  }

  if (selected.length < limit) {
    for (const candidate of candidates) {
      if (!selected.includes(candidate)) selected.push(candidate);
      if (selected.length === limit) break;
    }
  }

  return selected.map(({ site }) => site);
}

function TelemetryMap({
  sites,
  highlightedSite,
  connectedSites,
  center,
  zoom,
  onSelect,
}: {
  sites: LaunchSite[];
  highlightedSite: LaunchSite | null;
  connectedSites: LaunchSite[];
  center: [number, number];
  zoom: number;
  onSelect: (site: LaunchSite) => void;
}): React.ReactElement {
  const viewport = useMemo(() => getMapViewport(center, zoom), [center, zoom]);
  const frame = useMemo(() => getMapFrame(viewport), [viewport]);
  const viewBox = `${viewport.x} ${viewport.y} ${viewport.width} ${viewport.height}`;
  const viewCenterX = viewport.x + viewport.width / 2;
  const projectedSites = useMemo(() => {
    return sites.map((site) => {
      const point = projectMapPoint(site.lng, site.lat);
      return {
        site,
        point: {
          x: wrapXNear(point.x, viewCenterX),
          y: point.y,
        },
      };
    });
  }, [sites, viewCenterX]);
  const highlightedPoint = useMemo(() => {
    if (!highlightedSite) return null;
    const point = projectMapPoint(highlightedSite.lng, highlightedSite.lat);
    return {
      x: wrapXNear(point.x, viewCenterX),
      y: point.y,
    };
  }, [highlightedSite, viewCenterX]);
  const routes = useMemo(() => {
    if (!highlightedPoint) return [];

    return connectedSites.map((site, index) => {
      const destination = projectMapPoint(site.lng, site.lat);
      const wrappedDestination = {
        x: wrapXNear(destination.x, highlightedPoint.x),
        y: destination.y,
      };

      return {
        site,
        geometry: getRouteGeometry(
          highlightedPoint,
          wrappedDestination,
          frame,
          viewport.zoom,
          index
        ),
      };
    });
  }, [connectedSites, frame, highlightedPoint, viewport.zoom]);
  const visibleSites = useMemo(() => {
    const padding = 12 / viewport.zoom;
    return projectedSites.filter(
      ({ point }) =>
        point.x >= viewport.x - padding &&
        point.x <= viewport.x + viewport.width + padding &&
        point.y >= viewport.y - padding &&
        point.y <= viewport.y + viewport.height + padding
    );
  }, [projectedSites, viewport]);
  const focusName = highlightedSite
    ? compactSiteName(highlightedSite.name)
    : null;
  const focusLabel =
    highlightedPoint && focusName && isPointInFrame(highlightedPoint, frame)
      ? getFocusLabelBox(
          highlightedPoint,
          frame,
          focusName.length,
          viewport.zoom
        )
      : null;
  const verticalGridLines = useMemo(() => {
    const start = Math.floor(viewport.x / 50) * 50;
    const count = Math.ceil(viewport.width / 50) + 2;
    return Array.from({ length: count }, (_, index) => start + index * 50);
  }, [viewport.width, viewport.x]);
  const horizontalGridLines = useMemo(() => {
    const start = Math.floor(viewport.y / 50) * 50;
    const count = Math.ceil(viewport.height / 50) + 2;
    return Array.from({ length: count }, (_, index) => start + index * 50);
  }, [viewport.height, viewport.y]);
  const mapBackground = {
    x: viewport.x,
    y: viewport.y,
    width: viewport.width,
    height: viewport.height,
  };

  const markerColor = (site: LaunchSite, selected: boolean): string => {
    if (site.liveCount > 0) return '#ff6b76';
    return selected ? '#58c8e8' : '#5ee6a8';
  };

  const markerRadius = (
    site: LaunchSite,
    selected: boolean
  ): number => {
    const screenRadius = site.liveCount > 0 ? 7 : selected ? 6.5 : 4.25;
    return screenRadius / viewport.zoom;
  };

  const routeColor = highlightedSite?.liveCount
    ? 'rgba(255,107,118,0.55)'
    : 'rgba(88,200,232,0.52)';

  const renderMarker = ({
    site,
    point,
  }: (typeof visibleSites)[number]): React.ReactElement => {
    const selected =
      highlightedSite?.lat === site.lat && highlightedSite.lng === site.lng;
    const color = markerColor(site, selected);
    const radius = markerRadius(site, selected);

    return (
      <g
        key={`${site.lat}-${site.lng}`}
        data-map-site={compactSiteName(site.name)}
        onClick={() => onSelect(site)}
        className="cursor-pointer"
      >
        <title>{`${site.name} · ${site.count} scheduled ${
          site.count === 1 ? 'launch' : 'launches'
        }`}</title>
        <circle
          cx={point.x}
          cy={point.y}
          r={14 / viewport.zoom}
          fill="transparent"
        />
        {selected || site.liveCount > 0 ? (
          <circle
            cx={point.x}
            cy={point.y}
            r={radius * 2.55}
            fill="none"
            stroke={color}
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
            opacity={selected ? 0.5 : 0.36}
          />
        ) : null}
        <circle
          cx={point.x}
          cy={point.y}
          r={radius}
          fill={color}
          stroke={selected ? '#f3f6fa' : 'rgba(8,12,20,0.9)'}
          strokeWidth={selected ? 1.6 : 1}
          vectorEffect="non-scaling-stroke"
          filter="url(#marker-glow)"
        />
      </g>
    );
  };

  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox={viewBox}
      preserveAspectRatio="xMidYMid meet"
      className="h-full w-full"
      data-map-zoom={viewport.zoom.toFixed(1)}
    >
      <defs>
        <radialGradient id="telemetry-glow" cx="50%" cy="50%" r="62%">
          <stop offset="0%" stopColor="#58c8e8" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#080c14" stopOpacity="0" />
        </radialGradient>
        <filter id="marker-glow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur
            stdDeviation={2.5 / viewport.zoom}
            result="blur"
          />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <rect {...mapBackground} fill="#080c14" />
      <rect {...mapBackground} fill="url(#telemetry-glow)" />

      <g stroke="rgba(94,230,168,0.07)" strokeWidth={0.75}>
        {verticalGridLines.map((x) => (
          <line
            key={`longitude-${x}`}
            x1={x}
            y1={viewport.y}
            x2={x}
            y2={viewport.y + viewport.height}
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {horizontalGridLines.map((y) => (
          <line
            key={`latitude-${y}`}
            x1={viewport.x}
            y1={y}
            x2={viewport.x + viewport.width}
            y2={y}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </g>

      <g
        fill="#151e2a"
        fillRule="evenodd"
      >
        {WORLD_COPIES.map((copy) => (
          <path
            key={copy}
            d={LAND_PATH}
            transform={`translate(${copy * MAP_WIDTH} 0)`}
          />
        ))}
      </g>
      <g
        fill="none"
        stroke="rgba(94,230,168,0.24)"
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
      >
        {WORLD_COPIES.map((copy) => (
          <path
            key={copy}
            d={COAST_PATH}
            transform={`translate(${copy * MAP_WIDTH} 0)`}
          />
        ))}
      </g>

      {routes.map(({ site, geometry }) => (
        <g key={`${highlightedSite?.name}-${site.name}`}>
          <path
            data-map-route={compactSiteName(site.name)}
            data-route-offscreen={geometry.offscreen ? 'true' : 'false'}
            d={geometry.path}
            fill="none"
            stroke={routeColor}
            strokeWidth={1.25}
            strokeDasharray="6 8"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          >
            <title>{`Network route toward ${site.name}`}</title>
          </path>
          {geometry.offscreen ? (
            <g
              data-route-edge={compactSiteName(site.name)}
              transform={`translate(${geometry.end.x} ${
                geometry.end.y
              }) rotate(${geometry.angle})`}
              color={routeColor}
            >
              <circle
                r={7 / viewport.zoom}
                fill="#080c14"
                stroke="currentColor"
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
              <path
                d={`M ${-3.5 / viewport.zoom} ${-3.5 / viewport.zoom} L ${
                  1.5 / viewport.zoom
                } 0 L ${-3.5 / viewport.zoom} ${3.5 / viewport.zoom}`}
                fill="none"
                stroke="currentColor"
                strokeWidth={1.25}
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            </g>
          ) : null}
        </g>
      ))}

      {visibleSites.map(renderMarker)}

      {highlightedPoint && focusLabel && focusName ? (
        <g data-focus-label={focusName} pointerEvents="none">
          <line
            x1={highlightedPoint.x}
            y1={highlightedPoint.y}
            x2={focusLabel.leaderX}
            y2={focusLabel.leaderY}
            stroke="rgba(88,200,232,0.72)"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
          <rect
            x={focusLabel.x}
            y={focusLabel.y}
            width={focusLabel.width}
            height={focusLabel.height}
            rx={5 / viewport.zoom}
            fill="rgba(8,12,20,0.94)"
            stroke="rgba(88,200,232,0.62)"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
          <circle
            cx={focusLabel.x + 12 / viewport.zoom}
            cy={focusLabel.y + focusLabel.height / 2}
            r={2.5 / viewport.zoom}
            fill="#58c8e8"
          />
          <text
            x={focusLabel.x + 21 / viewport.zoom}
            y={focusLabel.y + focusLabel.height / 2}
            dominantBaseline="middle"
            fill="#dff7ff"
            fontFamily="var(--font-mono)"
            fontSize={10.5 / viewport.zoom}
            fontWeight={700}
            letterSpacing={0.65 / viewport.zoom}
          >
            {focusName}
          </text>
        </g>
      ) : null}
    </svg>
  );
}

export default function LaunchMap({ launches }: LaunchMapProps): React.ReactElement {
  const [expanded, setExpanded] = useState(false);
  const [selectedSite, setSelectedSite] = useState<LaunchSite | null>(null);
  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState<[number, number]>([0, 20]);
  const [autoTrack, setAutoTrack] = useState(true);
  const expandedRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const expandButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!expanded) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const frame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());

    return () => {
      window.cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
    };
  }, [expanded]);

  useEffect(() => {
    if (expanded || !previousFocusRef.current) return;

    const fallbackFocus = previousFocusRef.current;
    const frame = window.requestAnimationFrame(() => {
      (expandButtonRef.current ?? fallbackFocus).focus();
      previousFocusRef.current = null;
    });

    return () => window.cancelAnimationFrame(frame);
  }, [expanded]);

  useEffect(() => {
    if (!expanded) return;

    const handleKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setExpanded(false);
        return;
      }

      if (event.key !== 'Tab' || !expandedRef.current) return;
      const focusable = [
        ...expandedRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        ),
      ];
      if (focusable.length === 0) return;
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

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [expanded]);

  const launchSites = useMemo(() => {
    const sites = new Map<string, LaunchSite>();

    launches.forEach((launch) => {
      if (!launch.location) return;
      const key = normalizeSiteKey(launch.location);
      const existing = sites.get(key);

      if (existing) {
        const nextCount = existing.count + 1;
        existing.lat =
          (existing.lat * existing.count + launch.location.lat) / nextCount;
        existing.lng =
          (existing.lng * existing.count + launch.location.lng) / nextCount;
        existing.count = nextCount;
        existing.liveCount += launch.isLive ? 1 : 0;
        existing.launches.push(launch);
        return;
      }

      sites.set(key, {
        name: launch.location.name,
        lat: launch.location.lat,
        lng: launch.location.lng,
        count: 1,
        liveCount: launch.isLive ? 1 : 0,
        countryCode: launch.location.countryCode,
        launches: [launch],
        nextLaunch: null,
      });
    });

    return [...sites.values()]
      .map((site) => {
        const ordered = [...site.launches].sort(compareLaunches);
        return { ...site, launches: ordered, nextLaunch: ordered[0] || null };
      })
      .sort(sortSites);
  }, [launches]);

  const liveSiteCount = useMemo(
    () => launchSites.filter((site) => site.liveCount > 0).length,
    [launchSites]
  );
  const primarySite = useMemo(
    () => launchSites.find((site) => site.liveCount > 0) || launchSites[0] || null,
    [launchSites]
  );
  const highlightedSite = selectedSite || primarySite;
  const connectedSites = useMemo(() => {
    if (!highlightedSite) return [];
    return selectNetworkConnections(
      highlightedSite,
      launchSites,
      expanded ? 6 : 3
    );
  }, [expanded, highlightedSite, launchSites]);

  const focusSite = useCallback(
    (site: LaunchSite, nextZoom?: number): void => {
      setSelectedSite(site);
      setCenter([site.lng, site.lat]);
      setZoom(nextZoom ?? 3);
    },
    []
  );

  useEffect(() => {
    if (!autoTrack || !primarySite) return;
    const frame = window.requestAnimationFrame(() => {
      focusSite(primarySite, expanded ? 3.2 : 2.1);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [autoTrack, expanded, focusSite, primarySite]);

  const handleSiteSelect = useCallback(
    (site: LaunchSite): void => {
      setAutoTrack(false);
      focusSite(site, expanded ? 3.6 : 2.8);
    },
    [expanded, focusSite]
  );

  const handleReset = useCallback((): void => {
    setAutoTrack(true);
    if (primarySite) {
      focusSite(primarySite, expanded ? 3.2 : 2.1);
    } else {
      setSelectedSite(null);
      setCenter([0, 20]);
      setZoom(1);
    }
  }, [expanded, focusSite, primarySite]);

  if (launchSites.length === 0) {
    return (
      <ConsolePanel label="TRACKING DISPLAY">
        <div className="py-8 text-center">
          <Rocket
            aria-hidden="true"
            size={32}
            className="mx-auto mb-3 text-[var(--text-muted)]"
          />
          <p className="font-mono text-sm text-[var(--text-muted)]">
            NO LOCATION DATA
          </p>
        </div>
      </ConsolePanel>
    );
  }

  const mapHeight = expanded
    ? 'h-[min(62svh,42rem)] min-h-[22rem]'
    : 'h-[16rem] sm:h-[18rem]';

  return (
    <div
      ref={expandedRef}
      role={expanded ? 'dialog' : undefined}
      aria-modal={expanded ? true : undefined}
      aria-label={expanded ? 'Expanded mission map' : undefined}
      className={
        expanded
          ? 'launch-map-shell fixed inset-0 z-[80] overflow-y-auto bg-[var(--surface-canvas)] p-4 pt-20 sm:p-6 sm:pt-24'
          : 'launch-map-shell'
      }
    >
      {expanded ? (
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <p className="data-label mb-1">Tracking display</p>
            <h2 className="section-title text-2xl">Global telemetry</h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={() => setExpanded(false)}
            className="action-button action-button-secondary text-[var(--console-red)]"
          >
            <X aria-hidden="true" size={15} />
            Close map
          </button>
        </div>
      ) : null}

      <ConsolePanel label={expanded ? undefined : 'TRACKING DISPLAY'}>
        <div className="launch-map-stats mb-4 border-b border-[var(--border-subtle)] pb-4">
          {[
            ['Sites', String(launchSites.length).padStart(2, '0'), 'var(--console-cyan)'],
            ['Live pads', String(liveSiteCount).padStart(2, '0'), 'var(--console-red)'],
            ['Track mode', autoTrack ? 'AUTO' : 'MANUAL', 'var(--console-green)'],
            ['Primary pad', primarySite?.name.split(',')[0] || 'Unavailable', 'var(--text-primary)'],
          ].map(([label, value, color]) => (
            <div
              key={label}
              className={`launch-map-stat min-w-0 ${
                label === 'Primary pad' ? 'launch-map-stat-primary' : ''
              }`}
            >
              <p className="data-label">{label}</p>
              <p
                className="launch-map-stat-value mt-1 font-mono text-sm font-semibold sm:text-base"
                style={{ color }}
                title={label === 'Primary pad' ? value : undefined}
              >
                {value}
              </p>
            </div>
          ))}
        </div>

        <div className="launch-map-toolbar mb-3">
          <div className="launch-map-context flex min-w-0 flex-wrap items-center gap-2">
            <span className="data-label">
              <MapPin aria-hidden="true" size={11} className="mr-1 inline" />
              Site network
            </span>
            {highlightedSite ? (
              <span className="launch-map-focus font-mono text-[10px] tracking-[0.14em] text-[var(--text-muted)]">
                Focus: {compactSiteName(highlightedSite.name).toUpperCase()}
              </span>
            ) : null}
          </div>

          <div
            className="launch-map-controls"
            role="group"
            aria-label="Map view controls"
          >
            {primarySite ? (
              <button
                type="button"
                onClick={handleReset}
                className="launch-map-follow action-button action-button-secondary !min-h-11 !text-xs"
              >
                <Radar aria-hidden="true" size={13} />
                <span>Follow active</span>
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => {
                setAutoTrack(false);
                setZoom((value) => Math.min(value * 1.35, 6));
              }}
              className="icon-button"
              aria-label="Zoom in"
            >
              <Plus aria-hidden="true" size={15} />
            </button>
            <button
              type="button"
              onClick={() => {
                setAutoTrack(false);
                setZoom((value) => Math.max(value / 1.35, 1));
              }}
              className="icon-button"
              aria-label="Zoom out"
            >
              <Minus aria-hidden="true" size={15} />
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="icon-button"
              aria-label="Reset view"
            >
              <RotateCcw aria-hidden="true" size={15} />
            </button>
            {!expanded ? (
              <button
                ref={expandButtonRef}
                type="button"
                onClick={() => {
                  previousFocusRef.current =
                    document.activeElement as HTMLElement | null;
                  setExpanded(true);
                }}
                className="icon-button"
                aria-label="Expand map"
              >
                <Maximize2 aria-hidden="true" size={15} />
              </button>
            ) : null}
          </div>
        </div>

        <div
          data-testid="telemetry-map"
          className={`relative w-full overflow-hidden rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[#080c14] ${mapHeight}`}
        >
          <TelemetryMap
            sites={launchSites}
            highlightedSite={highlightedSite}
            connectedSites={connectedSites}
            center={center}
            zoom={zoom}
            onSelect={handleSiteSelect}
          />
          <div className="pointer-events-none absolute bottom-2 left-2 rounded bg-[var(--surface-canvas)]/85 px-2 py-1 font-mono text-[9px] text-[var(--text-muted)]">
            {zoom.toFixed(1)}x · {autoTrack ? 'AUTO TRACK' : 'MANUAL TRACK'}
          </div>
          <div className="pointer-events-none absolute bottom-2 right-2 rounded bg-[var(--surface-canvas)]/85 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--text-muted)]">
            {connectedSites.length} outbound
          </div>
        </div>

        {expanded ? (
          <div className="mt-4 grid gap-4 xl:grid-cols-[1.1fr_.9fr]">
          {highlightedSite ? (
            <div className="overflow-hidden rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--surface-raised)]">
              <div className="flex items-start justify-between gap-3 border-b border-[var(--border-subtle)] px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate font-mono text-xs font-bold text-[var(--console-cyan)]">
                    {highlightedSite.name}
                  </p>
                  <p className="mt-1 font-mono text-[10px] text-[var(--text-muted)]">
                    {formatCoordinates(highlightedSite)}
                  </p>
                </div>
                {!autoTrack ? (
                  <button
                    type="button"
                    onClick={handleReset}
                    className="icon-button shrink-0"
                    aria-label="Clear site focus"
                  >
                    <X aria-hidden="true" size={15} />
                  </button>
                ) : null}
              </div>

              <dl className="grid grid-cols-3 gap-3 border-b border-[var(--border-subtle)] px-4 py-3">
                {[
                  {
                    label: 'Launches',
                    value: highlightedSite.count,
                    color: 'var(--console-cyan)',
                  },
                  {
                    label: 'Live now',
                    value: highlightedSite.liveCount,
                    color: 'var(--console-red)',
                  },
                  {
                    label: 'Track',
                    value:
                      autoTrack && primarySite?.name === highlightedSite.name
                        ? 'Following'
                        : 'Locked',
                    color: 'var(--console-green)',
                  },
                ].map((metric) => (
                  <div key={metric.label}>
                    <dt className="data-label">{metric.label}</dt>
                    <dd
                      className="mt-1 truncate font-mono text-sm font-semibold"
                      style={{ color: metric.color }}
                    >
                      {metric.value}
                    </dd>
                  </div>
                ))}
              </dl>

              <div className="divide-y divide-[var(--border-subtle)]">
                {highlightedSite.launches.slice(0, 6).map((launch) => (
                    <Link
                      key={launch.id}
                      href={`/launch/${encodeURIComponent(launch.id)}`}
                      className="group flex min-h-14 items-center gap-3 px-4 py-3 transition-colors hover:bg-[var(--surface-subtle)]"
                    >
                      <StatusBadge
                        status={launch.status}
                        statusName={launch.statusName}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-mono text-xs text-[var(--text-primary)] group-hover:text-[var(--console-cyan)]">
                          {launch.name}
                        </span>
                        <span className="mt-1 block text-[10px] text-[var(--text-muted)]">
                          {launch.rocket}
                        </span>
                      </span>
                      <Countdown
                        targetDate={launch.date}
                        precision={launch.datePrecision}
                        compact
                      />
                      <ChevronRight
                        aria-hidden="true"
                        size={14}
                        className="shrink-0 text-[var(--text-muted)]"
                      />
                    </Link>
                  ))}
              </div>
            </div>
          ) : null}

          <div className="overflow-hidden rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--surface-raised)]">
            <div className="border-b border-[var(--border-subtle)] px-4 py-3">
              <p className="data-label">Site network</p>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Select a launch pad to inspect its queued missions.
              </p>
            </div>
            <div
              className="max-h-80 divide-y divide-[var(--border-subtle)] overflow-y-auto"
            >
              {launchSites.map((site) => {
                  const selected =
                    highlightedSite?.lat === site.lat &&
                    highlightedSite.lng === site.lng;
                  return (
                    <button
                      type="button"
                      key={`${site.lat}-${site.lng}`}
                      aria-pressed={selected}
                      onClick={() => handleSiteSelect(site)}
                      className={`flex min-h-14 w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors ${
                        selected
                          ? 'bg-[var(--surface-accent)]'
                          : 'hover:bg-[var(--surface-subtle)]'
                      }`}
                    >
                      <span className="min-w-0">
                        <span className="flex items-center gap-2">
                          <span
                            aria-hidden="true"
                            className={`h-2 w-2 shrink-0 rounded-full ${
                              site.liveCount
                                ? 'bg-[var(--console-red)]'
                                : 'bg-[var(--console-green)]'
                            }`}
                          />
                          <span className="block truncate font-mono text-xs text-[var(--text-primary)]">
                            {site.name}
                          </span>
                        </span>
                        <span className="mt-1 block truncate pl-4 text-[10px] text-[var(--text-muted)]">
                          {site.nextLaunch?.rocket || 'No queued launch'}
                          {site.liveCount ? ' · live pad' : ''}
                        </span>
                      </span>
                      <span className="shrink-0 font-mono text-[10px] tracking-[0.14em] text-[var(--console-cyan)]">
                        {site.count}×
                      </span>
                    </button>
                  );
                })}
            </div>
          </div>
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            <div
              aria-label="Launch site selector"
              className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
            >
              {launchSites.slice(0, 8).map((site) => {
                const selected =
                  highlightedSite?.lat === site.lat &&
                  highlightedSite.lng === site.lng;

                return (
                  <button
                    type="button"
                    key={`${site.lat}-${site.lng}`}
                    aria-pressed={selected}
                    onClick={() => handleSiteSelect(site)}
                    className={`flex min-h-11 shrink-0 items-center gap-2 rounded-[var(--radius-sm)] border px-3 text-left font-mono text-[10px] transition-colors ${
                      selected
                        ? 'border-[var(--console-cyan)] bg-[var(--surface-accent)] text-[var(--console-cyan)]'
                        : 'border-[var(--border-subtle)] bg-[var(--surface-raised)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`h-2 w-2 shrink-0 rounded-full ${
                        site.liveCount
                          ? 'bg-[var(--console-red)]'
                          : 'bg-[var(--console-green)]'
                      }`}
                    />
                    <span className="max-w-36 truncate">
                      {site.name.split(',')[0]}
                    </span>
                    <span className="text-[var(--text-muted)]">{site.count}×</span>
                  </button>
                );
              })}
            </div>

            {highlightedSite?.nextLaunch ? (
              <Link
                href={`/launch/${encodeURIComponent(highlightedSite.nextLaunch.id)}`}
                className="group flex min-h-16 items-center gap-3 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-4 py-3 transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-subtle)]"
              >
                <MapPin
                  aria-hidden="true"
                  size={17}
                  className="shrink-0 text-[var(--console-cyan)]"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--text-muted)]">
                    {highlightedSite.name}
                  </span>
                  <span className="mt-1 block truncate font-mono text-xs text-[var(--text-primary)] group-hover:text-[var(--console-cyan)]">
                    {highlightedSite.nextLaunch.name}
                  </span>
                </span>
                <Countdown
                  targetDate={highlightedSite.nextLaunch.date}
                  precision={highlightedSite.nextLaunch.datePrecision}
                  compact
                />
                <ChevronRight
                  aria-hidden="true"
                  size={14}
                  className="shrink-0 text-[var(--text-muted)]"
                />
              </Link>
            ) : null}
          </div>
        )}
      </ConsolePanel>
    </div>
  );
}
