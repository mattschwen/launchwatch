'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import {
  ExternalLink,
  ImageOff,
  RefreshCw,
  ScanLine,
} from 'lucide-react';
import type { Launch } from '@/lib/types';
import {
  launchVisualAlt,
  launchVisualSubject,
  selectLaunchVisual,
  type EligibleLaunchVisual,
  type LaunchVisualStatus,
} from '@/lib/launch-visual';

interface MissionVisualProps {
  launch: Launch | null;
  priority?: boolean;
  compact?: boolean;
  className?: string;
  loading?: boolean;
  error?: string | null;
  showUnavailableState?: boolean;
}

interface AvailableMissionVisualProps {
  launch: Launch;
  visual: EligibleLaunchVisual;
  priority: boolean;
  compact: boolean;
  className: string;
}

function visualLabel(visual: EligibleLaunchVisual): string {
  return visual.kind === 'vehicle'
    ? 'Vehicle reference'
    : 'Mission imagery';
}

type PlaceholderVisualStatus =
  | Exclude<LaunchVisualStatus, 'available'>
  | 'degraded'
  | 'loading';

function PlaceholderMissionVisual({
  compact,
  className,
  status,
}: {
  compact: boolean;
  className: string;
  status: PlaceholderVisualStatus;
}): React.ReactElement {
  const loading = status === 'loading';
  const degraded = status === 'degraded';
  const rightsUnverified = status === 'rights-unverified';
  const title = loading
    ? 'Requesting licensed mission imagery'
    : degraded
      ? 'Visual metadata temporarily unavailable'
      : rightsUnverified
        ? 'Image withheld — usage rights unverified'
        : 'Provider image not supplied';
  const detail = loading
    ? 'Checking the canonical mission record for a reusable image.'
    : degraded
      ? 'The mission remains available while the visual source reconnects.'
      : rightsUnverified
        ? 'The source did not include enough permission data to display it safely.'
        : 'No vehicle or mission image accompanied this provider record.';

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      aria-label={
        loading ? 'Loading mission visual' : 'Mission visual unavailable'
      }
      className={`mission-visual ${
        loading
          ? 'mission-visual-loading signal-cold'
          : 'mission-visual-unavailable signal-warm'
      } surface-card holo-card ${
        compact ? 'mission-visual-compact' : ''
      } ${className}`}
      data-visual-status={status}
    >
      <div className="mission-visual-placeholder-viewport">
        {loading ? (
          <ScanLine aria-hidden="true" size={26} />
        ) : (
          <ImageOff aria-hidden="true" size={26} />
        )}
        <div>
          <p
            className={`data-label ${
              loading
                ? 'text-[var(--console-cyan)]'
                : 'text-[var(--console-amber)]'
            }`}
          >
            Visual acquisition
          </p>
          <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">
            {title}
          </p>
          <p className="mt-1 max-w-sm text-xs leading-5 text-[var(--text-muted)]">
            {detail}
          </p>
        </div>
      </div>
      <div
        aria-hidden="true"
        className="mission-visual-caption mission-visual-placeholder-caption"
      >
        <div>
          <p className="data-label text-[var(--console-cyan)]">
            Source controls
          </p>
          <p className="mission-visual-name">
            {loading ? 'Verification in progress' : 'Visual unavailable'}
          </p>
          <p className="mission-visual-credit">
            Credit, license, and source must be explicit.
          </p>
        </div>
        <div className="mission-visual-actions">
          <span className="mission-visual-placeholder-action" />
          <span className="mission-visual-placeholder-action" />
          <span className="mission-visual-placeholder-action" />
        </div>
      </div>
    </div>
  );
}

