'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ComposableMap, Geographies, Geography, Line, Marker, ZoomableGroup } from 'react-simple-maps';
import Link from 'next/link';
import { ChevronRight, MapPin, Maximize2, Minus, Plus, Radar, RotateCcw, Rocket, X } from 'lucide-react';
import { Launch } from '@/lib/types';
import ConsolePanel from './ui/ConsolePanel';
import Countdown from './Countdown';
import StatusBadge from './ui/StatusBadge';

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

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

function compareLaunches(a: Launch, b: Launch): number {
  if (a.isLive && !b.isLive) return -1;
  if (!a.isLive && b.isLive) return 1;
  return a.dateUnix - b.dateUnix;
}

function sortSites(a: LaunchSite, b: LaunchSite): number {
  if (a.liveCount !== b.liveCount) {
    return b.liveCount - a.liveCount;
  }

  if (a.nextLaunch && b.nextLaunch) {
    return a.nextLaunch.dateUnix - b.nextLaunch.dateUnix;
  }

  if (a.nextLaunch) return -1;
  if (b.nextLaunch) return 1;
  return b.count - a.count;
}

function formatCoordinates(site: LaunchSite): string {
  return `${site.lat.toFixed(4)}°, ${site.lng.toFixed(4)}°${site.countryCode ? ` · ${site.countryCode}` : ''}`;
}

