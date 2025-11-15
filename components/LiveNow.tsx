'use client';

import { Launch } from '@/lib/types';
import Countdown from './Countdown';

interface LiveNowProps {
  launch: Launch;
}

export default function LiveNow({ launch }: LiveNowProps) {
  // Extract YouTube video ID if available
  const getYouTubeEmbedUrl = (url: string | null): string | null => {
    if (!url) return null;

    // Handle various YouTube URL formats
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\?\/]+)/,
      /youtube\.com\/live\/([^&\?\/]+)/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return `https://www.youtube.com/embed/${match[1]}?autoplay=1&mute=0`;
      }
    }

    return url;
  };

  const embedUrl = getYouTubeEmbedUrl(launch.livestream);

  return (
    <div className="w-full bg-gradient-to-b from-red-900/20 to-transparent border-2 border-red-500/50 rounded-lg p-6 mb-8 animate-fade-in">
      <div className="flex items-center gap-3 mb-4">
        <div className="relative">
          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
          <div className="absolute inset-0 w-3 h-3 bg-red-500 rounded-full animate-ping"></div>
        </div>
        <h2 className="text-3xl font-bold text-red-500">LAUNCH HAPPENING NOW!</h2>
      </div>

      {embedUrl && (
        <div className="aspect-video w-full mb-6 rounded-lg overflow-hidden bg-black">
          <iframe
            src={embedUrl}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
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

        {!embedUrl && launch.livestream && (
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
