'use client';

import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  Radio,
  Rocket,
} from 'lucide-react';
import Countdown from '@/components/Countdown';
import LaunchBriefingDrawer from '@/components/LaunchBriefingDrawer';
import LaunchIntelDeck from '@/components/launch/LaunchIntelDeck';
import LaunchActions from '@/components/launch/LaunchActions';
import StatusBadge from '@/components/ui/StatusBadge';
import VideoPlayer from '@/components/video/VideoPlayer';
import { formatLaunchDate, shortenLaunchSite } from '@/lib/format';
import {
  useLaunchById,
  useLaunchIntel,
  useLaunches,
  useLiveLaunches,
} from '@/lib/hooks';
import { getFallbackLaunchSummary } from '@/lib/launch-action';
import type { Launch } from '@/lib/types';

function WatchStage({
  launch,
  streamLookupError,
}: {
  launch: Launch;
  streamLookupError?: string | null;
}): React.ReactElement {
  const fallback = getFallbackLaunchSummary(launch);
  const hasProviderChannel = fallback.streamState === 'standby';
  const fallbackDescription = streamLookupError
    ? hasProviderChannel
      ? 'The mission schedule is available, but detailed provider coverage could not be checked. Use the official provider channel while we retry.'
      : 'The mission schedule is available, but detailed provider coverage could not be checked. Search for current mission coverage while we retry.'
    : hasProviderChannel
      ? 'We are between launches. Follow the next mission or use the official provider channel while coverage is being scheduled.'
      : 'No verified stream is scheduled yet. Search for current mission coverage while provider details are being updated.';

  if (launch.livestream) {
    return (
      <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-black">
        <VideoPlayer
          url={launch.livestream}
          title={launch.name}
          autoplay={launch.isLive}
          className="rounded-none"
        />
      </div>
    );
  }

  return (
    <section className="relative flex min-h-[22rem] w-full min-w-0 flex-col items-center justify-center overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-base)] px-5 text-center sm:aspect-video">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(rgba(94,230,168,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(94,230,168,0.025)_1px,transparent_1px)] bg-[size:34px_34px]"
      />
      <Rocket
        aria-hidden="true"
        size={88}
        strokeWidth={0.8}
        className="absolute bottom-[-0.6rem] right-[7%] text-[var(--border-strong)]"
      />
      <div className="relative max-w-xl">
        {streamLookupError ? (
          <AlertTriangle
            aria-hidden="true"
            className="mx-auto text-[var(--console-amber)]"
            size={34}
          />
        ) : (
          <Radio
            aria-hidden="true"
            className="mx-auto text-[var(--text-muted)]"
            size={34}
          />
        )}
        <h2 className="mt-5 text-[clamp(1.65rem,4vw,2.5rem)] font-bold tracking-[-0.035em] text-[var(--text-primary)]">
          {streamLookupError
            ? 'Stream status unavailable'
            : 'No live stream right now'}
        </h2>
        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
          {fallbackDescription}
        </p>
        <div className="my-6 h-px bg-[var(--border-subtle)]" />
        <p className="data-label">Next mission</p>
        <Link
          href={`/launch/${encodeURIComponent(launch.id)}`}
          className="mt-2 block text-xl font-semibold text-[var(--text-primary)] transition-colors hover:text-[var(--console-cyan)]"
        >
          {launch.name}
        </Link>
        <div className="mt-3">
          <Countdown targetDate={launch.date} compact />
        </div>
        {fallback.recommendedUrl ? (
          <a
            href={fallback.recommendedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="action-button action-button-secondary mt-6"
          >
            <ExternalLink aria-hidden="true" size={16} />
            {hasProviderChannel ? 'Open provider channel' : 'Search for stream'}
          </a>
        ) : null}
      </div>
    </section>
  );
}

function MissionQueue({
  launches,
  selectedId,
  onSelect,
}: {
  launches: Launch[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}): React.ReactElement {
  return (
    <aside aria-labelledby="next-up-title" className="surface-card overflow-hidden">
      <div className="border-b border-[var(--border-subtle)] p-4">
        <h2 id="next-up-title" className="section-title text-[1.2rem]">
          Next up
        </h2>
      </div>
      <div className="max-h-[42rem] overflow-y-auto">
        {launches.slice(0, 10).map((launch) => {
          const selected = launch.id === selectedId;
          return (
            <button
              key={launch.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onSelect(launch.id)}
              className={`flex min-h-[5.2rem] w-full items-center gap-3 border-b border-[var(--border-subtle)] px-4 py-3 text-left transition-colors last:border-0 ${
                selected
                  ? 'bg-[var(--surface-accent)] shadow-[inset_3px_0_0_var(--console-green)]'
                  : 'hover:bg-[var(--surface-subtle)]'
              }`}
            >
              <span
                aria-hidden="true"
                className={`h-2 w-2 shrink-0 rounded-full ${
                  launch.isLive
                    ? 'bg-[var(--console-red)]'
                    : launch.status === 'tbd'
                      ? 'bg-[var(--console-amber)]'
                      : 'bg-[var(--console-green)]'
                }`}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-[var(--text-primary)]">
                  {launch.name}
                </span>
                <span className="mt-1 block truncate text-xs text-[var(--text-muted)]">
                  {formatLaunchDate(launch.date)}
                </span>
                <span className="mt-0.5 block truncate text-xs text-[var(--console-cyan)]">
                  {launch.provider || launch.rocket}
                </span>
              </span>
              <ArrowRight
                aria-hidden="true"
                size={16}
                className="shrink-0 text-[var(--text-muted)]"
              />
            </button>
          );
        })}
      </div>
    </aside>
  );
}

function WatchContent(): React.ReactElement {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedId = searchParams.get('id');
  const { launches, loading: feedLoading, error, meta, refresh } = useLaunches();
  const { liveLaunches } = useLiveLaunches();
  const [briefingOpen, setBriefingOpen] = useState(false);

  const queue = useMemo(() => {
    const byId = new Map<string, Launch>();
    [...liveLaunches, ...launches].forEach((launch) => byId.set(launch.id, launch));
    return [...byId.values()].sort((a, b) => {
      if (a.isLive !== b.isLive) return a.isLive ? -1 : 1;
      return a.dateUnix - b.dateUnix;
    });
  }, [launches, liveLaunches]);

  const fallbackLaunch = liveLaunches[0] ?? queue[0] ?? null;
  const selectedId = requestedId ?? fallbackLaunch?.id ?? null;
  const selected = useLaunchById(selectedId);
  const requestedUnavailable = Boolean(
    requestedId &&
      !selected.loading &&
      !selected.launch &&
      (selected.notFound || selected.error),
  );
  const selectedLaunch =
    selected.launch ?? (requestedUnavailable ? fallbackLaunch : null);
  const { intel, loading: intelLoading, error: intelError } = useLaunchIntel(
    selectedLaunch,
    Boolean(selectedLaunch)
  );

  const selectLaunch = (id: string): void => {
    router.replace(`/watch?id=${encodeURIComponent(id)}`, { scroll: false });
  };

  const loading =
    (feedLoading && queue.length === 0) ||
    (Boolean(requestedId) && selected.loading && !selected.launch);

  if (loading) {
    return (
      <div className="page-container py-5 sm:py-7">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_21rem]">
          <div className="skeleton min-h-[22rem] w-full min-w-0 rounded-[var(--radius-md)] sm:aspect-video" />
          <div className="skeleton min-h-[30rem] rounded-[var(--radius-md)]" />
        </div>
      </div>
    );
  }

  if (!selectedLaunch) {
    return (
      <div className="page-container py-16 text-center">
        <AlertTriangle
          aria-hidden="true"
          className="mx-auto text-[var(--console-amber)]"
          size={38}
        />
        <h1 className="mt-5 text-3xl font-bold text-[var(--text-primary)]">
          The watch schedule is unavailable.
        </h1>
        <p className="mt-2 text-[var(--text-secondary)]">
          {selected.error || error || 'No missions were returned.'}
        </p>
        <button
          type="button"
          onClick={() => void refresh()}
          className="action-button action-button-secondary mt-6"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="page-container py-4 sm:py-6 lg:py-8">
        {requestedUnavailable ? (
          <div
            role="alert"
            className="mb-4 flex flex-col gap-3 rounded-[var(--radius-sm)] border border-[color-mix(in_srgb,var(--console-amber)_42%,transparent)] bg-[color-mix(in_srgb,var(--console-amber)_8%,var(--surface-base))] px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
          >
            <p className="text-[var(--text-secondary)]">
              The requested mission could not be opened. Showing{' '}
              <span className="font-semibold text-[var(--text-primary)]">
                {selectedLaunch.name}
              </span>{' '}
              from the current queue instead.
            </p>
            <button
              type="button"
              onClick={() => window.location.replace('/watch')}
              className="action-button action-button-quiet shrink-0 font-mono text-xs uppercase tracking-[0.12em]"
            >
              Clear deep link
            </button>
          </div>
        ) : null}

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="data-label">Watch room</h1>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              {liveLaunches.length > 0
                ? `${liveLaunches.length} mission${liveLaunches.length === 1 ? '' : 's'} live`
                : 'Provider streams and launch windows'}
              {meta?.partial ? ' · partial provider data' : ''}
            </p>
          </div>
          <StatusBadge
            status={selectedLaunch.status}
            statusName={selectedLaunch.statusName}
          />
        </div>

        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_21rem]">
          <div className="min-w-0">
            <WatchStage
              launch={selectedLaunch}
              streamLookupError={selected.launch ? selected.error : null}
            />

            <section className="surface-card mt-4 p-5 sm:p-6">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <Link
                    href={`/launch/${encodeURIComponent(selectedLaunch.id)}`}
                    className="group"
                  >
                    <h2 className="text-[clamp(1.65rem,3vw,2.5rem)] font-bold leading-tight tracking-[-0.04em] text-[var(--text-primary)] transition-colors group-hover:text-[var(--console-cyan)]">
                      {selectedLaunch.name}
                    </h2>
                  </Link>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">
                    {selectedLaunch.rocket} ·{' '}
                    {shortenLaunchSite(selectedLaunch.launchSite)}
                  </p>
                  <p className="mt-1 font-mono text-xs text-[var(--console-cyan)]">
                    {formatLaunchDate(selectedLaunch.date)}
                  </p>
                </div>
                <LaunchActions
                  launch={selectedLaunch}
                  onOpenBriefing={() => setBriefingOpen(true)}
                  compact
                  className="shrink-0"
                />
              </div>
              {selectedLaunch.description ? (
                <p className="mt-5 max-w-4xl border-t border-[var(--border-subtle)] pt-5 text-sm leading-6 text-[var(--text-secondary)]">
                  {selectedLaunch.description}
                </p>
              ) : null}
            </section>
          </div>

          <MissionQueue
            launches={queue}
            selectedId={selectedLaunch.id}
            onSelect={selectLaunch}
          />
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <LaunchIntelDeck
            launch={selectedLaunch}
            intel={intel}
            loading={intelLoading}
          />
          <aside className="surface-card p-5">
            <h2 className="section-title text-[1.15rem]">Source & status</h2>
            <div className="mt-4 flex items-center gap-2 text-sm text-[var(--console-green)]">
              <span
                aria-hidden="true"
                className="h-2 w-2 rounded-full bg-[var(--console-green)]"
              />
              {meta?.partial ? 'Schedule partially available' : 'Schedule online'}
            </div>
            <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
              Schedules and stream links are aggregated from official providers.
              Launch times can change.
            </p>
            {intelError ? (
              <p className="mt-4 text-sm text-[var(--console-amber)]">
                Intelligence feed: {intelError}
              </p>
            ) : null}
            <Link
              href="/history"
              className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-[var(--console-cyan)] hover:underline"
            >
              Browse launch archive
              <ArrowRight aria-hidden="true" size={15} />
            </Link>
          </aside>
        </div>
      </div>

      <LaunchBriefingDrawer
        launch={selectedLaunch}
        open={briefingOpen}
        onClose={() => setBriefingOpen(false)}
      />
    </>
  );
}

function WatchFallback(): React.ReactElement {
  return (
    <div className="page-container py-5">
      <div className="skeleton aspect-video rounded-[var(--radius-md)]" />
    </div>
  );
}

export default function WatchPage(): React.ReactElement {
  return (
    <Suspense fallback={<WatchFallback />}>
      <WatchContent />
    </Suspense>
  );
}
