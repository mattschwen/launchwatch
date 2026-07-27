import { Archive } from 'lucide-react';
import PastLaunches from '@/components/PastLaunches';

export const metadata = {
  title: 'Launch History | LaunchWatch',
  description:
    'Search completed launches, outcomes, mission details, and recorded coverage.',
};

export default function HistoryPage(): React.ReactElement {
  return (
    <div className="page-container py-5 sm:py-7 lg:py-9">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--surface-accent)] text-[var(--console-green)]">
              <Archive aria-hidden="true" size={21} />
            </span>
            <h1 className="text-[clamp(2.2rem,5vw,4.4rem)] font-bold leading-none tracking-[-0.055em] text-[var(--text-primary)]">
              Launch archive
            </h1>
          </div>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--text-secondary)] sm:text-base">
            Search completed missions, inspect outcomes, and reopen official
            launch coverage.
          </p>
        </div>
        <p className="data-label">Source: public providers</p>
      </header>

      <PastLaunches />
    </div>
  );
}
