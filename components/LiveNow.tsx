'use client';

import { useMemo, useState } from 'react';
import { Launch } from '@/lib/types';
import Countdown from './Countdown';
import LaunchBriefingDrawer from './LaunchBriefingDrawer';
import { getYouTubeEmbedUrl, inferLaunchProvider } from '@/lib/youtube';
import { useLaunchIntel } from '@/lib/hooks';
import { getFallbackLaunchSummary } from '@/lib/launch-action';

interface LiveNowProps {
  launch: Launch;
}

export default function LiveNow({ launch }: LiveNowProps) {
  const [briefingOpen, setBriefingOpen] = useState(false);
  const embedUrl = getYouTubeEmbedUrl(launch.livestream);
  const { intel } = useLaunchIntel(launch, true);
  const action = useMemo(() => intel?.summary || getFallbackLaunchSummary(launch), [intel, launch]);
  const provider = inferLaunchProvider(launch);

  return (
    <>
      <section className="panel-strong mission-frame reveal-up overflow-hidden rounded-[2rem] border-[var(--live)]/25 p-5 sm:p-6">
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <span className="live-pulse inline-flex h-3 w-3 rounded-full bg-[var(--live)]" />
          <p className="section-kicker text-[var(--live)]">Live coverage</p>
          <span className="signal-pill signal-pill-live">On console</span>
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <div>
              <p className="section-kicker">{provider}</p>
              <h2 className="mt-3 font-display text-4xl uppercase leading-[0.94] text-[var(--text-primary)] sm:text-5xl">
                {launch.name}
              </h2>
            </div>

            {embedUrl && !embedUrl.includes('/results') ? (
              <div className="overflow-hidden rounded-[1.5rem] border border-[var(--line-soft)] bg-black shadow-[0_18px_44px_rgba(17,26,39,0.18)]">
                <div className="aspect-video w-full">
                  <iframe
                    src={embedUrl}
                    className="h-full w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </div>
            ) : (
              <div className="panel rounded-[1.5rem] p-5">
                <p className="section-kicker">Stream routing</p>
                <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
                  This launch is live in schedule data, but the webcast still needs to be opened through the ranked launch action or the mission brief.
                </p>
              </div>
            )}
          </div>

          <div className="grid gap-4">
            <div className="panel rounded-[1.5rem] p-5">
              <p className="section-kicker">Action</p>
              <p className="mt-3 font-display text-3xl uppercase leading-none text-[var(--text-primary)]">
                {action.recommendedLabel}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">{action.rationale}</p>
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
              </div>
            </div>

            <div className="panel rounded-[1.5rem] p-5">
              <p className="section-kicker">Live telemetry</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Rocket</p>
                  <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{launch.rocket}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Pad</p>
                  <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{launch.launchSite}</p>
                </div>
              </div>
              {launch.description && (
                <p className="mt-4 text-sm leading-relaxed text-[var(--text-secondary)] line-clamp-4">
                  {launch.description}
                </p>
              )}
            </div>

            <Countdown targetDate={launch.date} />
          </div>
        </div>
      </section>

      <LaunchBriefingDrawer launch={launch} open={briefingOpen} onClose={() => setBriefingOpen(false)} />
    </>
  );
}
