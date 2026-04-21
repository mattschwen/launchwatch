'use client';

import { ReactNode } from 'react';

interface ConsolePanelProps {
  children: ReactNode;
  label?: string;
  variant?: 'default' | 'live' | 'interactive';
  showBrackets?: boolean;
  glowing?: boolean;
  className?: string;
}

const variantStyles: Record<string, string> = {
  default: 'panel',
  live: 'panel-live',
  interactive: 'panel-interactive',
};

const bracketVariant: Record<string, string> = {
  default: 'corner-brackets',
  live: 'corner-brackets corner-brackets-red',
  interactive: 'corner-brackets',
};

export default function ConsolePanel({
  children,
  label,
  variant = 'default',
  showBrackets = true,
  glowing = false,
  className = '',
}: ConsolePanelProps): React.ReactElement {
  return (
    <div
      className={`relative ${variantStyles[variant]} rounded-none ${
        showBrackets ? bracketVariant[variant] : ''
      } ${glowing ? 'animate-console-glow' : ''} ${className}`}
    >
      {label && (
        <div className="absolute -top-2.5 left-4 z-10 px-2 bg-[var(--bg-primary)]">
          <span className="console-label text-[10px]">{label}</span>
        </div>
      )}
      <div className="p-4 sm:p-5">
        {children}
      </div>
    </div>
  );
}
