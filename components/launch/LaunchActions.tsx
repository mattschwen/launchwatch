'use client';

import Link from 'next/link';
import { ExternalLink, FileText, LoaderCircle, Play } from 'lucide-react';
import type { Launch } from '@/lib/types';
import { getFallbackLaunchSummary } from '@/lib/launch-action';
import { isCompletedLaunch } from '@/lib/format';
import { extractYouTubeId } from '@/lib/youtube';
import AddToCalendar from '@/components/AddToCalendar';

interface LaunchActionsProps {
  launch: Launch;
  onOpenBriefing?: () => void;
  detailHref?: string;
  showCalendar?: boolean;
  compact?: boolean;
  featured?: boolean;
  coverageLoading?: boolean;
  coverageUnavailable?: boolean;
  className?: string;
}

export default function LaunchActions({
  launch,
  onOpenBriefing,
  detailHref,
  showCalendar = true,
  compact = false,
  featured = false,
  coverageLoading = false,
  coverageUnavailable = false,
  className = '',
}: LaunchActionsProps): React.ReactElement {
  const fallback = getFallbackLaunchSummary(launch);
  const completed = isCompletedLaunch(launch);
  const hasPlayableVideo = Boolean(
    launch.livestream && extractYouTubeId(launch.livestream)
  );
  const primaryLabel = launch.livestream
    ? launch.isLive
      ? hasPlayableVideo
        ? 'Watch live'
        : 'Open live coverage'
      : completed
        ? hasPlayableVideo
          ? 'Watch replay'
          : 'Open coverage'
        : hasPlayableVideo
          ? 'Watch mission'
          : 'Open coverage'
    : fallback.recommendedLabel === 'Track Provider Channel'
      ? 'Provider channel'
      : 'Find stream';

  return (
    <div
      className={`${
        featured
          ? 'grid grid-cols-1 gap-3 sm:grid-cols-2 [&>.action-button]:w-full'
          : 'flex flex-wrap items-center gap-2'
      } ${className}`}
    >
      {coverageLoading && !launch.livestream ? (
        <div
          role="status"
          aria-label="Checking official coverage"
          className="action-button action-button-secondary cursor-wait opacity-70"
        >
          <LoaderCircle
            aria-hidden="true"
            size={17}
            className="animate-spin"
          />
          Checking coverage
        </div>
      ) : launch.livestream ? (
        <Link
          href={`/watch?id=${encodeURIComponent(launch.id)}`}
          className="action-button action-button-stream"
        >
          <Play aria-hidden="true" size={17} fill="currentColor" />
          {primaryLabel}
        </Link>
      ) : fallback.recommendedUrl ? (
        <a
          href={fallback.recommendedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="action-button action-button-secondary"
        >
          <ExternalLink aria-hidden="true" size={17} />
          {primaryLabel}
        </a>
      ) : (
        <Link
          href={detailHref ?? `/launch/${encodeURIComponent(launch.id)}`}
          className="action-button action-button-primary"
        >
          View mission
        </Link>
      )}

      {onOpenBriefing ? (
        <button
          type="button"
          onClick={onOpenBriefing}
          className="action-button action-button-secondary"
        >
          <FileText aria-hidden="true" size={17} />
          {compact ? 'Briefing' : 'Open briefing'}
        </button>
      ) : null}

      {showCalendar && !completed ? (
        <AddToCalendar launch={launch} variant={compact ? 'icon' : 'button'} />
      ) : null}

      {coverageUnavailable && !launch.livestream ? (
        <p
          role="status"
          className="col-span-full text-xs leading-5 text-[var(--console-amber)]"
        >
          Official coverage status unavailable; search fallback shown.
        </p>
      ) : null}
    </div>
  );
}
