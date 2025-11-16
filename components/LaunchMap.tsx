'use client';

import { Launch } from '@/lib/types';
import { useMemo } from 'react';

interface LaunchMapProps {
  launches: Launch[];
}

export default function LaunchMap({ launches }: LaunchMapProps) {
  // Get unique launch sites with coordinates
  const launchSites = useMemo(() => {
    const sitesMap = new Map<string, { name: string; lat: number; lng: number; count: number; countryCode?: string }>();
    
    launches.forEach(launch => {
      if (launch.location) {
        const key = `${launch.location.lat},${launch.location.lng}`;
        const existing = sitesMap.get(key);
        
        if (existing) {
          existing.count++;
        } else {
          sitesMap.set(key, {
            name: launch.location.name,
            lat: launch.location.lat,
            lng: launch.location.lng,
            count: 1,
            countryCode: launch.location.countryCode
          });
        }
      }
    });
    
    return Array.from(sitesMap.values());
  }, [launches]);

  // If no locations available, show message
  if (launchSites.length === 0) {
    return (
      <div className="glass rounded-xl p-6">
        <h2 className="text-xl font-bold gradient-text mb-4">🗺️ Launch Sites</h2>
        <div className="text-center py-8">
          <span className="text-4xl mb-3 block">🌍</span>
          <p className="text-[var(--text-secondary)]">Location data not available for current launches</p>
        </div>
      </div>
    );
  }

  // Calculate center point
  const centerLat = launchSites.reduce((sum, site) => sum + site.lat, 0) / launchSites.length;
  const centerLng = launchSites.reduce((sum, site) => sum + site.lng, 0) / launchSites.length;

  return (
    <div className="glass rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold gradient-text">🗺️ Launch Sites</h2>
        <span className="text-sm text-[var(--text-muted)]">{launchSites.length} locations</span>
      </div>

      {/* Embedded Google Maps */}
      <div className="relative w-full h-[400px] rounded-lg overflow-hidden border border-[var(--glass-border)]">
        <iframe
          width="100%"
          height="100%"
          frameBorder="0"
          style={{ border: 0 }}
          src={`https://www.google.com/maps/embed/v1/view?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 'demo'}&center=${centerLat},${centerLng}&zoom=2`}
          allowFullScreen
        ></iframe>
      </div>

      {/* Launch Sites List */}
      <div className="mt-4 space-y-2">
        {launchSites.map((site, index) => (
          <div key={index} className="flex items-center justify-between p-3 glass rounded-lg">
            <div className="flex items-center gap-2">
              <span className="text-lg">🚀</span>
              <div>
                <p className="text-sm font-semibold text-white">{site.name}</p>
                <p className="text-xs text-[var(--text-muted)]">
                  {site.lat.toFixed(4)}°, {site.lng.toFixed(4)}° {site.countryCode && `• ${site.countryCode}`}
                </p>
              </div>
            </div>
            <div className="px-2 py-1 bg-[var(--primary)]/20 text-[var(--primary)] rounded-full text-xs font-semibold">
              {site.count} {site.count === 1 ? 'launch' : 'launches'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

