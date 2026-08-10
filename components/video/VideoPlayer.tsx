'use client';

import { useEffect, useRef, useState } from 'react';
import { ExternalLink, Play, ShieldCheck, Tv } from 'lucide-react';
import ExternalLinkHint from '@/components/ui/ExternalLinkHint';
import { extractYouTubeId } from '@/lib/youtube';

interface VideoPlayerProps {
  url: string | null;
  title?: string;
  className?: string;
  autoplay?: boolean;
  live?: boolean;
}

export default function VideoPlayer({
  url,
  title,
  className = '',
  autoplay = false,
  live = false,
}: VideoPlayerProps): React.ReactElement {
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const focusLoadedVideoRef = useRef(false);
  const videoId = url ? extractYouTubeId(url) : null;
  const loaded = Boolean(videoId) && (autoplay || loadedUrl === url);
  const youtubeWatchUrl = videoId
    ? `https://www.youtube.com/watch?v=${videoId}`
    : null;

  useEffect(() => {
    if (!loaded || !focusLoadedVideoRef.current) return;

    focusLoadedVideoRef.current = false;
    iframeRef.current?.focus({ preventScroll: true });
  }, [loaded]);

  if (!url) {
    return (
      <div
        className={`stream-surface signal-warm flex aspect-video w-full flex-col items-center justify-center gap-3 ${className}`}
      >
        <Tv
          aria-hidden="true"
          size={32}
          className="text-[var(--console-amber)]"
        />
        <p className="text-sm text-[var(--text-muted)]">
          Stream availability has not been confirmed.
        </p>
      </div>
    );
  }

  if (!videoId) {
    return (
      <div
        className={`stream-surface ${
          live ? 'signal-live' : 'signal-cold'
        } flex aspect-video w-full flex-col items-center justify-center gap-4 px-5 text-center ${className}`}
      >
        <Tv
          aria-hidden="true"
          size={32}
          className={
            live
              ? 'text-[var(--console-magenta)]'
              : 'text-[var(--console-cyan)]'
          }
        />
        <p className="text-sm text-[var(--text-secondary)]">
          This provider stream opens in a separate window.
        </p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className={`action-button ${
            live ? 'action-button-stream' : 'action-button-secondary'
          }`}
        >
          <ExternalLink aria-hidden="true" size={16} />
          Open provider stream
          <ExternalLinkHint />
        </a>
      </div>
    );
  }

  const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=${
    autoplay ? '1' : '0'
  }&rel=0&modestbranding=1`;

  if (!loaded) {
    return (
      <div
        className={`stream-surface relative flex min-h-[13rem] w-full items-center justify-center overflow-hidden px-4 py-5 sm:aspect-video ${
          live
            ? 'signal-live'
            : 'signal-cold'
        } ${className}`}
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(rgba(88,230,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,79,216,0.03)_1px,transparent_1px)] bg-[size:34px_34px]"
        />
        <div className="relative max-w-xl text-center">
          <p className="data-label text-[var(--console-cyan)]">
            Recommended playback
          </p>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            Open the exact video on YouTube to use your existing session.
            Embedded playback can ask you to sign in again even when YouTube is
            already open; LaunchWatch never receives your Google credentials.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <a
              href={youtubeWatchUrl ?? url}
              target="_blank"
              rel="noopener noreferrer"
              className={`action-button ${
                live ? 'action-button-stream' : 'action-button-primary'
              }`}
            >
              <ExternalLink aria-hidden="true" size={16} />
              Watch on YouTube
              <ExternalLinkHint />
            </a>
            <button
              type="button"
              onClick={() => {
                focusLoadedVideoRef.current = true;
                setLoadedUrl(url);
              }}
              className="action-button action-button-secondary"
              aria-label={`Try privacy-enhanced embedded video for ${
                title || 'this launch'
              }`}
            >
              <Play aria-hidden="true" size={17} fill="currentColor" />
              Try embedded player
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`video-player-frame w-full overflow-hidden bg-black ${className}`}
    >
      <div className="aspect-video w-full">
        <iframe
          ref={iframeRef}
          src={embedUrl}
          title={title || 'Launch stream'}
          className="h-full w-full"
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
      <div className="flex flex-col gap-3 border-t border-[var(--border-subtle)] bg-[var(--surface-base)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-2.5 text-left">
          <ShieldCheck
            aria-hidden="true"
            size={17}
            className="mt-0.5 shrink-0 text-[var(--console-green)]"
          />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              Embedded session blocked?
            </p>
            <p className="mt-0.5 text-xs leading-5 text-[var(--text-muted)]">
              Open this exact video on YouTube to use your existing session.
              LaunchWatch never handles your sign-in.
            </p>
          </div>
        </div>
        <a
          href={youtubeWatchUrl ?? url}
          target="_blank"
          rel="noopener noreferrer"
          className={`action-button w-full shrink-0 sm:w-auto ${
            live ? 'action-button-stream' : 'action-button-secondary'
          }`}
        >
          <ExternalLink aria-hidden="true" size={16} />
          Open exact video
          <ExternalLinkHint />
        </a>
      </div>
    </div>
  );
}
