import Link from 'next/link';
import { Radar, ArrowLeft } from 'lucide-react';

export default function NotFound(): React.ReactElement {
  return (
    <div className="page-container py-16 text-center">
      <Radar
        aria-hidden="true"
        className="mx-auto text-[var(--console-cyan)]"
        size={44}
      />
      <p className="data-label mt-5">Signal 404</p>
      <h1 className="mt-2 text-3xl font-bold tracking-[-0.035em] text-[var(--text-primary)]">
        This mission path is off course.
      </h1>
      <p className="mx-auto mt-2 max-w-lg text-[var(--text-secondary)]">
        The page may have moved, or the launch identifier is no longer in the
        active schedule.
      </p>
      <Link href="/" className="action-button action-button-primary mt-6">
        <ArrowLeft aria-hidden="true" size={16} />
        Back to launch control
      </Link>
    </div>
  );
}
