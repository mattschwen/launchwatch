import { ExternalLink, RadioTower } from 'lucide-react';
import type { LaunchProviderUpdate } from '@/lib/types';
import ExternalLinkHint from '@/components/ui/ExternalLinkHint';

const UTC_UPDATE_TIME = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: 'UTC',
  timeZoneName: 'short',
});

function validUpdates(
  providerUpdates: LaunchProviderUpdate[] | null | undefined,
): LaunchProviderUpdate[] {
  return (providerUpdates ?? []).filter(
    (update) =>
      Boolean(update.comment.trim()) &&
      !Number.isNaN(Date.parse(update.createdAt)),
  );
}

export default function MissionUpdateLog({
  providerUpdates,
  compact = false,
}: {
  providerUpdates: LaunchProviderUpdate[] | null | undefined;
  compact?: boolean;
}): React.ReactElement | null {
  const updates = validUpdates(providerUpdates);
  if (updates.length === 0) return null;

  if (compact) {
    const latest = updates[0];
    return (
      <div data-mission-update-log className="py-4">
        <dt className="flex items-center gap-3">
          <RadioTower
            aria-hidden="true"
            size={18}
            className="shrink-0 text-[var(--console-amber)]"
          />
          <span className="data-label">Latest provider update</span>
        </dt>
        <dd className="mt-1 min-w-0 pl-[1.875rem]">
          <p className="break-words text-sm leading-6 text-[var(--text-primary)]">
            {latest.comment}
          </p>
          <time
            dateTime={latest.createdAt}
            className="mt-1 block font-mono text-[0.68rem] uppercase tracking-[0.07em] text-[var(--text-muted)]"
          >
            {UTC_UPDATE_TIME.format(new Date(latest.createdAt))}
          </time>
        </dd>
      </div>
    );
  }

  return (
    <section
      id="mission-updates"
      tabIndex={-1}
      aria-labelledby="mission-updates-title"
      data-mission-update-log
      className="mission-detail-section-anchor surface-card holo-card signal-warm mt-5 min-w-0 max-w-full overflow-hidden p-5 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--console-cyan)] sm:p-6"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--console-amber)]/10 text-[var(--console-amber)]">
          <RadioTower aria-hidden="true" size={19} />
        </span>
        <div className="min-w-0">
          <p className="data-label text-[var(--console-amber)]">
            Provider signal log
          </p>
          <h2 id="mission-updates-title" className="section-title mt-1">
            Latest mission updates
          </h2>
          <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
            Latest {updates.length} notes carried by the canonical mission record.
          </p>
        </div>
      </div>

      <ol className="mt-5 divide-y divide-[var(--border-subtle)] border-y border-[var(--border-subtle)]">
        {updates.map((update, index) => (
          <li
            key={update.id}
            className="grid min-w-0 gap-2 py-4 sm:grid-cols-[8.75rem_minmax(0,1fr)] sm:gap-4"
          >
            <div className="min-w-0">
              <span className="data-label text-[var(--console-cyan)]">
                {index === 0 ? 'Latest note' : `Prior note ${index}`}
              </span>
              <time
                dateTime={update.createdAt}
                className="mt-1 block font-mono text-[0.68rem] leading-5 text-[var(--text-muted)]"
              >
                {UTC_UPDATE_TIME.format(new Date(update.createdAt))}
              </time>
            </div>
            <div className="min-w-0">
              <p className="break-words text-sm leading-6 text-[var(--text-primary)]">
                {update.comment}
              </p>
              {update.sourceUrl ? (
                <a
                  href={update.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex min-h-11 max-w-full items-center gap-2 break-words font-mono text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-[var(--console-cyan)] transition-colors hover:text-[var(--text-primary)]"
                >
                  Open cited source
                  <ExternalLink aria-hidden="true" size={14} className="shrink-0" />
                  <ExternalLinkHint />
                </a>
              ) : (
                <p className="mt-2 font-mono text-[0.65rem] uppercase tracking-[0.07em] text-[var(--text-muted)]">
                  Cited source unavailable
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
