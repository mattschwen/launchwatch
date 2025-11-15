'use client';

import { useState, useEffect } from 'react';
import { Launch } from '@/lib/types';
import Countdown from './Countdown';
import { getYouTubeEmbedUrl, generateYouTubeSearchUrl, getProviderYouTubeChannel } from '@/lib/youtube';

interface LiveNowProps {
  launch: Launch;
}

export default function LiveNow({ launch }: LiveNowProps) {
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);
  const [showSearchHelper, setShowSearchHelper] = useState(false);

  useEffect(() => {
    // Try to get embed URL from API
    const url = getYouTubeEmbedUrl(launch.livestream);
    setEmbedUrl(url);

    // If no URL, show search helper
    if (!url) {
      setShowSearchHelper(true);
    }
  }, [launch.livestream]);

  const searchUrl = generateYouTubeSearchUrl(launch);
  const channelUrl = getProviderYouTubeChannel(launch);

  return (
    <div className="w-full bg-gradient-to-b from-red-900/20 to-transparent border-2 border-red-500/50 rounded-lg p-6 mb-8 animate-fade-in">
      <div className="flex items-center gap-3 mb-4">
        <div className="relative">
          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
          <div className="absolute inset-0 w-3 h-3 bg-red-500 rounded-full animate-ping"></div>
        </div>
        <h2 className="text-3xl font-bold text-red-500">LAUNCH HAPPENING NOW!</h2>
      </div>

      {embedUrl && !embedUrl.includes('/results') && (
        <div className="aspect-video w-full mb-6 rounded-lg overflow-hidden bg-black">
          <iframe
            src={embedUrl}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
        </div>
      )}

      {showSearchHelper && !embedUrl && (
        <div className="bg-yellow-900/20 border-2 border-yellow-500/50 rounded-lg p-6 mb-6">
          <h3 className="text-yellow-400 font-bold text-lg mb-3">🔍 Find Livestream</h3>
          <p className="text-gray-300 mb-4 text-sm">
            The API doesn't have a livestream link yet. You can search for it:
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href={searchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              <span>🔍</span>
              <span>Search YouTube</span>
            </a>
            {channelUrl && (
              <a
                href={channelUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                <span>📺</span>
                <span>Provider Channel</span>
              </a>
            )}
            <a
              href="https://www.youtube.com/results?search_query=space+launch+live"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              <span>🚀</span>
              <span>All Space Streams</span>
            </a>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <h3 className="text-2xl font-bold text-white mb-2">{launch.name}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-300">
            <div>
              <span className="text-gray-400">Rocket:</span> <span className="font-semibold">{launch.rocket}</span>
            </div>
            <div>
              <span className="text-gray-400">Launch Site:</span> <span className="font-semibold">{launch.launchSite}</span>
            </div>
          </div>
        </div>

        {launch.description && (
          <p className="text-gray-300 text-sm">{launch.description}</p>
        )}

        <div className="pt-4 border-t border-gray-700">
          <p className="text-gray-400 text-sm mb-2">Time to Launch:</p>
          <Countdown targetDate={launch.date} />
        </div>

        {launch.livestream && !embedUrl?.includes('/results') && (
          <a
            href={launch.livestream}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors"
          >
            Watch Live Stream →
          </a>
        )}
      </div>
    </div>
  );
}
