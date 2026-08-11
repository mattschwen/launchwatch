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
  MapPin,
  Minus,
  Plus,
  Radio,
  RotateCcw,
  Satellite,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { LayerGroup, Map as LeafletMap, TileLayer } from 'leaflet';
import ExternalLinkHint from '@/components/ui/ExternalLinkHint';
import { selectLaunchVisualAsset } from '@/lib/launch-visual';
import type { Launch, LaunchSite, LaunchSiteAtlasResponse } from '@/lib/types';

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
}: {
  expanded?: boolean;
  launch: Launch;
}): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerLayerRef = useRef<LayerGroup | null>(null);
  const tileLayerRef = useRef<TileLayer | null>(null);
  const leafletRef = useRef<typeof import('leaflet') | null>(null);
  const [sites, setSites] = useState<LaunchSite[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dataState, setDataState] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading');
  const [mapState, setMapState] = useState<'loading' | 'ready' | 'degraded'>('loading');
  const [zoom, setZoom] = useState(8);
  const [isOffline, setIsOffline] = useState(false);
  const location = launch.location;

  const sortedSites = useMemo(() => {
    if (!location) return sites;
    return [...sites].sort((a, b) => distanceKm(location, a) - distanceKm(location, b));
  }, [location, sites]);
  const selectedSite = sites.find((site) => site.id === selectedId) || sortedSites[0] || null;
  const selectedIndex = selectedSite ? sortedSites.findIndex((site) => site.id === selectedSite.id) : -1;
  const visual = selectedSite?.image ? selectLaunchVisualAsset(selectedSite.image) : null;

  useEffect(() => {
    if (!location) {
      setDataState('empty');
      return;
    }
    const controller = new AbortController();
    setDataState('loading');
    fetch(`/api/launch-sites?id=${encodeURIComponent(launch.id)}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Launch sites returned ${response.status}`);
        return response.json() as Promise<LaunchSiteAtlasResponse>;
      })
      .then((payload) => {
        const nextSites = Array.isArray(payload.sites) ? payload.sites : [];
        setSites(nextSites);
        setDataState(nextSites.length ? 'ready' : 'empty');
        if (nextSites.length) {
          const nearest = [...nextSites].sort((a, b) => distanceKm(location, a) - distanceKm(location, b))[0];
          setSelectedId(nearest.id);
        }
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setDataState('error');
      });
    return () => controller.abort();
  }, [launch.id, location]);

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
      markerLayerRef.current = L.layerGroup().addTo(map);
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
      tileLayerRef.current = null;
      leafletRef.current = null;
    };
  }, [launch.name, location]);

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

  const stepSite = (direction: -1 | 1) => {
    if (!sortedSites.length) return;
    const next = sortedSites[(Math.max(0, selectedIndex) + direction + sortedSites.length) % sortedSites.length];
    focusSite(next);
  };

  if (!location) {
    return (
      <div className="grid min-h-80 place-items-center bg-[var(--surface-sunken)] px-6 text-center" data-launch-site-atlas>
        <div><MapPin aria-hidden="true" className="mx-auto text-[var(--console-amber)]" /><p className="mt-3 font-semibold">Launch-site atlas unavailable</p><p className="mt-1 text-sm text-[var(--text-muted)]">The provider did not report coordinates for this mission.</p></div>
      </div>
    );
  }

  return (
    <div className={`grid min-h-0 bg-[var(--surface-sunken)] ${expanded ? 'lg:grid-cols-[minmax(0,1.6fr)_minmax(22rem,0.7fr)]' : 'xl:grid-cols-[minmax(0,1.55fr)_minmax(20rem,0.7fr)]'}`} data-launch-site-atlas>
      <div className={`relative min-h-[28rem] overflow-hidden border-[var(--border-subtle)] ${expanded ? 'lg:min-h-0 lg:border-r' : 'xl:border-r'}`}>
        <div ref={containerRef} className="absolute inset-0" data-atlas-map />
        <div className="absolute left-3 right-3 top-3 flex flex-wrap items-start justify-between gap-2 pointer-events-none">
          <div className="pointer-events-auto rounded-lg border border-white/10 bg-[rgba(5,6,10,0.9)] px-3 py-2 shadow-lg backdrop-blur">
            <div className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--console-cyan)]">
              <Radio aria-hidden="true" size={13} /> Pad visibility
            </div>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              {dataState === 'loading' ? 'Loading nearby facilities…' : dataState === 'error' ? 'Facility feed unavailable' : dataState === 'empty' ? 'No nearby pads reported' : zoom < 10 ? `${sites.length} pads · zoom closer to reveal names` : `${sites.length} pads · facility names visible`}
            </p>
          </div>
          <div className="pointer-events-auto flex gap-1 rounded-lg border border-white/10 bg-[rgba(5,6,10,0.9)] p-1 shadow-lg backdrop-blur" role="group" aria-label="Atlas controls">
            <button type="button" className="icon-button h-11 w-11" onClick={() => mapRef.current?.zoomOut()} aria-label="Zoom atlas out"><Minus aria-hidden="true" size={16} /></button>
            <button type="button" className="icon-button h-11 w-11" onClick={() => mapRef.current?.zoomIn()} aria-label="Zoom atlas in"><Plus aria-hidden="true" size={16} /></button>
            <button type="button" className="icon-button h-11 w-11" onClick={fitRegion} disabled={!sites.length} aria-label="Fit nearby launch pads"><Layers3 aria-hidden="true" size={16} /></button>
            <button type="button" className="icon-button h-11 w-11" onClick={() => mapRef.current?.flyTo([location.lat, location.lng], 8, { duration: 0.6 })} aria-label="Reset atlas to launch region"><RotateCcw aria-hidden="true" size={16} /></button>
          </div>
        </div>
        {mapState === 'loading' ? <div className="pointer-events-none absolute inset-0 grid place-items-center bg-[var(--surface-sunken)]"><div className="text-center"><LoaderCircle aria-hidden="true" className="mx-auto animate-spin text-[var(--console-cyan)]" /><p className="mt-2 text-sm text-[var(--text-muted)]">Loading open map…</p></div></div> : null}
        {(mapState === 'degraded' || isOffline) ? <div role="status" className="absolute bottom-8 left-3 max-w-sm rounded border border-[rgba(244,185,95,0.35)] bg-[rgba(16,14,9,0.94)] px-3 py-2 text-xs text-[var(--console-amber)]">{isOffline ? 'Offline: cached facts remain available; map tiles may be incomplete.' : 'The base map is unavailable. Pad facts and links remain available.'}</div> : null}
        <p className="sr-only">Use arrow keys to pan, plus and minus to zoom, or choose a facility from the learning panel.</p>
      </div>

      <aside className={`min-h-0 border-t border-[var(--border-subtle)] bg-[var(--surface-base)] ${expanded ? 'overflow-y-auto lg:border-t-0' : 'xl:border-t-0'}`} aria-label="Launch site learning panel">
        {dataState === 'loading' ? (
          <div className="grid min-h-72 place-items-center p-6 text-center"><div><LoaderCircle aria-hidden="true" className="mx-auto animate-spin text-[var(--console-green)]" /><p className="mt-3 text-sm font-semibold">Building the local pad atlas</p><p className="mt-1 text-xs text-[var(--text-muted)]">Finding launch facilities within 250 km.</p></div></div>
        ) : dataState === 'error' ? (
          <div className="p-6"><p className="font-semibold text-[var(--console-amber)]">Nearby pad data is unavailable</p><p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">You can still explore the open map and this mission’s reported coordinates.</p></div>
        ) : dataState === 'empty' || !selectedSite ? (
          <div className="p-6"><p className="font-semibold">No neighboring facilities reported</p><p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">Launch Library 2 has no pads with coordinates in this 250 km region.</p></div>
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
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="console-label flex items-center gap-1.5"><BookOpen aria-hidden="true" size={13} /> Field guide · {selectedIndex + 1} of {sortedSites.length}</p>
                  <h3 className="mt-2 break-words text-lg font-bold leading-tight text-[var(--text-primary)]">{selectedSite.name}</h3>
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
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">Closest pads</p>
                <div className="mt-2 grid gap-1">
                  {sortedSites.slice(0, 6).map((site) => <button key={site.id} type="button" aria-pressed={site.id === selectedSite.id} onClick={() => focusSite(site)} className={`flex min-h-11 items-center justify-between gap-3 rounded px-2.5 text-left text-xs transition-colors ${site.id === selectedSite.id ? 'bg-[rgba(94,230,168,0.1)] text-[var(--console-green)]' : 'text-[var(--text-secondary)] hover:bg-white/5 hover:text-[var(--text-primary)]'}`}><span className="min-w-0 truncate">{site.name}</span><span className="shrink-0 font-mono text-[10px] text-[var(--text-muted)]">{distanceKm(location, site).toFixed(1)} km</span></button>)}
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
