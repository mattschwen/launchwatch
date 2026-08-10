'use client';

import { Component, type ReactNode } from 'react';
import { Globe2, RefreshCw } from 'lucide-react';

interface TrajectoryErrorBoundaryProps {
  children: ReactNode;
  resetKey: string;
  className?: string;
  onError?: () => void;
}

interface TrajectoryErrorBoundaryState {
  failed: boolean;
}

export default class TrajectoryErrorBoundary extends Component<
  TrajectoryErrorBoundaryProps,
  TrajectoryErrorBoundaryState
> {
  state: TrajectoryErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): TrajectoryErrorBoundaryState {
    return { failed: true };
  }

  componentDidCatch(): void {
    this.props.onError?.();
  }

  componentDidUpdate(previousProps: TrajectoryErrorBoundaryProps): void {
    if (
      this.state.failed &&
      previousProps.resetKey !== this.props.resetKey
    ) {
      this.setState({ failed: false });
    }
  }

  render(): ReactNode {
    if (!this.state.failed) return this.props.children;

    return (
      <section
        role="alert"
        aria-label="Mission trajectory unavailable"
        className={`trajectory-error-state surface-card holo-card signal-warm flex min-h-[21rem] min-w-0 max-w-full flex-col overflow-hidden ${
          this.props.className ?? ''
        }`}
      >
        <header className="border-b border-[var(--border-subtle)] px-5 py-4">
          <p className="data-label text-[var(--console-amber)]">
            Trajectory signal lost
          </p>
          <h2 className="section-title mt-1">Mission trajectory unavailable</h2>
        </header>
        <div className="grid flex-1 place-items-center p-5 text-center sm:p-6">
          <div className="max-w-md">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[var(--console-amber)]/25 bg-[var(--console-amber)]/[0.07] text-[var(--console-amber)]">
              <Globe2 aria-hidden="true" size={25} />
            </span>
            <p className="mt-5 font-semibold text-[var(--text-primary)]">
              Primary mission console remains online.
            </p>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              Mission timing, coverage, and briefing data remain available.
              Reload this route to reacquire the optional trajectory model.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="action-button action-button-secondary mt-5"
            >
              <RefreshCw aria-hidden="true" size={16} />
              Retry mission trajectory
            </button>
          </div>
        </div>
      </section>
    );
  }
}
