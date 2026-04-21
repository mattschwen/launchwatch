'use client';

import { useState } from 'react';
import { Launch } from '@/lib/types';
import { downloadICS, getGoogleCalendarUrl, copyToClipboard } from '@/lib/calendar';
import { Calendar, Copy, Check } from 'lucide-react';

interface AddToCalendarProps {
  launch: Launch;
  variant?: 'button' | 'icon';
}

export default function AddToCalendar({ launch, variant = 'button' }: AddToCalendarProps): React.ReactElement {
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async (): Promise<void> => {
    const success = await copyToClipboard(launch);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadICS = (): void => {
    downloadICS(launch);
    setShowMenu(false);
  };

  const handleGoogleCalendar = (): void => {
    window.open(getGoogleCalendarUrl(launch), '_blank', 'noopener,noreferrer');
    setShowMenu(false);
  };

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      {variant === 'button' ? (
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="flex-1 px-3 py-2.5 bg-[var(--secondary)] hover:bg-[var(--secondary)]/80 text-white text-xs sm:text-sm font-semibold rounded-lg transition-all text-center min-h-[44px] flex items-center justify-center gap-1.5"
        >
          <Calendar size={14} />
          <span className="hidden sm:inline">Calendar</span>
        </button>
      ) : (
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="px-3 py-2.5 panel-interactive rounded-lg transition-all min-h-[44px] min-w-[44px] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          title="Add to Calendar"
        >
          <Calendar size={16} />
        </button>
      )}

      {showMenu && (
        <>
          <div className="fixed inset-0 z-[60]" onClick={() => setShowMenu(false)} />
          <div className="absolute right-0 bottom-full mb-2 w-48 panel rounded-lg shadow-xl z-[70]">
            <div className="p-1">
              <button
                onClick={handleGoogleCalendar}
                className="w-full px-3 py-2 text-left text-xs text-[var(--text-primary)] hover:bg-[var(--surface)] rounded flex items-center gap-2"
              >
                <Calendar size={14} />
                Google Calendar
              </button>
              <button
                onClick={handleDownloadICS}
                className="w-full px-3 py-2 text-left text-xs text-[var(--text-primary)] hover:bg-[var(--surface)] rounded flex items-center gap-2"
              >
                <Calendar size={14} />
                Apple / Outlook
              </button>
              <hr className="border-[var(--panel-border)] my-1" />
              <button
                onClick={handleCopy}
                className="w-full px-3 py-2 text-left text-xs text-[var(--text-primary)] hover:bg-[var(--surface)] rounded flex items-center gap-2"
              >
                {copied ? <Check size={14} className="text-[var(--success)]" /> : <Copy size={14} />}
                {copied ? 'Copied!' : 'Copy details'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
