'use client';

import { useState } from 'react';
import { Tv, AlertCircle } from 'lucide-react';
import { getYouTubeEmbedUrl, extractYouTubeId } from '@/lib/youtube';

interface VideoPlayerProps {
  url: string | null;
  title?: string;
  className?: string;
  autoplay?: boolean;
}

export default function VideoPlayer({ url, title, className = '', autoplay = true }: VideoPlayerProps): React.ReactElement {
  const [error, setError] = useState(false);

  if (!url || error) {
    return (
      <div className={`aspect-video w-full bg-[var(--bg-tertiary)] rounded-lg flex flex-col items-center justify-center gap-3 ${className}`}>
        {error ? (
          <>
            <AlertCircle size={32} className="text-[var(--text-muted)]" />
            <p className="text-sm text-[var(--text-muted)]">Failed to load video</p>
          </>
        ) : (
          <>
            <Tv size={32} className="text-[var(--text-muted)]" />
            <p className="text-sm text-[var(--text-muted)]">Stream will appear here</p>
          </>
        )}
      </div>
    );
  }

  const videoId = extractYouTubeId(url);
  const isYouTubeSearch = url.includes('/results');

  if (isYouTubeSearch || !videoId) {
    return (
      <div className={`aspect-video w-full bg-[var(--bg-tertiary)] rounded-lg flex flex-col items-center justify-center gap-3 ${className}`}>
        <Tv size={32} className="text-[var(--text-muted)]" />
        <p className="text-sm text-[var(--text-muted)]">No stream available yet</p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-sm font-medium rounded-lg transition-colors"
        >
          Search YouTube
        </a>
      </div>
    );
  }

  const embedUrl = autoplay
    ? getYouTubeEmbedUrl(url)
    : `https://www.youtube.com/embed/${videoId}`;

  return (
    <div className={`aspect-video w-full bg-black rounded-lg overflow-hidden ${className}`}>
      <iframe
        src={embedUrl || undefined}
        title={title || 'Launch livestream'}
        className="w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        onError={() => setError(true)}
      />
    </div>
  );
}
