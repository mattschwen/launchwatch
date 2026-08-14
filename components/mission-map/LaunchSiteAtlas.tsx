'use client';

import Image from 'next/image';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Globe2,
  Layers3,
  LoaderCircle,
  LocateFixed,
  MapPin,
  Minus,
  Plus,
  Radio,
  RefreshCw,
  RotateCcw,
  Route,
  Search,
  Satellite,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { LayerGroup, Map as LeafletMap, TileLayer } from 'leaflet';
import ExternalLinkHint from '@/components/ui/ExternalLinkHint';
import { isLaunchSiteAtlasResponse } from '@/lib/launch-contract';
import { selectLaunchVisualAsset } from '@/lib/launch-visual';
import { buildIllustrativeLaunchCorridor, type IllustrativeTrajectory } from '@/lib/trajectory';
import type { Launch, LaunchSite } from '@/lib/types';

const OPEN_MAP_TILES = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

function distanceKm(a: { lat: number; lng: number }, b: LaunchSite): number {
  const radius = 6_371;
  const phi1 = a.lat * Math.PI / 180;
  const phi2 = b.latitude * Math.PI / 180;
  const deltaPhi = (b.latitude - a.lat) * Math.PI / 180;
  const deltaLambda = (b.longitude - a.lng) * Math.PI / 180;
  const value = Math.sin(deltaPhi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function mapUrl(site: LaunchSite): string {
  return `https://www.openstreetmap.org/?mlat=${site.latitude}&mlon=${site.longitude}#map=15/${site.latitude}/${site.longitude}`;
}

function fact(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

export default function LaunchSiteAtlas({
  expanded = false,
  launch,
  trajectory,
}: {
  expanded?: boolean;
  launch: Launch;
  trajectory: IllustrativeTrajectory;
}): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerLayerRef = useRef<LayerGroup | null>(null);
  const missionLayerRef = useRef<LayerGroup | null>(null);
  const tileLayerRef = useRef<TileLayer | null>(null);
  const leafletRef = useRef<typeof import('leaflet') | null>(null);
  const retryButtonRef = useRef<HTMLButtonElement>(null);
  const recoveredHeadingRef = useRef<HTMLHeadingElement>(null);
  const emptyStateRef = useRef<HTMLDivElement>(null);
  const retryRequestedRef = useRef(false);
  const [sites, setSites] = useState<LaunchSite[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dataState, setDataState] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading');
  const [requestVersion, setRequestVersion] = useState(0);
  const [retrying, setRetrying] = useState(false);
  const [mapState, setMapState] = useState<'loading' | 'ready' | 'degraded'>('loading');
  const [mapMounted, setMapMounted] = useState(false);
  const [zoom, setZoom] = useState(8);
  const [isOffline, setIsOffline] = useState(false);
  const [padQuery, setPadQuery] = useState('');
  const location = launch.location;

  const sortedSites = useMemo(() => {
    if (!location) return sites;
    return [...sites].sort((a, b) => distanceKm(location, a) - distanceKm(location, b));
  }, [location, sites]);
  const selectedSite = sites.find((site) => site.id === selectedId) || sortedSites[0] || null;
  const selectedIndex = selectedSite ? sortedSites.findIndex((site) => site.id === selectedSite.id) : -1;
  const nearestSite = sortedSites[0] || null;
  const matchingSites = useMemo(() => {
    const query = padQuery.trim().toLocaleLowerCase('en-US');
    if (!query) return sortedSites.slice(0, 6);
    return sortedSites.filter((site) =>
      [site.name, site.locationName, site.countryCode, ...site.agencies]
        .filter((value): value is string => typeof value === 'string')
        .some((value) => value.toLocaleLowerCase('en-US').includes(query))
    ).slice(0, 8);
  }, [padQuery, sortedSites]);
  const missionCorridor = useMemo(
    () => buildIllustrativeLaunchCorridor(launch, trajectory.modelKind),
    [launch, trajectory.modelKind]
  );
  const visual = selectedSite?.image ? selectLaunchVisualAsset(selectedSite.image) : null;

  useEffect(() => {
    if (!location) {
      setDataState('empty');
      return;
    }
    const controller = new AbortController();
    if (!retryRequestedRef.current) setDataState('loading');
    fetch(`/api/launch-sites?id=${encodeURIComponent(launch.id)}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Launch sites returned ${response.status}`);
        const payload: unknown = await response.json();
        if (!isLaunchSiteAtlasResponse(payload)) {
          throw new Error('Launch-site response was incomplete');
        }
        return payload;
      })
      .then((payload) => {
        const nextSites = Array.isArray(payload.sites) ? payload.sites : [];
        setSites(nextSites);
        setDataState(nextSites.length ? 'ready' : 'empty');
        setRetrying(false);
        if (nextSites.length) {
          const nearest = [...nextSites].sort((a, b) => distanceKm(location, a) - distanceKm(location, b))[0];
          setSelectedId(nearest.id);
        }
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setDataState('error');
        setRetrying(false);
      });
    return () => controller.abort();
  }, [launch.id, location, requestVersion]);

  useEffect(() => {
    if (!retryRequestedRef.current || retrying || dataState === 'loading') return;

    const frame = window.requestAnimationFrame(() => {
      if (dataState === 'ready') recoveredHeadingRef.current?.focus();
      else if (dataState === 'empty') emptyStateRef.current?.focus();
      else retryButtonRef.current?.focus();
      retryRequestedRef.current = false;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [dataState, retrying]);

  useEffect(() => {
    const updateNetwork = () => setIsOffline(!navigator.onLine);
    updateNetwork();
    window.addEventListener('online', updateNetwork);
    window.addEventListener('offline', updateNetwork);
    return () => {
      window.removeEventListener('online', updateNetwork);
      window.removeEventListener('offline', updateNetwork);
    };
  }, []);

  useEffect(() => {
    if (!containerRef.current || !location) return;
    let disposed = false;
    let map: LeafletMap | null = null;
    const fallbackTimer = window.setTimeout(() => {
      if (!disposed) setMapState((state) => state === 'ready' ? state : 'degraded');
    }, 10_000);

    void import('leaflet').then((leafletModule) => {
      if (disposed || !containerRef.current) return;
      const L = leafletModule.default;
      leafletRef.current = L;
      map = L.map(containerRef.current, {
        attributionControl: true,
        center: [location.lat, location.lng],
        keyboard: true,
        minZoom: 2,
        maxZoom: 18,
        scrollWheelZoom: true,
        zoom: 8,
        zoomControl: false,
      });
      mapRef.current = map;
      missionLayerRef.current = L.layerGroup().addTo(map);
      markerLayerRef.current = L.layerGroup().addTo(map);
      setMapMounted(true);
      const tiles = L.tileLayer(OPEN_MAP_TILES, {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);
      tileLayerRef.current = tiles;
      map.on('zoomend', () => setZoom(map?.getZoom() || 8));
      tiles.once('load', () => {
        window.clearTimeout(fallbackTimer);
        setMapState('ready');
      });
      tiles.on('tileerror', () => setMapState((state) => state === 'ready' ? state : 'degraded'));
      const mapElement = map.getContainer();
      mapElement.setAttribute('aria-label', `Interactive launch-site map for ${launch.name}`);
      mapElement.setAttribute('role', 'application');
    }).catch(() => setMapState('degraded'));

    return () => {
      disposed = true;
      window.clearTimeout(fallbackTimer);
      map?.remove();
      mapRef.current = null;
      markerLayerRef.current = null;
      missionLayerRef.current = null;
      tileLayerRef.current = null;
      leafletRef.current = null;
      setMapMounted(false);
    };
  }, [launch.name, location]);

  useEffect(() => {
    const L = leafletRef.current;
    const layer = missionLayerRef.current;
    if (!L || !layer || !location) return;
    layer.clearLayers();

    if (missionCorridor.length > 1) {
      L.polyline(missionCorridor.map((point) => [point.lat, point.lng] as [number, number]), {
        bubblingMouseEvents: false,
        className: 'mission-corridor-halo',
        color: '#05060a',
        opacity: 0.82,
        weight: 9,
      }).addTo(layer);
      L.polyline(missionCorridor.map((point) => [point.lat, point.lng] as [number, number]), {
        bubblingMouseEvents: false,
        className: 'mission-corridor-line',
        color: '#5ee6a8',
        dashArray: '8 7',
        lineCap: 'round',
        opacity: 0.96,
        weight: 3,
      }).addTo(layer);
    }

    L.circleMarker([location.lat, location.lng], {
      bubblingMouseEvents: false,
      className: 'current-launch-beacon',
      color: '#5ee6a8',
      fillColor: '#05060a',
      fillOpacity: 0.96,
      radius: 11,
      weight: 3,
    }).bindTooltip(`CURRENT LAUNCH · ${trajectory.siteLabel}`, {
      className: 'current-launch-label',
      direction: 'top',
      offset: [0, -11],
      opacity: 1,
      permanent: true,
    }).addTo(layer);
  }, [location, mapMounted, missionCorridor, trajectory.siteLabel]);

  useEffect(() => {
    const L = leafletRef.current;
    const layer = markerLayerRef.current;
    if (!L || !layer) return;
    layer.clearLayers();
    sites.forEach((site) => {
      const selected = site.id === selectedId;
      const marker = L.circleMarker([site.latitude, site.longitude], {
        bubblingMouseEvents: false,
        color: '#05060a',
        fillColor: selected ? '#5ee6a8' : site.active ? '#58c8e8' : '#f4b95f',
        fillOpacity: 0.95,
        radius: selected ? 9 : 6,
        weight: 2,
      });
      marker.bindTooltip(site.name, {
        className: 'launch-site-label',
        direction: 'top',
        offset: [0, -8],
        opacity: 1,
        permanent: zoom >= 10,
      });
      marker.on('click', () => setSelectedId(site.id));
      marker.addTo(layer);
    });
  }, [selectedId, sites, zoom]);

  const focusSite = useCallback((site: LaunchSite) => {
    setSelectedId(site.id);
    mapRef.current?.flyTo([site.latitude, site.longitude], Math.max(13, mapRef.current.getZoom()), { duration: 0.7 });
  }, []);

  const fitRegion = useCallback(() => {
    const map = mapRef.current;
    const L = leafletRef.current;
    if (!map || !L || !sites.length) return;
    map.flyToBounds(L.latLngBounds(sites.map((site) => [site.latitude, site.longitude])), {
      padding: [expanded ? 70 : 45, expanded ? 70 : 45], maxZoom: 11, duration: 0.7,
    });
  }, [expanded, sites]);

  const centerCurrentLaunch = useCallback(() => {
    if (!location || !mapRef.current) return;
    mapRef.current.flyTo(
      [location.lat, location.lng],
      Math.max(13, mapRef.current.getZoom()),
      { duration: 0.65 }
    );
  }, [location]);

  const stepSite = (direction: -1 | 1) => {
    if (!sortedSites.length) return;
    const next = sortedSites[(Math.max(0, selectedIndex) + direction + sortedSites.length) % sortedSites.length];
    focusSite(next);
  };

  const retryPadData = () => {
    if (retrying || isOffline) return;
    retryRequestedRef.current = true;
    setRetrying(true);
    setRequestVersion((version) => version + 1);
  };

  if (!location) {
    return (
      <div className="grid min-h-80 place-items-center bg-[var(--surface-sunken)] px-6 text-center" data-launch-site-atlas>
        <div><MapPin aria-hidden="true" className="mx-auto text-[var(--console-amber)]" /><p className="mt-3 font-semibold">Launch-site atlas unavailable</p><p className="mt-1 text-sm text-[var(--text-muted)]">The provider did not report coordinates for this mission.</p></div>
      </div>
    );
  }

  return (
    <div className={`grid w-full min-h-0 min-w-0 max-w-full grid-cols-[minmax(0,1fr)] overflow-hidden bg-[var(--surface-sunken)] ${expanded ? 'h-full lg:grid-cols-[minmax(0,1.6fr)_minmax(22rem,0.7fr)]' : 'xl:grid-cols-[minmax(0,1.55fr)_minmax(20rem,0.7fr)]'}`} data-launch-site-atlas>
      <div className={`relative min-w-0 max-w-full overflow-hidden border-[var(--border-subtle)] ${expanded ? 'min-h-[18rem] sm:min-h-[24rem] lg:min-h-0 lg:border-r' : 'min-h-[28rem] xl:border-r'}`}>
        <div ref={containerRef} className="launch-site-atlas-map absolute inset-0" data-atlas-map />
        <div aria-hidden="true" className="launch-site-atlas-brand-overlay pointer-events-none absolute inset-0 z-[350]" />
        <div className="pointer-events-none absolute left-3 right-3 top-3 z-[600] flex min-w-0 flex-wrap items-start justify-between gap-2">
          <div className="pointer-events-auto min-w-0 max-w-full rounded-lg border border-white/10 bg-[rgba(5,6,10,0.9)] px-3 py-2 shadow-lg backdrop-blur">
            <div className="flex min-w-0 flex-wrap items-center gap-2 break-words font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--console-green)]">
              <Route aria-hidden="true" size={13} /> Current launch + ascent
            </div>
            <p className="mt-1 max-w-[17rem] truncate text-xs font-semibold text-[var(--text-primary)]">{trajectory.siteLabel}</p>
            <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">
              {dataState === 'loading' || retrying ? 'Loading nearby facilities…' : dataState === 'error' ? 'Facility feed unavailable' : dataState === 'empty' ? 'No nearby pads reported' : zoom < 10 ? `${sites.length} pads · zoom closer to reveal names` : `${sites.length} pads · facility names visible`}
            </p>
          </div>
          <div className="pointer-events-auto flex min-w-0 max-w-full flex-wrap justify-end gap-1 rounded-lg border border-white/10 bg-[rgba(5,6,10,0.9)] p-1 shadow-lg backdrop-blur" role="group" aria-label="Atlas controls">
            <button type="button" className="icon-button h-11 w-11" onClick={() => mapRef.current?.zoomOut()} aria-label="Zoom atlas out"><Minus aria-hidden="true" size={16} /></button>
            <button type="button" className="icon-button h-11 w-11" onClick={() => mapRef.current?.zoomIn()} aria-label="Zoom atlas in"><Plus aria-hidden="true" size={16} /></button>
            <button type="button" className="icon-button h-11 w-11" onClick={centerCurrentLaunch} aria-label="Center current launch"><LocateFixed aria-hidden="true" size={16} /></button>
            <button type="button" className="icon-button h-11 w-11" onClick={fitRegion} disabled={!sites.length} aria-label="Fit nearby launch pads"><Layers3 aria-hidden="true" size={16} /></button>
            <button type="button" className="icon-button h-11 w-11" onClick={() => mapRef.current?.flyTo([location.lat, location.lng], 8, { duration: 0.6 })} aria-label="Reset atlas to launch region"><RotateCcw aria-hidden="true" size={16} /></button>
          </div>
        </div>
        {mapState === 'loading' ? <div className="pointer-events-none absolute inset-0 grid place-items-center bg-[var(--surface-sunken)]"><div className="text-center"><LoaderCircle aria-hidden="true" className="mx-auto animate-spin text-[var(--console-cyan)]" /><p className="mt-2 text-sm text-[var(--text-muted)]">Loading open map…</p></div></div> : null}
        <div className="pointer-events-none absolute bottom-8 left-3 z-[600] flex max-w-[calc(100%-1.5rem)] items-center gap-2 rounded border border-[rgba(94,230,168,0.25)] bg-[rgba(5,6,10,0.9)] px-2.5 py-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--console-green)]"><span className="h-0 w-6 border-t-2 border-dashed border-[var(--console-green)]" /> Illustrative ascent corridor</div>
        {(mapState === 'degraded' || isOffline) ? <div role="status" className="absolute bottom-16 left-3 z-[650] max-w-sm rounded border border-[rgba(244,185,95,0.35)] bg-[rgba(16,14,9,0.94)] px-3 py-2 text-xs text-[var(--console-amber)]">{isOffline ? 'Offline: cached facts remain available; map tiles may be incomplete.' : 'The base map is unavailable. Mission origin, ascent model, pad facts, and links remain available.'}</div> : null}
        <p className="sr-only">Use arrow keys to pan, plus and minus to zoom, or choose a facility from the learning panel.</p>
      </div>

      <aside className={`min-h-0 min-w-0 max-w-full border-t border-[var(--border-subtle)] bg-[var(--surface-base)] ${expanded ? 'overflow-y-auto lg:border-t-0' : 'xl:border-t-0'}`} aria-label="Launch site learning panel">
        {dataState === 'loading' ? (
          <div className="grid min-h-72 place-items-center p-6 text-center"><div><LoaderCircle aria-hidden="true" className="mx-auto animate-spin text-[var(--console-green)]" /><p className="mt-3 text-sm font-semibold">Building the local pad atlas</p><p className="mt-1 text-xs text-[var(--text-muted)]">Finding launch facilities within 250 km.</p></div></div>
        ) : dataState === 'error' ? (
          <div className="grid min-h-72 place-items-center p-6 text-center">
            <div className="max-w-sm">
              <Radio aria-hidden="true" className="mx-auto text-[var(--console-amber)]" />
              <p className="mt-3 font-semibold text-[var(--console-amber)]">Nearby pad data is unavailable</p>
              <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">You can still explore the open map and this mission’s reported coordinates.</p>
              <p role="status" aria-live="polite" className="mt-2 text-xs text-[var(--text-secondary)]">
                {retrying
                  ? 'Reconnecting to the facility feed…'
                  : isOffline
                    ? 'Reconnect to request nearby facility data.'
                    : 'The failure may be temporary.'}
              </p>
              <button
                ref={retryButtonRef}
                type="button"
                aria-label={retrying ? 'Retrying nearby pad data' : 'Retry nearby pad data'}
                aria-disabled={retrying || isOffline}
                aria-busy={retrying}
                onClick={retryPadData}
                className="action-button action-button-quiet mx-auto mt-5 min-h-11 aria-disabled:cursor-wait aria-disabled:opacity-60"
              >
                <RefreshCw aria-hidden="true" size={16} className={retrying ? 'animate-spin' : ''} />
                {retrying ? 'Retrying pad data' : isOffline ? 'Retry when online' : 'Retry pad data'}
              </button>
            </div>
          </div>
        ) : dataState === 'empty' || !selectedSite ? (
          <div ref={emptyStateRef} tabIndex={-1} className="p-6 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--console-cyan)]"><p className="font-semibold">No neighboring facilities reported</p><p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">Launch Library 2 has no pads with coordinates in this 250 km region.</p></div>
        ) : (
          <div>
            {visual ? (
              <figure className="relative aspect-[16/8.5] overflow-hidden border-b border-[var(--border-subtle)] bg-black">
                <Image src={visual.url} alt={`${selectedSite.name} launch facility`} fill unoptimized sizes="(min-width: 1280px) 30vw, 100vw" className="object-cover" />
                <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 to-transparent px-4 pb-3 pt-10 text-[10px] text-white/75">
                  {visual.credit} · <a href={visual.licenseUrl} target="_blank" rel="noopener noreferrer" className="underline">{visual.licenseName}<ExternalLinkHint /></a>
                </figcaption>
              </figure>
            ) : null}
            <div className="p-4 sm:p-5">
              <div className="mb-5 rounded-lg border border-[rgba(94,230,168,0.3)] bg-[rgba(94,230,168,0.07)] p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0"><p className="console-label text-[var(--console-green)]">Current mission launch point</p><p className="mt-1 truncate text-sm font-semibold text-[var(--text-primary)]">{trajectory.siteLabel}</p><p className="mt-1 text-[11px] leading-relaxed text-[var(--text-muted)]">The dashed ascent model stays anchored here at every zoom.</p></div>
                  <button type="button" className="icon-button h-11 w-11 shrink-0" onClick={centerCurrentLaunch} aria-label="Center current launch"><LocateFixed aria-hidden="true" size={17} /></button>
                </div>
              </div>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="console-label flex flex-wrap items-center gap-1.5"><BookOpen aria-hidden="true" size={13} /> Field guide · {selectedIndex + 1} of {sortedSites.length}{selectedSite.id === nearestSite?.id ? <span className="text-[var(--console-green)]">· nearest reported pad</span> : null}</p>
                  <h3 ref={recoveredHeadingRef} tabIndex={-1} className="mt-2 scroll-mt-4 break-words text-lg font-bold leading-tight text-[var(--text-primary)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--console-cyan)]">{selectedSite.name}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">{selectedSite.locationName}{selectedSite.countryCode ? ` · ${selectedSite.countryCode}` : ''}</p>
                </div>
                <span className={`shrink-0 rounded border px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-wider ${selectedSite.active ? 'border-[rgba(94,230,168,0.35)] text-[var(--console-green)]' : 'border-[rgba(244,185,95,0.35)] text-[var(--console-amber)]'}`}>{selectedSite.active ? 'Active' : 'Retired'}</span>
              </div>

              <dl className="mt-4 grid grid-cols-3 divide-x divide-[var(--border-subtle)] rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-sunken)] py-3 text-center">
                <div><dt className="font-mono text-[9px] uppercase tracking-wider text-[var(--text-muted)]">Launches</dt><dd className="mt-1 text-lg font-bold text-[var(--console-green)]">{fact(selectedSite.totalLaunchCount)}</dd></div>
                <div><dt className="font-mono text-[9px] uppercase tracking-wider text-[var(--text-muted)]">Orbital tries</dt><dd className="mt-1 text-lg font-bold text-[var(--console-cyan)]">{fact(selectedSite.orbitalLaunchAttemptCount)}</dd></div>
                <div><dt className="font-mono text-[9px] uppercase tracking-wider text-[var(--text-muted)]">From mission</dt><dd className="mt-1 text-lg font-bold text-[var(--text-primary)]">{distanceKm(location, selectedSite).toFixed(distanceKm(location, selectedSite) < 10 ? 1 : 0)}<span className="ml-0.5 text-[10px] text-[var(--text-muted)]">km</span></dd></div>
              </dl>

              <div className="mt-4">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--console-cyan)]">Why this site matters</p>
                <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">{selectedSite.description || selectedSite.locationDescription || `${selectedSite.name} is one of ${sites.length} launch facilities reported within 250 km of this mission's launch point.`}</p>
              </div>
              {selectedSite.agencies.length ? <div className="mt-4"><p className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">Operators and agencies</p><p className="mt-1.5 text-xs leading-relaxed text-[var(--text-secondary)]">{selectedSite.agencies.join(' · ')}</p></div> : null}

              <div className="mt-5 flex gap-2">
                <button type="button" className="action-button action-button-quiet min-h-11 flex-1 text-xs" onClick={() => stepSite(-1)} aria-label="Explore previous nearby launch pad"><ChevronLeft aria-hidden="true" size={15} /> Previous</button>
                <button type="button" className="action-button min-h-11 flex-1 text-xs" onClick={() => stepSite(1)} aria-label="Explore next nearby launch pad">Next pad <ChevronRight aria-hidden="true" size={15} /></button>
              </div>

              <div className="mt-5 border-t border-[var(--border-subtle)] pt-4">
                <label htmlFor={`pad-search-${launch.id}`} className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">Find a launch pad</label>
                <div className="relative mt-2">
                  <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={15} />
                  <input id={`pad-search-${launch.id}`} type="search" value={padQuery} onChange={(event) => setPadQuery(event.target.value)} placeholder="Pad, location, or operator" className="min-h-11 w-full rounded-md border border-[var(--border-subtle)] bg-[var(--surface-sunken)] py-2 pl-9 pr-3 text-sm text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-muted)] focus:border-[var(--console-cyan)] focus:ring-2 focus:ring-[rgba(88,200,232,0.2)]" />
                </div>
                <div className="mt-2 grid min-w-0 grid-cols-[minmax(0,1fr)] gap-1">
                  {matchingSites.map((site) => <button key={site.id} type="button" aria-pressed={site.id === selectedSite.id} onClick={() => focusSite(site)} className={`flex min-h-11 min-w-0 max-w-full items-center justify-between gap-3 rounded px-2.5 text-left text-xs transition-colors ${site.id === selectedSite.id ? 'bg-[rgba(94,230,168,0.1)] text-[var(--console-green)]' : 'text-[var(--text-secondary)] hover:bg-white/5 hover:text-[var(--text-primary)]'}`}><span className="min-w-0 truncate">{site.name}</span><span className="shrink-0 font-mono text-[10px] text-[var(--text-muted)]">{site.id === nearestSite?.id ? 'nearest · ' : ''}{distanceKm(location, site).toFixed(1)} km</span></button>)}
                  {matchingSites.length === 0 ? <p role="status" className="rounded border border-dashed border-[var(--border-subtle)] px-3 py-4 text-xs text-[var(--text-muted)]">No pads match “{padQuery.trim()}”. Try a pad, location, or operator name.</p> : null}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                <a href={mapUrl(selectedSite)} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1.5 text-[var(--console-cyan)] hover:text-[var(--text-primary)]"><MapPin aria-hidden="true" size={14} /> OpenStreetMap <ExternalLink aria-hidden="true" size={12} /><ExternalLinkHint /></a>
                {selectedSite.infoUrl ? <a href={selectedSite.infoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1.5 text-[var(--console-cyan)] hover:text-[var(--text-primary)]"><Satellite aria-hidden="true" size={14} /> Official info <ExternalLinkHint /></a> : null}
                {selectedSite.wikiUrl ? <a href={selectedSite.wikiUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1.5 text-[var(--console-cyan)] hover:text-[var(--text-primary)]"><Globe2 aria-hidden="true" size={14} /> Background <ExternalLinkHint /></a> : null}
              </div>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
