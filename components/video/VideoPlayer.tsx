'use client';

import { useState } from 'react';
import { ExternalLink, Play, Tv } from 'lucide-react';
import { extractYouTubeId } from '@/lib/youtube';

interface VideoPlayerProps {
  url: string | null;
  title?: string;
  className?: string;
  autoplay?: boolean;
}

export default function VideoPlayer({
  url,
  title,
  className = '',
  autoplay = false,
}: VideoPlayerProps): React.ReactElement {
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);

  if (!url) {
    return (
      <div
        className={`flex aspect-video w-full flex-col items-center justify-center gap-3 bg-[var(--surface-base)] ${className}`}
      >
        <Tv aria-hidden="true" size={32} className="text-[var(--text-muted)]" />
        <p className="text-sm text-[var(--text-muted)]">
          Stream availability has not been confirmed.
        </p>
      </div>
    );
  }

  const videoId = extractYouTubeId(url);
  if (!videoId) {
    return (
      <div
        className={`flex aspect-video w-full flex-col items-center justify-center gap-4 bg-[var(--surface-base)] px-5 text-center ${className}`}
      >
        <Tv aria-hidden="true" size={32} className="text-[var(--text-muted)]" />
        <p className="text-sm text-[var(--text-secondary)]">
          This provider stream opens in a separate window.
        </p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="action-button action-button-secondary"
        >
          <ExternalLink aria-hidden="true" size={16} />
          Open provider stream
        </a>
      </div>
    );
  }

  const loaded = autoplay || loadedUrl === url;
  const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=${
    autoplay ? '1' : '0'
  }&rel=0&modestbranding=1`;

  if (!loaded) {
    return (
      <div
        className={`relative flex aspect-video w-full items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_center,rgba(94,230,168,0.09),transparent_36%),var(--surface-base)] ${className}`}
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(rgba(94,230,168,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(94,230,168,0.025)_1px,transparent_1px)] bg-[size:34px_34px]"
        />
        <button
          type="button"
          onClick={() => setLoadedUrl(url)}
          className="action-button action-button-primary relative"
          aria-label={`Load video for ${title || 'this launch'}`}
        >
          <Play aria-hidden="true" size={17} fill="currentColor" />
          Load video
        </button>
      </div>
    );
  }

  return (
    <div className={`aspect-video w-full overflow-hidden bg-black ${className}`}>
      <iframe
        src={embedUrl}
        title={title || 'Launch stream'}
        className="h-full w-full"
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}