function AvailableMissionVisual({
  launch,
  visual,
  priority,
  compact,
  className,
}: AvailableMissionVisualProps): React.ReactElement {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const fullImageRef = useRef<HTMLAnchorElement>(null);
  const retryFocusPendingRef = useRef(false);
  const focusFrameRef = useRef<number | null>(null);
  const label = visualLabel(visual);
  const subject = launchVisualSubject(launch, visual);
  const source = visual.sourceLabel
    ? ` · via ${visual.sourceLabel}`
    : '';

  useEffect(
    () => () => {
      if (focusFrameRef.current !== null) {
        window.cancelAnimationFrame(focusFrameRef.current);
      }
    },
    []
  );

  const retryImage = (): void => {
    if (retrying) return;
    retryFocusPendingRef.current = true;
    setLoaded(false);
    setFailed(false);
    setRetrying(true);
    setAttempt((value) => value + 1);
  };

  const imageLoaded = (): void => {
    setLoaded(true);
    setFailed(false);
    setRetrying(false);

    if (retryFocusPendingRef.current) {
      retryFocusPendingRef.current = false;
      focusFrameRef.current = window.requestAnimationFrame(() => {
        fullImageRef.current?.focus();
        focusFrameRef.current = null;
      });
    }
  };

  const imageFailed = (): void => {
    setLoaded(false);
    setFailed(true);
    setRetrying(false);
  };

  return (
    <figure
      aria-busy={retrying || (!loaded && !failed)}
      className={`mission-visual surface-card holo-card signal-cold ${
        compact ? 'mission-visual-compact' : ''
      } ${className}`}
      data-visual-kind={visual.kind}
      data-visual-status={
        retrying ? 'retrying' : failed ? 'error' : loaded ? 'loaded' : 'loading'
      }
    >
      <div className="mission-visual-viewport">
        {failed ? (
          <div
            className="mission-visual-error"
            role="status"
            aria-live="polite"
          >
            <ImageOff aria-hidden="true" size={28} />
            <div>
              <p className="data-label text-[var(--console-amber)]">
                Visual signal unavailable
              </p>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                The licensed provider image could not be loaded.
              </p>
            </div>
          </div>
        ) : (
          <>
            {!loaded ? (
              <div
                aria-hidden="true"
                className="mission-visual-skeleton skeleton"
              />
            ) : null}
            <Image
              key={attempt}
              src={visual.url}
              alt={launchVisualAlt(launch, visual)}
              fill
              priority={priority}
              sizes={
                compact
                  ? '(max-width: 639px) calc(100vw - 2.5rem), 36rem'
                  : '(max-width: 1023px) calc(100vw - 2rem), 32rem'
              }
              onLoad={imageLoaded}
              onError={imageFailed}
              className={`mission-visual-image mission-visual-image-${visual.kind} ${
                loaded ? 'mission-visual-image-loaded' : ''
              }`}
            />
          </>
        )}
      </div>

      <figcaption className="mission-visual-caption">
        <div className="min-w-0">
          <p className="data-label text-[var(--console-cyan)]">{label}</p>
          <p className="mission-visual-name">{subject}</p>
          <p className="mission-visual-credit">
            Credit: {visual.credit}
            {source}
          </p>
        </div>
        <div className="mission-visual-actions">
          {failed || retrying ? (
            <button
              type="button"
              onClick={retryImage}
              aria-disabled={retrying}
              aria-busy={retrying}
              className="mission-visual-retry"
            >
              <RefreshCw
                aria-hidden="true"
                size={14}
                className={retrying ? 'animate-spin' : ''}
              />
              {retrying ? 'Retrying image' : 'Retry image'}
            </button>
          ) : null}
          <a
            href={visual.licenseUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mission-visual-license"
            aria-label={`Open ${visual.licenseName} license in a new tab`}
          >
            {visual.licenseName}
          </a>
          {visual.sourceUrl ? (
            <a
              href={visual.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mission-visual-source"
              aria-label={`Open ${
                visual.sourceLabel || 'visual'
              } source record in a new tab`}
            >
              Source record
              <ExternalLink aria-hidden="true" size={14} />
            </a>
          ) : null}
          <a
            ref={fullImageRef}
            href={visual.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mission-visual-open"
            aria-label="Open full image in a new tab"
          >
            Open full image
            <ExternalLink aria-hidden="true" size={14} />
          </a>
        </div>
      </figcaption>
    </figure>
  );
}

export default function MissionVisual({
  launch,
  priority = false,
  compact = false,
  className = '',
  loading = false,
  error = null,
  showUnavailableState = false,
}: MissionVisualProps): React.ReactElement | null {
  const selection = selectLaunchVisual(launch);

  if (loading && selection.status !== 'available') {
    return (
      <PlaceholderMissionVisual
        compact={compact}
        className={className}
        status="loading"
      />
    );
  }

  if (selection.status !== 'available') {
    return showUnavailableState ? (
      <PlaceholderMissionVisual
        compact={compact}
        className={className}
        status={error ? 'degraded' : selection.status}
      />
    ) : null;
  }

  if (!launch) return null;

  return (
    <AvailableMissionVisual
      key={`${selection.visual.kind}:${selection.visual.url}`}
      launch={launch}
      visual={selection.visual}
      priority={priority}
      compact={compact}
      className={className}
    />
  );
}
