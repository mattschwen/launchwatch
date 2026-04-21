import Image from 'next/image';
import { Rocket } from 'lucide-react';

interface ProviderBadgeProps {
  name: string;
  logoUrl?: string | null;
  size?: 'sm' | 'md';
}

export default function ProviderBadge({ name, logoUrl, size = 'sm' }: ProviderBadgeProps): React.ReactElement {
  const dimensions = size === 'sm' ? 20 : 28;

  return (
    <span className="inline-flex items-center gap-1.5">
      {logoUrl ? (
        <Image
          src={logoUrl}
          alt={name}
          width={dimensions}
          height={dimensions}
          className="rounded-sm object-contain"
        />
      ) : (
        <Rocket size={dimensions - 4} className="text-[var(--text-muted)]" />
      )}
      <span className={`font-medium text-[var(--text-secondary)] ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>
        {name}
      </span>
    </span>
  );
}
