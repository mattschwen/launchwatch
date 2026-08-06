'use client';

import Link from 'next/link';
import { ExternalLink, FileText, LoaderCircle, Play } from 'lucide-react';
import type { Launch } from '@/lib/types';
import { getFallbackLaunchSummary } from '@/lib/launch-action';
import { isCompletedLaunch } from '@/lib/format';
import { extractYouTubeId } from '@/lib/youtube';
import AddToCalendar from '@/components/AddToCalendar';
import ShareMissionButton from '@/components/ShareMissionButton';
import ExternalLinkHint from '@/components/ui/ExternalLinkHint';

interface LaunchActionsProps {
  launch: Launch;
  onOpenBriefing?: () => void;
  detailHref?: string;
  showCalendar?: boolean;
  showShare?: boolean;
  compact?: boolean;
  detail?: boolean;
  featured?: boolean;
  coverageLoading?: boolean;
  coverageUnavailable?: boolean;
  showPrimaryAction?: boolean;
  className?: string;
}

export default function LaunchActions({
  launch,
  onOpenBriefing,
  detailHref,
  showCalendar = true,
  showShare = false,
  compact = false,
  detail = false,
  featured = false,
  coverageLoading = false,
  coverageUnavailable = false,
  showPrimaryAction = true,
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
          : compact
            ? 'compact-launch-actions grid w-full grid-cols-3 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center'
            : detail
              ? 'detail-launch-actions grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center'
            : 'flex flex-wrap items-center gap-2'
      } ${className}`}
    >
      {showPrimaryAction ? (
        coverageLoading && !launch.livestream ? (
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
            className={`action-button ${
              launch.isLive
                ? 'action-button-stream'
                : 'action-button-secondary'
            }`}
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
            <ExternalLinkHint />
          </a>
        ) : (
          <Link
            href={detailHref ?? `/launch/${encodeURIComponent(launch.id)}`}
            className="action-button action-button-primary"
          >
            View mission
          </Link>
        )
      ) : null}

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
        <AddToCalendar
          key={`calendar-${launch.id}`}
          launch={launch}
          variant={compact ? 'compact' : 'button'}
          menuPlacement={compact || detail ? 'top' : 'bottom'}
          menuAlign={detail ? 'left' : 'right'}
        />
      ) : null}

      {showShare ? (
        <ShareMissionButton key={launch.id} launch={launch} compact={compact} />
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
