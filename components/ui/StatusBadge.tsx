import { Launch } from '@/lib/types';
import WarningLight from './WarningLight';

interface StatusBadgeProps {
  status: Launch['status'];
  statusName?: string | null;
  className?: string;
}

const statusConfig: Record<Launch['status'], { label: string; lightColor: 'green' | 'red' | 'amber'; textClass: string; bgClass: string; borderClass: string; spinning: boolean }> = {
  live: {
    label: 'LIVE',
    lightColor: 'red',
    textClass: 'text-[var(--console-red)]',
    bgClass: 'bg-[var(--console-red)]/15',
    borderClass: 'border-[var(--console-red)]/30',
    spinning: true,
  },
  upcoming: {
    label: 'GO FOR LAUNCH',
    lightColor: 'green',
    textClass: 'text-[var(--console-green)]',
    bgClass: 'bg-[var(--console-green)]/10',
    borderClass: 'border-[var(--console-green)]/25',
    spinning: true,
  },
  success: {
    label: 'NOMINAL',
    lightColor: 'green',
    textClass: 'text-[var(--console-green)]',
    bgClass: 'bg-[var(--console-green)]/10',
    borderClass: 'border-[var(--console-green)]/25',
    spinning: false,
  },
  failure: {
    label: 'ANOMALY',
    lightColor: 'red',
    textClass: 'text-[var(--console-red)]',
    bgClass: 'bg-[var(--console-red)]/10',
    borderClass: 'border-[var(--console-red)]/25',
    spinning: false,
  },
  tbd: {
    label: 'TBD',
    lightColor: 'amber',
    textClass: 'text-[var(--console-amber)]',
    bgClass: 'bg-[var(--console-amber)]/10',
    borderClass: 'border-[var(--console-amber)]/25',
    spinning: false,
  },
};

export default function StatusBadge({ status, statusName, className = '' }: StatusBadgeProps): React.ReactElement {
  const config = statusConfig[status];
  const displayLabel = statusName && status !== 'live' ? statusName.toUpperCase() : config.label;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border font-[family-name:var(--font-geist-mono)] text-[10px] sm:text-xs font-bold tracking-wider ${config.textClass} ${config.bgClass} ${config.borderClass} ${className}`}
    >
      <WarningLight color={config.lightColor} size="sm" spinning={config.spinning} />
      {displayLabel}
    </span>
  );
}
