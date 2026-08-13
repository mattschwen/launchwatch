import type { Metadata } from 'next';
import { Archive } from 'lucide-react';
import PastLaunches from '@/components/PastLaunches';
import {
  parseHistoryFilters,
  readHistoryReturnFocus,
} from '@/lib/history-return';

const archiveDescription =
  'Search completed launches, inspect provider-reported dates and outcomes, and reopen official coverage from the LaunchWatch archive.';

export const metadata: Metadata = {
  title: 'Launch History | LaunchWatch',
  description: archiveDescription,
  alternates: {
    canonical: '/history',
  },
  openGraph: {
    title: 'Launch archive | LaunchWatch',
    description: archiveDescription,
    type: 'website',
    url: '/history',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Launch archive | LaunchWatch',
    description: archiveDescription,
  },
};

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<
    Record<string, string | string[] | undefined>
  >;
}): Promise<React.ReactElement> {
  const resolvedSearchParams = await searchParams;
  const initialFilters = parseHistoryFilters(resolvedSearchParams);
  const returnFocusId = readHistoryReturnFocus(resolvedSearchParams);

  return (
    <div className="page-container py-4 min-[360px]:py-5 sm:py-7 lg:py-9">
      <header className="route-masthead signal-warm mb-4 flex flex-col gap-4 min-[360px]:mb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="data-label mb-2 text-[var(--console-amber)] min-[360px]:mb-3">
            Archive node // recovered telemetry
          </p>
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--console-amber)]/25 bg-[var(--console-amber)]/[0.07] text-[var(--console-amber)] shadow-[inset_0_0_18px_rgba(255,196,92,0.04)]">
              <Archive aria-hidden="true" size={21} />
            </span>
            <h1 className="gradient-text text-[clamp(2.2rem,5vw,4.4rem)] font-bold leading-none tracking-[-0.055em]">
              Launch archive
            </h1>
          </div>
          <p className="mt-4 hidden max-w-2xl text-sm leading-6 text-[var(--text-secondary)] min-[360px]:block sm:text-base">
            Search completed missions, inspect provider-reported dates and
            outcomes, and reopen official launch coverage.
          </p>
        </div>
        <p className="data-label hidden min-[360px]:block">
          Source: public providers
        </p>
      </header>

      <PastLaunches
        initialFilters={initialFilters}
        returnFocusId={returnFocusId}
      />
    </div>
  );
}
