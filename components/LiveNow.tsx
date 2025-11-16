'use client';

import { useState, useEffect } from 'react';
import { Launch } from '@/lib/types';
import Countdown from './Countdown';
import { getYouTubeEmbedUrl, generateYouTubeSearchUrl, getProviderYouTubeChannel } from '@/lib/youtube';

interface LiveNowProps {
  launch: Launch;
}

export default function LiveNow({ launch }: LiveNowProps) {
  const embedUrl = getYouTubeEmbedUrl(launch.livestream);
  const [showSearchHelper, setShowSearchHelper] = useState(!embedUrl);

  useEffect(() => {
    // Update search helper visibility when embed URL changes
    setShowSearchHelper(!embedUrl);
  }, [embedUrl]);

  const searchUrl = generateYouTubeSearchUrl(launch);
  const channelUrl = getProviderYouTubeChannel(launch);

  return (
    <div className="glass border-2 border-[var(--live)]/50 rounded-xl p-4 animate-glow">
      <div className="flex items-center gap-2 mb-3">
        <div className="relative">
          <div className="w-2.5 h-2.5 bg-[var(--live)] rounded-full animate-pulse"></div>
          <div className="absolute inset-0 w-2.5 h-2.5 bg-[var(--live)] rounded-full animate-ping"></div>
        </div>
        <h2 className="text-lg sm:text-xl font-bold text-[var(--live)]">LIVE NOW</h2>
      </div>

      {embedUrl && !embedUrl.includes('/results') && (
        <div className="aspect-video w-full mb-4 rounded-lg overflow-hidden glass border border-[var(--live)]/30">
          <iframe
            src={embedUrl}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
        </div>
      )}

      {showSearchHelper && !embedUrl && (
        <div className="glass border border-[var(--warning)]/50 rounded-lg p-3 mb-4">
          <h3 className="text-[var(--warning)] font-bold text-sm mb-2">🔍 Find Livestream</h3>
          <div className="flex flex-wrap gap-2">
            <a href={searchUrl} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 bg-[var(--live)] text-white text-xs rounded-lg">
              Search YouTube
            </a>
            {channelUrl && (
              <a href={channelUrl} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 glass glass-hover text-white text-xs rounded-lg">
                Provider Channel
              </a>
            )}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <h3 className="text-lg font-bold text-[var(--text-primary)]">{launch.name}</h3>
        
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="glass rounded-lg p-2">
            <p className="text-[var(--text-muted)]">Rocket</p>
            <p className="font-medium text-[var(--text-primary)]">{launch.rocket}</p>
          </div>
          <div className="glass rounded-lg p-2">
            <p className="text-[var(--text-muted)]">Site</p>
            <p className="font-medium text-[var(--text-primary)] truncate">{launch.launchSite}</p>
          </div>
        </div>

        {launch.description && (
          <p className="text-[var(--text-secondary)] text-sm line-clamp-2">{launch.description}</p>
        )}

        <Countdown targetDate={launch.date} />

        {launch.livestream && !embedUrl?.includes('/results') && (
          <a
            href={launch.livestream}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-center px-4 py-2 bg-[var(--live)] hover:bg-[var(--live)]/80 text-white text-sm font-semibold rounded-lg transition-all"
          >
            Watch Live Stream →
          </a>
        )}
      </div>
    </div>
  );
}
