export default function Loading(): React.ReactElement {
  return (
    <div
      className="page-container py-5 sm:py-7"
      aria-label="Loading mission control"
      aria-busy="true"
    >
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.08fr)_minmax(29rem,.92fr)]">
        <div className="skeleton min-h-[32rem] rounded-[var(--radius-md)]" />
        <div className="skeleton hidden min-h-[32rem] rounded-[var(--radius-md)] xl:block" />
      </div>
      <div className="skeleton mt-5 min-h-[22rem] rounded-[var(--radius-md)]" />
      <span className="sr-only">Loading mission data…</span>
    </div>
  );
}
