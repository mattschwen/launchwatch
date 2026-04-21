'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Rocket, Tv } from 'lucide-react';
import { Launch } from '@/lib/types';
import { getFallbackLaunchSummary } from '@/lib/launch-action';
import AddToCalendar from './AddToCalendar';
import Countdown from './Countdown';
import LaunchBriefingDrawer from './LaunchBriefingDrawer';
import StatusBadge from './ui/StatusBadge';

interface LaunchCardProps {
  launch: Launch;
  showCalendar?: boolean;
}

function getAccentColor(status: Launch['status']): string {
  switch (status) {
    case 'live':
      return 'var(--console-red)';
    case 'upcoming':
      return 'var(--console-green)';
    case 'tbd':
      return 'var(--console-amber)';
    case 'success':
      return 'var(--console-green)';
    case 'failure':
      return 'var(--console-red)';
    default:
      return 'var(--panel-border)';
  }
}

function formatShortDate(dateString: string): string {
  const d = new Date(dateString);
  return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${d.toISOString().slice(11, 16)} UTC`;
}

function shortenSiteName(site: string): string {
  return site
    .replace(/Space Launch Complex/i, 'SLC')
    .replace(/Launch Complex/i, 'LC')
    .replace(/Launch Pad/i, 'LP')
    .replace(/Cape Canaveral SFS/i, 'CCSFS')
    .replace(/Kennedy Space Center/i, 'KSC')
    .replace(/, FL, USA/i, '')
    .replace(/, CA, USA/i, '')
    .replace(/, United States of America/i, '')
    .replace(/, New Zealand/i, '')
    .replace(/, French Guiana/i, '');
}

export default function LaunchCard({ launch, showCalendar = true }: LaunchCardProps): React.ReactElement {
  const [briefingOpen, setBriefingOpen] = useState(false);
  const thumbnailUrl = launch.rocketImageUrl || launch.image || null;
  const fallbackAction = useMemo(() => getFallbackLaunchSummary(launch), [launch]);

  return (
    <>
      <article
        className="relative group overflow-hidden border border-[var(--panel-border)] bg-[var(--bg-secondary)] transition-[transform,border-color,box-shadow,background-color] duration-300 [transition-timing-function:var(--ease-out-quart)] motion-safe:hover:-translate-y-1 hover:border-[color:var(--accent)] hover:shadow-[0_20px_45px_rgba(0,0,0,0.34)]"
        style={{ '--accent': getAccentColor(launch.status) } as React.CSSProperties}
      >
        <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ backgroundColor: getAccentColor(launch.status) }} />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[color:var(--accent)]/35 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        <div className="p-3 pl-4 sm:p-4 sm:pl-5">
          <div className="flex gap-3">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[var(--bg-tertiary)] sm:h-14 sm:w-14">
              {thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={thumbnailUrl}
                  alt={launch.rocket}
                  className="h-full w-full object-cover transition-transform duration-300 [transition-timing-function:var(--ease-out-quart)] group-hover:scale-105"
                  loading="lazy"
                />
              ) : (
                <Rocket size={20} className="text-[var(--text-muted)] transition-transform duration-300 [transition-timing-function:var(--ease-out-quart)] group-hover:scale-105" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <Link href={`/launch/${launch.id}`} className="after:absolute after:inset-0 focus:outline-none">
                <h3 className="display-title line-clamp-2 text-sm leading-snug text-[var(--text-primary)] transition-colors duration-200 group-hover:text-[var(--console-cyan)] sm:text-[0.98rem]">
                  {launch.name}
                </h3>
              </Link>

              <p className="mt-1 truncate text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)] font-[family-name:var(--font-geist-mono)]">
                {launch.rocket}
                {launch.provider && launch.provider !== 'Unknown' && <span>{' · '}{launch.provider}</span>}
              </p>

              <p className="truncate text-[11px] text-[var(--text-secondary)] font-[family-name:var(--font-geist-mono)]">
                {formatShortDate(launch.date)} {' · '} {shortenSiteName(launch.launchSite)}
              </p>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-[var(--panel-border)] pt-2">
            <StatusBadge status={launch.status} statusName={launch.statusName} />
            <Countdown targetDate={launch.date} compact />
          </div>
        </div>

        <div className="relative z-10 grid grid-cols-[1fr_auto] gap-2 px-3 pb-3 pl-4 sm:px-4 sm:pb-4 sm:pl-5">
          {launch.isLive ? (
            <Link
              href={`/watch?id=${launch.id}`}
              className="flex items-center justify-center gap-1.5 border border-[var(--console-red)]/30 bg-[var(--console-red)]/10 px-2 py-1.5 text-[10px] font-bold tracking-wider text-[var(--console-red)] transition-colors hover:bg-[var(--console-red)]/20 sm:text-xs font-[family-name:var(--font-geist-mono)]"
            >
              <Tv size={12} />
              WATCH LIVE
            </Link>
          ) : launch.livestream ? (
            <Link
              href={`/watch?id=${launch.id}`}
              className="flex items-center justify-center gap-1.5 border border-[var(--console-cyan)]/30 px-2 py-1.5 text-[10px] font-medium tracking-wider text-[var(--console-cyan)] transition-colors hover:bg-[var(--console-cyan)]/10 sm:text-xs font-[family-name:var(--font-geist-mono)]"
            >
              <Tv size={12} />
              STREAM
            </Link>
          ) : fallbackAction.recommendedUrl ? (
            <a
              href={fallbackAction.recommendedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center border border-[var(--console-green)]/30 px-2 py-1.5 text-[10px] font-medium tracking-wider text-[var(--console-green)] transition-colors hover:bg-[var(--console-green)]/10 sm:text-xs font-[family-name:var(--font-geist-mono)]"
            >
              {fallbackAction.recommendedLabel.toUpperCase()}
            </a>
          ) : (
            <Link
              href={`/launch/${launch.id}`}
              className="flex items-center justify-center gap-1.5 border border-[var(--panel-border)] px-2 py-1.5 text-[10px] font-medium tracking-wider text-[var(--text-muted)] transition-colors hover:border-[var(--console-green)]/30 hover:text-[var(--console-green)] sm:text-xs font-[family-name:var(--font-geist-mono)]"
            >
              DETAILS
              <ChevronRight size={12} />
            </Link>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={() => setBriefingOpen(true)}
              className="border border-[var(--panel-border)] px-3 py-2 text-[10px] tracking-wider text-[var(--text-primary)] transition-[transform,border-color,color,background-color] duration-200 [transition-timing-function:var(--ease-out-quart)] motion-safe:hover:-translate-y-px hover:border-[var(--console-green)]/30 hover:text-[var(--console-green)] sm:text-xs font-[family-name:var(--font-geist-mono)]"
            >
              BRIEF
            </button>
            {showCalendar && <AddToCalendar launch={launch} variant="icon" />}
          </div>
        </div>
      </article>

      <LaunchBriefingDrawer launch={launch} open={briefingOpen} onClose={() => setBriefingOpen(false)} />
    </>
  );
}
