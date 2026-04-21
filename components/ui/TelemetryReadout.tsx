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
    <div className={`flex items-center gap-2 py-1 ${className}`}>
      {status && <span className={`status-dot ${statusDotClass[status]}`} />}
      <span className="console-label text-[10px] sm:text-[11px] min-w-[70px] sm:min-w-[80px] flex-shrink-0">
        {label}
      </span>
      <span
        className={`text-xs sm:text-sm truncate ${
          mono ? 'console-value' : 'text-[var(--text-primary)]'
        }`}
      >
        {value}
      </span>
    </div>
  );
}
