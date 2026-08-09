'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { Archive, CalendarDays, Radar } from 'lucide-react';

export default function NotFound(): React.ReactElement {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <div className="page-container py-16 text-center">
      <Radar
        aria-hidden="true"
        className="mx-auto text-[var(--console-cyan)]"
        size={44}
      />
      <p className="data-label mt-5">Signal 404</p>
      <h1
        ref={headingRef}
        tabIndex={-1}
        className="mt-2 text-3xl font-bold tracking-[-0.035em] text-[var(--text-primary)]"
      >
        This mission path is off course.
      </h1>
      <p className="mx-auto mt-2 max-w-lg text-[var(--text-secondary)]">
        The mission may have moved, left the current schedule, or belong in the
        completed-flight archive.
      </p>
      <nav
        aria-label="Mission recovery"
        className="mx-auto mt-7 grid max-w-xl gap-3 sm:grid-cols-2"
      >
        <Link href="/" className="action-button action-button-primary w-full">
          <CalendarDays aria-hidden="true" size={17} />
          View upcoming launches
        </Link>
        <Link
          href="/history"
          className="action-button action-button-secondary w-full"
        >
          <Archive aria-hidden="true" size={17} />
          Search launch archive
        </Link>
      </nav>
    </div>
  );
}
