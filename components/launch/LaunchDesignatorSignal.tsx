import { Hash } from 'lucide-react';

export default function LaunchDesignatorSignal({
  designator,
  compact = false,
}: {
  designator: string | null | undefined;
  compact?: boolean;
}): React.ReactElement | null {
  if (!designator) return null;

  return (
    <div
      data-launch-designator-signal
      className={compact ? 'mission-telemetry-item relative pl-8' : 'py-4'}
    >
      <dt className="flex items-center gap-3">
        <Hash
          aria-hidden="true"
          size={18}
          className={`${compact ? 'absolute left-0 top-0.5' : ''} shrink-0 text-[var(--console-cyan)]`}
        />
        <span className="data-label">Provider designator</span>
      </dt>
      <dd
        className={`${compact ? 'mt-1' : 'mt-1 pl-[1.875rem]'} min-w-0`}
      >
        <span className="block break-words font-mono text-sm font-semibold text-[var(--console-cyan)]">
          {designator}
        </span>
        <span className="mt-1 block text-xs leading-5 text-[var(--text-muted)]">
          Identifier supplied in the provider record
        </span>
      </dd>
    </div>
  );
}
