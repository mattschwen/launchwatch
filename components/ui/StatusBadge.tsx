import { Launch } from '@/lib/types';
import {
  isCriticalLaunchStatusName,
  isMissionInFlightStatusName,
} from '@/lib/format';
import WarningLight from './WarningLight';

interface StatusBadgeProps {
  status: Launch['status'];
  statusName?: string | null;
  className?: string;
  unconfirmed?: boolean;
  variant?: 'badge' | 'inline';
}

const statusConfig: Record<Launch['status'], { label: string; lightColor: 'green' | 'magenta' | 'red' | 'amber'; textClass: string; bgClass: string; borderClass: string; spinning: boolean }> = {
  live: {
    label: 'COVERAGE LIVE',
    lightColor: 'magenta',
    textClass: 'text-[var(--console-magenta)]',
    bgClass: 'bg-[var(--console-magenta)]/15',
    borderClass: 'border-[var(--console-magenta)]/30',
    spinning: true,
  },
  upcoming: {
    label: 'SCHEDULED',
    lightColor: 'green',
    textClass: 'text-[var(--console-green)]',
    bgClass: 'bg-[var(--console-green)]/10',
    borderClass: 'border-[var(--console-green)]/25',
    spinning: false,
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

export default function StatusBadge({
  status,
  statusName,
  className = '',
  unconfirmed = false,
  variant = 'badge',
}: StatusBadgeProps): React.ReactElement {
  const criticalOverride =
    status !== 'live' && isCriticalLaunchStatusName(statusName);
  const config = unconfirmed
    ? statusConfig.tbd
    : criticalOverride
    ? statusConfig.failure
    : statusConfig[status];
  const displayLabel = unconfirmed
    ? 'STATUS UNCONFIRMED'
    : status === 'live' && isMissionInFlightStatusName(statusName)
      ? 'IN FLIGHT'
    : statusName && status !== 'live'
      ? statusName.toUpperCase()
      : config.label;
  const presentationClass =
    variant === 'inline'
      ? `font-[family-name:var(--font-geist-mono)] text-[0.62rem] font-bold uppercase tracking-[0.09em] ${config.textClass}`
      : `rounded border px-2 py-1 font-[family-name:var(--font-geist-mono)] text-[11px] font-bold tracking-[0.08em] sm:text-xs ${config.textClass} ${config.bgClass} ${config.borderClass}`;

  return (
    <span
      className={`inline-flex items-center gap-1.5 ${presentationClass} ${className}`}
    >
      <WarningLight color={config.lightColor} size="sm" spinning={config.spinning} />
      {displayLabel}
    </span>
  );
}
