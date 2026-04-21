import Link from 'next/link';
import AppShell from '@/components/layout/AppShell';
import PastLaunches from '@/components/PastLaunches';
import ConsolePanel from '@/components/ui/ConsolePanel';

export const metadata = {
  title: 'Launch History | LaunchWatch',
  description: 'Browse recent SpaceX launch history, outcomes, and replay windows.',
};

export default function HistoryPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-3 py-4 sm:px-4 sm:py-6 lg:px-6">
        <div className="space-y-6">
          <ConsolePanel label="ARCHIVE CONTROL" className="animate-fade-in">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-end">
              <div>
                <p className="console-label mb-3 text-[10px]">MISSION ARCHIVE</p>
                <h1 className="display-title text-3xl text-[var(--text-primary)] sm:text-4xl lg:text-[2.8rem]">
                  Completed launches, outcomes, and replay windows.
                </h1>
                <p className="body-copy mt-4 text-sm sm:text-base">
                  Search recent SpaceX mission history, inspect results, and reopen recorded coverage from the same mission-control surface used for live tracking.
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Link
                    href="/"
                    className="inline-flex items-center gap-2 border border-[var(--console-green)]/35 px-4 py-2 text-xs font-medium tracking-[0.22em] text-[var(--console-green)] transition-colors hover:bg-[var(--console-green)]/10 font-[family-name:var(--font-geist-mono)]"
                  >
                    LIVE BOARD
                  </Link>
                  <Link
                    href="/watch"
                    className="inline-flex items-center gap-2 border border-[var(--panel-border)] px-4 py-2 text-xs font-medium tracking-[0.22em] text-[var(--text-primary)] transition-colors hover:border-[var(--console-cyan)]/35 hover:text-[var(--console-cyan)] font-[family-name:var(--font-geist-mono)]"
                  >
                    WATCH ROOM
                  </Link>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                <div className="border-l-2 border-[var(--console-green)]/30 pl-4">
                  <p className="console-label mb-2 text-[10px]">SOURCE</p>
                  <p className="text-sm font-medium text-[var(--text-primary)]">SpaceX archive feed</p>
                  <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">
                    Recent missions with result state, launch pads, and replay availability.
                  </p>
                </div>
                <div className="border-l-2 border-[var(--console-cyan)]/30 pl-4">
                  <p className="console-label mb-2 text-[10px]">MODE</p>
                  <p className="text-sm font-medium text-[var(--text-primary)]">Results + recorded streams</p>
                  <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">
                    Use the same briefing and detail flow as the live board, but against completed missions.
                  </p>
                </div>
              </div>
            </div>
          </ConsolePanel>

          <PastLaunches />
        </div>
      </div>
    </AppShell>
  );
}