export default function LaunchMap({ launches }: LaunchMapProps): React.ReactElement {
  const [expanded, setExpanded] = useState(false);
  const [selectedSite, setSelectedSite] = useState<LaunchSite | null>(null);
  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState<[number, number]>([0, 20]);
  const [autoTrack, setAutoTrack] = useState(true);

  useEffect(() => {
    if (expanded) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [expanded]);

  useEffect(() => {
    if (!expanded) return;

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setExpanded(false);
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [expanded]);

  const launchSites = useMemo(() => {
    const sitesMap = new Map<string, LaunchSite>();

    launches.forEach((launch) => {
      if (!launch.location) {
        return;
      }

      const key = `${launch.location.lat.toFixed(2)},${launch.location.lng.toFixed(2)}`;
      const existing = sitesMap.get(key);

      if (existing) {
        existing.count += 1;
        if (launch.isLive) {
          existing.liveCount += 1;
        }
        existing.launches.push(launch);
        return;
      }

      sitesMap.set(key, {
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

    return Array.from(sitesMap.values())
      .map((site) => {
        const orderedLaunches = [...site.launches].sort(compareLaunches);
        return {
          ...site,
          launches: orderedLaunches,
          nextLaunch: orderedLaunches[0] || null,
        };
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

    return launchSites
      .filter((site) => site.name !== highlightedSite.name)
      .slice(0, expanded ? 10 : 4);
  }, [expanded, highlightedSite, launchSites]);

  const focusSite = useCallback((site: LaunchSite, nextZoom?: number) => {
    setSelectedSite(site);
    setCenter([site.lng, site.lat]);
    setZoom(nextZoom ?? 3.2);
  }, []);

  useEffect(() => {
    if (!autoTrack || !primarySite) {
      return;
    }

    const raf = window.requestAnimationFrame(() => {
      focusSite(primarySite, expanded ? 3.4 : 2.2);
    });

    return () => window.cancelAnimationFrame(raf);
  }, [autoTrack, expanded, focusSite, primarySite]);

  const handleMarkerClick = useCallback((site: LaunchSite) => {
    setAutoTrack(false);
    setSelectedSite((current) => {
      if (current?.name === site.name) {
        return null;
      }
      return site;
    });
    setCenter([site.lng, site.lat]);
    setZoom((currentZoom) => Math.max(currentZoom, expanded ? 3.8 : 3));
  }, [expanded]);

  const handleZoomIn = useCallback(() => {
    setAutoTrack(false);
    setZoom((currentZoom) => Math.min(currentZoom * 1.45, 8));
  }, []);

  const handleZoomOut = useCallback(() => {
    setAutoTrack(false);
    setZoom((currentZoom) => Math.max(currentZoom / 1.45, 1));
  }, []);

  const handleReset = useCallback(() => {
    setAutoTrack(true);
    if (!primarySite) {
      setZoom(1);
      setCenter([0, 20]);
      setSelectedSite(null);
      return;
    }

    focusSite(primarySite, expanded ? 3.4 : 2.2);
  }, [expanded, focusSite, primarySite]);

  const handleClose = useCallback(() => {
    setExpanded(false);
  }, []);

  const handleMoveEnd = useCallback(({ coordinates, zoom: nextZoom }: { coordinates: [number, number]; zoom: number }) => {
    setAutoTrack(false);
    setCenter(coordinates);
    setZoom(nextZoom);
  }, []);

  if (launchSites.length === 0) {
    return (
      <ConsolePanel label="TRACKING DISPLAY">
        <div className="py-8 text-center">
          <Rocket size={32} className="mx-auto mb-3 text-[var(--text-muted)]" />
          <p className="text-sm text-[var(--text-muted)] font-[family-name:var(--font-geist-mono)]">NO LOCATION DATA</p>
        </div>
      </ConsolePanel>
    );
  }

  const mapHeight = expanded ? 'h-[60vh]' : 'h-[220px] sm:h-[300px] lg:h-[350px]';

  return (
    <div className={expanded ? 'fixed inset-0 z-[80] overflow-y-auto bg-[var(--bg-primary)] p-4 pt-20 sm:p-6 sm:pt-24' : ''}>
      {expanded && (
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <p className="console-label mb-1 text-[10px]">TRACKING DISPLAY</p>
            <h2 className="display-title text-2xl text-[var(--text-primary)]">Telemetry globe online.</h2>
          </div>
          <button
            onClick={handleClose}
            className="inline-flex items-center gap-2 border border-[var(--console-red)]/40 px-4 py-2 text-xs font-[family-name:var(--font-geist-mono)] font-bold tracking-[0.18em] text-[var(--console-red)] transition-colors hover:bg-[var(--console-red)]/10"
          >
            <X size={14} />
            CLOSE MAP
          </button>
        </div>
      )}

      <ConsolePanel label={expanded ? undefined : 'TRACKING DISPLAY'}>
        <div className="mb-4 grid gap-3 border-b border-[var(--panel-border)] pb-4 sm:grid-cols-2 xl:grid-cols-4">
          <div>
            <p className="console-label text-[10px]">SITES</p>
            <p className="mt-1 text-lg font-semibold text-[var(--console-cyan)] font-[family-name:var(--font-geist-mono)]">
              {String(launchSites.length).padStart(2, '0')}
            </p>
          </div>
          <div>
            <p className="console-label text-[10px]">LIVE PADS</p>
            <p className="mt-1 text-lg font-semibold text-[var(--console-red)] font-[family-name:var(--font-geist-mono)]">
              {String(liveSiteCount).padStart(2, '0')}
            </p>
          </div>
          <div>
            <p className="console-label text-[10px]">TRACK MODE</p>
            <p className="mt-1 text-lg font-semibold text-[var(--console-green)] font-[family-name:var(--font-geist-mono)]">
              {autoTrack ? 'AUTO' : 'MANUAL'}
            </p>
          </div>
          <div>
            <p className="console-label text-[10px]">PRIMARY PAD</p>
            <p className="mt-1 truncate text-sm text-[var(--text-primary)]">
              {primarySite?.name || 'Unavailable'}
            </p>
          </div>
        </div>

        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="console-label text-[10px]">
              <MapPin size={10} className="mr-1 inline" />
              SITE NETWORK
            </span>
            {highlightedSite && (
              <span className="text-[10px] font-[family-name:var(--font-geist-mono)] tracking-[0.18em] text-[var(--text-muted)]">
                FOCUS: {highlightedSite.name.split(',')[0].toUpperCase()}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {primarySite && (
              <button
                onClick={() => {
                  setAutoTrack(true);
                  focusSite(primarySite, expanded ? 3.4 : 2.2);
                }}
                className="inline-flex items-center gap-1.5 border border-[var(--panel-border)] px-2.5 py-1.5 text-[10px] font-[family-name:var(--font-geist-mono)] tracking-[0.18em] text-[var(--text-primary)] transition-colors hover:border-[var(--console-cyan)]/35 hover:text-[var(--console-cyan)]"
              >
                <Radar size={12} />
                FOLLOW ACTIVE
              </button>
            )}
            <button
              onClick={handleZoomIn}
              className="p-1.5 text-[var(--text-muted)] transition-colors hover:text-[var(--console-green)]"
              aria-label="Zoom in"
            >
              <Plus size={14} />
            </button>
            <button
              onClick={handleZoomOut}
              className="p-1.5 text-[var(--text-muted)] transition-colors hover:text-[var(--console-green)]"
              aria-label="Zoom out"
            >
              <Minus size={14} />
            </button>
            <button
              onClick={handleReset}
              className="p-1.5 text-[var(--text-muted)] transition-colors hover:text-[var(--console-green)]"
              aria-label="Reset view"
            >
              <RotateCcw size={14} />
            </button>
            {!expanded && (
              <>
                <div className="mx-1 h-4 w-px bg-[var(--panel-border)]" />
                <button
                  onClick={() => setExpanded(true)}
                  className="p-1.5 text-[var(--text-muted)] transition-colors hover:text-[var(--console-green)]"
                  aria-label="Expand map"
                >
                  <Maximize2 size={14} />
                </button>
              </>
            )}
          </div>
        </div>

        <div className={`relative w-full overflow-hidden border border-[var(--panel-border)] bg-[#080c14] ${mapHeight} transition-all duration-300`}>
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,212,255,0.08),transparent_36%),radial-gradient(circle_at_18%_16%,rgba(0,255,136,0.08),transparent_22%)]" />
          <div className="pointer-events-none absolute inset-0 opacity-40">
            <div className="h-full w-full bg-[linear-gradient(rgba(0,255,136,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,136,0.03)_1px,transparent_1px)] bg-[size:28px_28px]" />
          </div>

          <ComposableMap
            projection="geoMercator"
            projectionConfig={{ scale: 130, center: [0, 20] }}
            className="h-full w-full"
            style={{ width: '100%', height: '100%' }}
          >
            <ZoomableGroup
              zoom={zoom}
              center={center}
              minZoom={1}
              maxZoom={8}
              onMoveEnd={handleMoveEnd}
            >
              <rect x={-500} y={-500} width={2000} height={2000} fill="#080c14" />
              <Geographies geography={GEO_URL}>
                {({ geographies }) =>
                  geographies.map((geo) => (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill="#151d2b"
                      stroke="rgba(0,255,136,0.15)"
                      strokeWidth={0.5}
                      style={{
                        default: { outline: 'none' },
                        hover: { fill: '#1c2636', outline: 'none', stroke: 'rgba(0,255,136,0.3)', strokeWidth: 0.8 },
                        pressed: { outline: 'none' },
                      }}
                    />
                  ))
                }
              </Geographies>

              {highlightedSite &&
                connectedSites.map((site) => (
                  <Line
                    key={`${highlightedSite.name}-${site.name}`}
                    from={[highlightedSite.lng, highlightedSite.lat]}
                    to={[site.lng, site.lat]}
                    stroke={highlightedSite.liveCount > 0 ? 'rgba(255,51,51,0.45)' : 'rgba(0,212,255,0.45)'}
                    strokeWidth={highlightedSite.liveCount > 0 ? 1.1 : 0.9}
                    strokeLinecap="round"
                    style={{
                      strokeDasharray: '7 10',
                      animation: 'telemetry-flow 10s linear infinite',
                    }}
                  />
                ))}

              {launchSites.map((site) => {
                const isSelected = highlightedSite?.name === site.name;
                const hasLive = site.liveCount > 0;
                const markerColor = hasLive
                  ? 'var(--console-red)'
                  : isSelected
                    ? 'var(--console-cyan)'
                    : 'var(--console-green)';

                return (
                  <Marker key={`${site.lat}-${site.lng}`} coordinates={[site.lng, site.lat]}>
                    <circle
                      r={Math.min(6 + site.count * 2, 14)}
                      fill="none"
                      stroke={markerColor}
                      strokeWidth={isSelected || hasLive ? 1 : 0.6}
                      opacity={hasLive ? 0.5 : 0.35}
                    >
                      <animate
                        attributeName="r"
                        from={Math.min(4 + site.count * 2, 12)}
                        to={Math.min(10 + site.count * 2, 20)}
                        dur={hasLive ? '1.4s' : '2.2s'}
                        repeatCount="indefinite"
                      />
                      <animate
                        attributeName="opacity"
                        from={hasLive ? '0.5' : '0.35'}
                        to="0"
                        dur={hasLive ? '1.4s' : '2.2s'}
                        repeatCount="indefinite"
                      />
                    </circle>
                    <circle
                      r={hasLive ? 5.5 : isSelected ? 4.8 : 3.4}
                      fill={markerColor}
                      stroke={isSelected ? 'rgba(232,237,245,0.65)' : 'none'}
                      strokeWidth={isSelected ? 1.5 : 0}
                      style={{
                        cursor: 'pointer',
                        filter: `drop-shadow(0 0 ${hasLive ? '10' : isSelected ? '8' : '4'}px ${
                          hasLive ? 'rgba(255,51,51,0.75)' : isSelected ? 'rgba(0,212,255,0.75)' : 'rgba(0,255,136,0.55)'
                        })`,
                      }}
                      onClick={() => handleMarkerClick(site)}
                    />
                    {(zoom >= 2.8 || isSelected || hasLive) && (
                      <text
                        textAnchor="middle"
                        y={-12}
                        style={{
                          fontFamily: 'var(--font-geist-mono)',
                          fontSize: hasLive || isSelected ? '10px' : '8px',
                          fill: markerColor,
                          fontWeight: hasLive || isSelected ? '700' : '500',
                          pointerEvents: 'none',
                          letterSpacing: '0.08em',
                        }}
                      >
                        {site.name.split(',')[0]}
                      </text>
                    )}
                  </Marker>
                );
              })}
            </ZoomableGroup>
          </ComposableMap>

          <div className="pointer-events-none absolute bottom-2 left-2 bg-[var(--bg-primary)]/80 px-2 py-1 text-[9px] font-[family-name:var(--font-geist-mono)] text-[var(--text-muted)]">
            {zoom.toFixed(1)}x // {autoTrack ? 'AUTO TRACK' : 'MANUAL TRACK'}
          </div>
        </div>

        <div className={`mt-4 grid gap-4 ${expanded ? 'xl:grid-cols-[1.1fr_0.9fr]' : ''}`}>
          {highlightedSite && (
            <div className="border border-[var(--console-cyan)]/20 bg-[var(--bg-tertiary)]">
              <div className="flex items-center justify-between gap-3 border-b border-[var(--panel-border)] px-4 py-3">
                <div>
                  <p className="text-xs font-bold text-[var(--console-cyan)] font-[family-name:var(--font-geist-mono)]">
                    {highlightedSite.name}
                  </p>
                  <p className="mt-1 text-[10px] text-[var(--text-muted)] font-[family-name:var(--font-geist-mono)]">
                    {formatCoordinates(highlightedSite)}
                  </p>
                </div>
                {!autoTrack && (
                  <button
                    onClick={() => setSelectedSite(null)}
                    className="p-1.5 text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
                    aria-label="Clear site focus"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <div className="grid gap-3 border-b border-[var(--panel-border)] px-4 py-3 sm:grid-cols-3">
                <div>
                  <p className="console-label text-[10px]">TOTAL LAUNCHES</p>
                  <p className="mt-1 text-lg font-semibold text-[var(--console-cyan)] font-[family-name:var(--font-geist-mono)]">
                    {highlightedSite.count}
                  </p>
                </div>
                <div>
                  <p className="console-label text-[10px]">LIVE NOW</p>
                  <p className="mt-1 text-lg font-semibold text-[var(--console-red)] font-[family-name:var(--font-geist-mono)]">
                    {highlightedSite.liveCount}
                  </p>
                </div>
                <div>
                  <p className="console-label text-[10px]">TRACK STATE</p>
                  <p className="mt-1 text-lg font-semibold text-[var(--console-green)] font-[family-name:var(--font-geist-mono)]">
                    {autoTrack && primarySite?.name === highlightedSite.name ? 'FOLLOWING' : 'LOCKED'}
                  </p>
                </div>
              </div>

              <div className="divide-y divide-[var(--panel-border)]">
                {highlightedSite.launches.slice(0, expanded ? 6 : 4).map((launch) => (
                  <Link
                    key={launch.id}
                    href={`/launch/${launch.id}`}
                    className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[var(--bg-secondary)]"
                  >
                    <StatusBadge status={launch.status} statusName={launch.statusName} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs text-[var(--text-primary)] transition-colors group-hover:text-[var(--console-cyan)] font-[family-name:var(--font-geist-mono)]">
                        {launch.name}
                      </p>
                      <p className="mt-1 text-[10px] text-[var(--text-muted)] font-[family-name:var(--font-geist-mono)]">
                        {launch.rocket}
                      </p>
                    </div>
                    <Countdown targetDate={launch.date} compact />
                    <ChevronRight size={12} className="flex-shrink-0 text-[var(--text-muted)]" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="border border-[var(--panel-border)] bg-[var(--bg-tertiary)]">
            <div className="border-b border-[var(--panel-border)] px-4 py-3">
              <p className="console-label text-[10px]">SITE NETWORK</p>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Jump between launch pads or lock back onto the active network.
              </p>
            </div>

            <div className={`divide-y divide-[var(--panel-border)] ${expanded ? 'max-h-[320px] overflow-y-auto' : ''}`}>
              {launchSites.slice(0, expanded ? launchSites.length : 4).map((site) => (
                <button
                  key={`${site.lat}-${site.lng}`}
                  onClick={() => handleMarkerClick(site)}
                  className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors ${
                    highlightedSite?.name === site.name ? 'bg-[var(--console-cyan)]/6' : 'hover:bg-[var(--bg-secondary)]'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`status-dot ${site.liveCount > 0 ? 'status-dot-critical' : 'status-dot-nominal'}`} />
                      <span className="truncate text-xs text-[var(--text-primary)] font-[family-name:var(--font-geist-mono)]">
                        {site.name}
                      </span>
                    </div>
                    <p className="mt-1 text-[10px] text-[var(--text-muted)] font-[family-name:var(--font-geist-mono)]">
                      {site.nextLaunch ? site.nextLaunch.rocket : 'No queued launch'}{site.liveCount > 0 ? ' // LIVE PAD' : ''}
                    </p>
                  </div>
                  <span className="text-[10px] font-[family-name:var(--font-geist-mono)] tracking-[0.16em] text-[var(--console-cyan)]">
                    {site.count}X
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </ConsolePanel>
    </div>
  );
}
