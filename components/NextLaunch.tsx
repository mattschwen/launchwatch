'use client';

import Image from 'next/image';
import { useMemo, useState } from 'react';
import { useLaunchIntel, useNextLaunch } from '@/lib/hooks';
import { getFallbackLaunchSummary } from '@/lib/launch-action';
import { inferLaunchProvider } from '@/lib/youtube';
import Countdown from './Countdown';
import AddToCalendar from './AddToCalendar';
import LaunchBriefingDrawer from './LaunchBriefingDrawer';
import OrbitalField from './OrbitalField';

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

function getSignalPill(state: 'live' | 'upcoming' | 'standby' | 'search' | 'none') {
  switch (state) {
    case 'live':
      return 'signal-pill signal-pill-live';
    case 'upcoming':
      return 'signal-pill signal-pill-upcoming';
    case 'standby':
      return 'signal-pill signal-pill-standby';
    default:
      return 'signal-pill signal-pill-upcoming';
  }
}

export default function NextLaunch() {
  const { nextLaunch, loading } = useNextLaunch();
  const [briefingOpen, setBriefingOpen] = useState(false);
  const { intel, loading: intelLoading } = useLaunchIntel(nextLaunch, Boolean(nextLaunch));

  const action = useMemo(() => {
    if (!nextLaunch) return null;
    return intel?.summary || getFallbackLaunchSummary(nextLaunch);
  }, [intel, nextLaunch]);

  if (loading || !nextLaunch || !action) {
    return null;
  }

  const provider = inferLaunchProvider(nextLaunch);
  const displayImage = nextLaunch.missionPatch || nextLaunch.image;

  return (
    <>
      <section className="panel-strong mission-frame reveal-up overflow-hidden rounded-[2rem] p-5 sm:p-6 lg:p-7">
        <div className="relative z-10 grid gap-6 lg:grid-cols-[1.25fr_0.75fr] lg:items-start">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="section-kicker">Next launch</p>
              <span className={getSignalPill(action.streamState)}>{action.recommendedLabel}</span>
              {intelLoading && <span className="text-xs text-[var(--text-tertiary)]">Refreshing stream leads…</span>}
            </div>

            <h2 className="mt-4 font-display text-4xl uppercase leading-[0.92] text-[var(--text-primary)] sm:text-5xl">
              {nextLaunch.name}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--text-secondary)] sm:text-base">
              {nextLaunch.description || 'Mission briefing is still building. Open the drawer for ranked streams, news radar, and community pulse.'}
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <div className="panel rounded-[1.25rem] p-4">
                <p className="section-kicker">Operator</p>
                <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">{provider}</p>
              </div>
              <div className="panel rounded-[1.25rem] p-4">
                <p className="section-kicker">Vehicle</p>
                <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">{nextLaunch.rocket}</p>
              </div>
              <div className="panel rounded-[1.25rem] p-4 sm:col-span-2 xl:col-span-1">
                <p className="section-kicker">Pad</p>
                <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">{nextLaunch.launchSite}</p>
              </div>
            </div>

            <div className="mt-5 rounded-[1.5rem] border border-[var(--line-soft)] bg-white/58 p-4 sm:p-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="section-kicker">Window</p>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">{formatDate(nextLaunch.date)}</p>
              </div>
              <Countdown targetDate={nextLaunch.date} />
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              {action.recommendedUrl && (
                <a
                  href={action.recommendedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="button-primary px-5"
                >
                  {action.recommendedLabel}
                </a>
              )}
              <button onClick={() => setBriefingOpen(true)} className="button-secondary px-5">
                Mission brief
              </button>
              <AddToCalendar launch={nextLaunch} variant="icon" />
            </div>

            <div className="mt-4 grid gap-3 border-t border-[var(--line-soft)] pt-4 sm:grid-cols-3">
              <div>
                <p className="section-kicker">Signal</p>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">{action.rationale}</p>
              </div>
              <div>
                <p className="section-kicker">Coverage</p>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  {intel ? `${intel.streamCandidates.length} ranked stream leads, ${intel.newsItems.length} news hits.` : 'Building ranked stream leads.'}
                </p>
              </div>
              <div>
                <p className="section-kicker">Community</p>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  {intel ? `${intel.socialItems.length} recent community items surfaced for this mission.` : 'Reddit and X lookups load with the briefing.'}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="panel overflow-hidden rounded-[1.6rem]">
              <div className="telemetry-divider px-5 py-4">
                <p className="section-kicker">Watch posture</p>
                <p className="mt-2 font-display text-3xl uppercase leading-none text-[var(--text-primary)]">
                  {action.streamState === 'live' ? 'Live signal' : action.streamState === 'upcoming' ? 'Standby feed' : 'Awaiting verification'}
                </p>
              </div>

              {displayImage ? (
                <div className="relative aspect-[4/3] w-full overflow-hidden">
                  <Image
                    src={displayImage}
                    alt={nextLaunch.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1280px) 100vw, 28rem"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[rgba(9,17,29,0.18)] via-transparent to-transparent" />
                </div>
              ) : (
                <div className="relative aspect-[4/3] overflow-hidden bg-[linear-gradient(135deg,rgba(36,84,166,0.18),rgba(216,106,36,0.14))]">
                  <OrbitalField variant="panel" />
                  <div className="absolute inset-0 grid place-items-center">
                    <div className="text-center">
                      <p className="section-kicker">Operator</p>
                      <p className="mt-2 font-display text-5xl uppercase text-[var(--text-primary)]">{provider}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="panel rounded-[1.5rem] p-5">
              <p className="section-kicker">What changed</p>
              <div className="mt-3 space-y-3 text-sm leading-relaxed text-[var(--text-secondary)]">
                <p>The countdown no longer flips into a generic watch state just because launch data contains a webcast URL.</p>
                <p>Primary action now follows ranked launch intel when it exists, otherwise it falls back to official channel tracking or search.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <LaunchBriefingDrawer launch={nextLaunch} open={briefingOpen} onClose={() => setBriefingOpen(false)} />
    </>
  );
}
