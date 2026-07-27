import { ExternalLink } from 'lucide-react';

export default function Footer(): React.ReactElement {
  return (
    <footer className="mt-auto border-t border-[var(--border-subtle)] bg-[var(--surface-base)]">
      <div className="page-container flex flex-col gap-3 py-5 text-xs text-[var(--text-muted)] sm:flex-row sm:items-center sm:justify-between">
        <p>
          Launch schedules from{' '}
          <a
            href="https://github.com/r-spacex/SpaceX-API"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-[var(--text-secondary)] hover:text-[var(--console-cyan)]"
          >
            SpaceX
          </a>{' '}
          and{' '}
          <a
            href="https://thespacedevs.com/llapi"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-[var(--text-secondary)] hover:text-[var(--console-cyan)]"
          >
            Launch Library 2
          </a>
          . Times can change.
        </p>
        <a
          href="https://github.com/mattschwen/launchwatch"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center gap-2 self-start font-medium text-[var(--console-cyan)] hover:underline sm:self-auto"
        >
          Source code
          <ExternalLink aria-hidden="true" size={14} />
        </a>
      </div>
    </footer>
  );
}
