interface TelemetryReadoutProps {
  label: string;
  value: string;
  status?: 'nominal' | 'caution' | 'critical' | 'inactive';
  mono?: boolean;
  className?: string;
}

const statusDotClass: Record<string, string> = {
  nominal: 'status-dot-nominal',
  caution: 'status-dot-caution',
  critical: 'status-dot-critical',
  inactive: 'status-dot-inactive',
};

export default function TelemetryReadout({
  label,
  value,
  status,
  mono = true,
  className = '',
}: TelemetryReadoutProps): React.ReactElement {
  return (
    <div className={`flex items-start gap-2 py-1.5 ${className}`}>
      {status && <span className={`status-dot ${statusDotClass[status]}`} />}
      <span className="console-label min-w-[70px] flex-shrink-0 sm:min-w-[80px]">
        {label}
      </span>
      <span
        className={`min-w-0 break-words text-xs sm:text-sm ${
          mono ? 'console-value' : 'text-[var(--text-primary)]'
        }`}
      >
        {value}
      </span>
    </div>
  );
}
