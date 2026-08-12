import { BadgeInfo } from 'lucide-react';
import type { Launch } from '@/lib/types';

type ProviderStatus = Pick<Launch, 'statusName' | 'statusDescription'>;
type ProviderStatusVariant = 'default' | 'compact';

function normalizedValue(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

export default function ProviderStatusSignal({
  launch,
  variant = 'default',
}: {
  launch: ProviderStatus;
  variant?: ProviderStatusVariant;
}): React.ReactElement | null {
  const name = normalizedValue(launch.statusName);
  const description = normalizedValue(launch.statusDescription);
  if (!name || !description) return null;

  const compact = variant === 'compact';

  return (
    <div
      data-provider-status-signal
      className={compact ? 'mission-telemetry-item relative pl-8' : 'py-4'}
    >
      <dt className="flex items-center gap-3">
        <BadgeInfo
          aria-hidden="true"
          size={18}
          className={`${
            compact ? 'absolute left-0 top-0.5' : ''
          } shrink-0 text-[var(--console-cyan)]`}
        />
        <span className="data-label">Provider status</span>
      </dt>
      <dd
        className={`${
          compact ? 'mt-1' : 'mt-1 pl-[1.875rem]'
        } min-w-0 text-sm text-[var(--text-primary)]`}
      >
        <span className="block break-words font-medium">{name}</span>
        <span className="mt-1 block break-words text-xs leading-5 text-[var(--text-muted)]">
          {description}
        </span>
      </dd>
    </div>
  );
}
