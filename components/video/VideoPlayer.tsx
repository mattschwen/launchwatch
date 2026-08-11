'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { ExternalLink, Play, ShieldCheck, Tv } from 'lucide-react';
import ExternalLinkHint from '@/components/ui/ExternalLinkHint';
import {
  launchVisualAlt,
  selectLaunchVisual,
} from '@/lib/launch-visual';
import type { Launch } from '@/lib/types';
import { extractYouTubeId } from '@/lib/youtube';

interface VideoPlayerProps {
  url: string | null;
  title?: string;
  className?: string;
  autoplay?: boolean;
  live?: boolean;
  launch?: Launch | null;
  visualPriority?: boolean;
}

function externalStreamDestination(url: string): string {
  try {
    const hostname = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
    if (hostname === 'x.com' || hostname === 'twitter.com') return 'X';
    return hostname || 'provider site';
  } catch {
    return 'provider site';
  }
}

export default function VideoPlayer({
  url,
  title,
  className = '',
  autoplay = false,
  live = false,
  launch = null,
  visualPriority = false,
}: VideoPlayerProps): React.ReactElement {
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
  const [failedVisualKey, setFailedVisualKey] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const focusLoadedVideoRef = useRef(false);
  const videoId = url ? extractYouTubeId(url) : null;
  const loaded = Boolean(videoId) && (autoplay || loadedUrl === url);
  const youtubeWatchUrl = videoId
    ? `https://www.youtube.com/watch?v=${videoId}`
    : null;
  const visualSelection = selectLaunchVisual(launch);
  const visual =
    visualSelection.status === 'available' ? visualSelection.visual : null;
  const visualKey = visual ? `${visual.kind}:${visual.url}` : null;
  const showVisual = Boolean(
    visual && visualKey && failedVisualKey !== visualKey
  );

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
    const destination = externalStreamDestination(url);

    if (launch && visual && visualKey && showVisual) {
      const visualType =
        visual.kind === 'vehicle' ? 'Vehicle reference' : 'Mission imagery';

      return (
        <div
          data-coverage-visual="true"
          data-visual-kind={visual.kind}
          className={`stream-surface ${
            live ? 'signal-live' : 'signal-cold'
          } relative isolate flex min-h-[24rem] w-full overflow-hidden bg-[var(--surface-canvas)] text-left sm:aspect-video sm:min-h-0 ${className}`}
        >
          <Image
            key={visualKey}
            src={visual.url}
            alt={launchVisualAlt(launch, visual)}
            fill
            priority={visualPriority}
            fetchPriority={visualPriority ? 'high' : undefined}
            sizes="(max-width: 1023px) calc(100vw - 2rem), 72vw"
            onError={() => setFailedVisualKey(visualKey)}
            className={`z-0 ${
              visual.kind === 'vehicle'
                ? 'object-contain p-6 sm:p-10 lg:p-14'
                : 'object-cover'
            }`}
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 z-[1] bg-[linear-gradient(180deg,rgba(5,6,10,0.08)_10%,rgba(5,6,10,0.18)_48%,rgba(5,6,10,0.96)_100%),repeating-linear-gradient(0deg,transparent_0_3px,rgba(88,230,255,0.025)_3px_4px)] shadow-[inset_0_0_72px_rgba(5,6,10,0.58)]"
          />
          <div className="relative z-[2] mt-auto w-full px-4 pb-4 pt-24 sm:px-6 sm:pb-5 sm:pt-32">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0 max-w-2xl">
                <div className="flex items-center gap-2">
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border bg-[rgba(5,6,10,0.72)] ${
                      live
                        ? 'border-[var(--console-magenta)]/45 text-[var(--console-magenta)]'
                        : 'border-[var(--console-cyan)]/40 text-[var(--console-cyan)]'
                    }`}
                  >
                    <Tv aria-hidden="true" size={19} />
                  </span>
                  <p
                    className={`data-label ${
                      live
                        ? 'text-[var(--console-magenta)]'
                        : 'text-[var(--console-cyan)]'
                    }`}
                  >
                    External coverage
                  </p>
                </div>
                <p className="mt-3 break-words text-xl font-semibold leading-7 text-white sm:text-2xl">
                  {title || launch.name}
                </p>
                <p className="mt-1 break-all font-mono text-xs uppercase tracking-[0.08em] text-[rgba(255,255,255,0.68)]">
                  Hosted on {destination}
                </p>
              </div>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className={`action-button w-full shrink-0 text-center sm:w-auto ${
                  live ? 'action-button-stream' : 'action-button-secondary'
                }`}
              >
                <ExternalLink aria-hidden="true" size={16} />
                Open {destination} stream
                <ExternalLinkHint />
              </a>
            </div>
            <div className="mt-3 flex min-w-0 flex-wrap items-center gap-x-3 border-t border-white/10 pt-2 font-mono text-[0.65rem] uppercase tracking-[0.07em] text-[rgba(255,255,255,0.62)]">
              <span className="text-[var(--console-cyan)]">{visualType}</span>
              <span className="min-w-0 break-words normal-case tracking-normal">
                Credit: {visual.credit}
              </span>
              <a
                href={visual.licenseUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center text-[var(--console-cyan)] underline decoration-[var(--console-cyan)]/45 underline-offset-4 hover:text-white"
                aria-label={`Open ${visual.licenseName} visual license in a new tab`}
              >
                {visual.licenseName}
              </a>
              {visual.sourceUrl ? (
                <a
                  href={visual.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center gap-1 text-[var(--console-cyan)] hover:text-white"
                  aria-label={`Open ${
                    visual.sourceLabel || 'visual'
                  } source record in a new tab`}
                >
                  Source
                  <ExternalLink aria-hidden="true" size={12} />
                </a>
              ) : null}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div
        className={`stream-surface ${
          live ? 'signal-live' : 'signal-cold'
        } flex min-h-[16rem] w-full flex-col items-center justify-center px-5 py-6 text-center sm:aspect-video sm:min-h-0 ${className}`}
      >
        <div className="flex max-w-xl flex-col items-center">
          <span
            className={`flex h-11 w-11 items-center justify-center rounded-full border bg-[var(--surface-accent)] ${
              live
                ? 'border-[var(--console-magenta)]/35 text-[var(--console-magenta)]'
                : 'border-[var(--console-cyan)]/30 text-[var(--console-cyan)]'
            }`}
          >
            <Tv aria-hidden="true" size={23} />
          </span>
          <p
            className={`data-label mt-4 ${
              live
                ? 'text-[var(--console-magenta)]'
                : 'text-[var(--console-cyan)]'
            }`}
          >
            External coverage
          </p>
          <p className="mt-2 max-w-full break-words text-lg font-semibold leading-6 text-[var(--text-primary)] sm:text-xl">
            {title || 'Provider stream'}
          </p>
          <p className="mt-3 max-w-full break-all font-mono text-xs uppercase tracking-[0.08em] text-[var(--text-muted)]">
            Hosted on {destination}
          </p>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            This provider stream opens in a separate window.
          </p>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className={`action-button mt-5 max-w-full break-all text-center ${
              live ? 'action-button-stream' : 'action-button-secondary'
            }`}
          >
            <ExternalLink aria-hidden="true" size={16} />
            Open {destination} stream
            <ExternalLinkHint />
          </a>
        </div>
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
