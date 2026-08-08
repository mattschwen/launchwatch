'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { AlertTriangle, RotateCcw } from 'lucide-react';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): React.ReactElement {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, [error]);

  return (
    <div className="page-container py-16 text-center" role="alert">
      <AlertTriangle
        aria-hidden="true"
        className="mx-auto text-[var(--console-amber)]"
        size={40}
      />
      <h1
        ref={headingRef}
        tabIndex={-1}
        className="mt-5 text-3xl font-bold tracking-[-0.035em] text-[var(--text-primary)]"
      >
        Mission control hit a fault.
      </h1>
      <p className="mx-auto mt-2 max-w-lg text-[var(--text-secondary)]">
        The page could not finish loading. Your launch data is safe; retry this
        view or return to the main schedule.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="action-button action-button-primary"
        >
          <RotateCcw aria-hidden="true" size={16} />
          Retry
        </button>
        <Link href="/" className="action-button action-button-secondary">
          Return home
        </Link>
      </div>
    </div>
  );
}
