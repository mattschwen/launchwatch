export default function Loading(): React.ReactElement {
  return (
    <section
      className="page-container py-5 sm:py-7 lg:py-9"
      aria-labelledby="route-loading-title"
      aria-busy="true"
    >
      <header className="route-masthead signal-cold mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="data-label mb-3 text-[var(--console-cyan)]">
            Route sync // mission-control handshake
          </p>
          <h1
            id="route-loading-title"
            className="max-w-5xl text-[clamp(2.15rem,5vw,4.4rem)] font-bold leading-none tracking-[-0.055em] text-[var(--text-primary)]"
          >
            Acquiring mission telemetry
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--text-secondary)] sm:text-base">
            Loading the requested LaunchWatch view while application and
            provider data synchronize.
          </p>
        </div>
        <p
          role="status"
          aria-label="Synchronizing route"
          aria-live="polite"
          aria-atomic="true"
          className="inline-flex min-h-11 items-center gap-2 self-start font-mono text-[0.68rem] uppercase tracking-[0.1em] text-[var(--console-cyan)] sm:self-auto"
        >
          <span
            aria-hidden="true"
            className="h-2 w-2 rounded-full bg-[var(--console-cyan)]"
          />
          Synchronizing route
        </p>
      </header>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.08fr)_minmax(29rem,.92fr)]">
        <div className="surface-card holo-card signal-cold min-h-[27.5rem] overflow-hidden p-5 sm:p-7">
          <p className="data-label text-[var(--console-cyan)]">
            Primary route data
          </p>
          <p className="mt-2 max-w-lg text-sm leading-6 text-[var(--text-secondary)]">
            Resolving the requested view and its current mission context.
          </p>
          <div aria-hidden="true" className="mt-7">
            <div className="skeleton h-12 w-full max-w-xl rounded" />
            <div className="skeleton mt-5 h-16 w-full rounded" />
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="skeleton h-16 rounded" />
              <div className="skeleton h-16 rounded" />
              <div className="skeleton h-16 rounded" />
              <div className="skeleton h-16 rounded" />
            </div>
          </div>
        </div>

        <div className="surface-card holo-card signal-cold hidden min-h-[27.5rem] overflow-hidden p-7 xl:block">
          <p className="data-label text-[var(--console-cyan)]">
            Connected provider data
          </p>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            Waiting for current schedule and telemetry records.
          </p>
          <div aria-hidden="true" className="mt-7">
            <div className="skeleton aspect-[4/3] w-full rounded-[var(--radius-sm)]" />
            <div className="skeleton mt-4 h-11 w-2/3 rounded" />
          </div>
        </div>
      </div>

      <div className="surface-card holo-card signal-cold mt-5 min-h-[16rem] overflow-hidden p-5 sm:p-7">
        <p className="data-label text-[var(--console-cyan)]">
          Mission support systems
        </p>
        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
          Preparing schedules, coverage signals, and supporting telemetry.
        </p>
        <div aria-hidden="true" className="mt-6 space-y-3">
          <div className="skeleton h-14 w-full rounded" />
          <div className="skeleton h-14 w-full rounded" />
        </div>
      </div>
    </section>
  );
}
