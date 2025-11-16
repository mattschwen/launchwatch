'use client';

import { useState } from 'react';
import { Launch } from '@/lib/types';
import { downloadICS, getGoogleCalendarUrl, copyToClipboard } from '@/lib/calendar';

interface AddToCalendarProps {
  launch: Launch;
  variant?: 'button' | 'icon';
}

export default function AddToCalendar({ launch, variant = 'button' }: AddToCalendarProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const success = await copyToClipboard(launch);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadICS = () => {
    downloadICS(launch);
    setShowMenu(false);
  };

  const handleGoogleCalendar = () => {
    window.open(getGoogleCalendarUrl(launch), '_blank', 'noopener,noreferrer');
    setShowMenu(false);
  };

  return (
    <div className="relative">
      {variant === 'button' ? (
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="flex-1 px-3 py-1.5 bg-[var(--secondary)] hover:bg-[var(--secondary)]/80 text-white text-xs font-semibold rounded-lg transition-all text-center"
        >
          📅 Calendar
        </button>
      ) : (
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="px-3 py-1.5 glass glass-hover rounded-lg transition-all"
          title="Add to Calendar"
        >
          <span className="text-sm">📅</span>
        </button>
      )}

      {showMenu && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[60]"
            onClick={() => setShowMenu(false)}
          />

          {/* Menu */}
          <div className="absolute right-0 mt-2 w-48 glass rounded-lg shadow-lg z-[70] border border-[var(--glass-border)]">
            <div className="p-1">
              <button
                onClick={handleGoogleCalendar}
                className="w-full px-3 py-2 text-left text-xs text-[var(--text-primary)] hover:bg-[var(--surface-hover)] rounded flex items-center gap-2"
              >
                <span>📆</span>
                <span>Google</span>
              </button>
              <button
                onClick={handleDownloadICS}
                className="w-full px-3 py-2 text-left text-xs text-[var(--text-primary)] hover:bg-[var(--surface-hover)] rounded flex items-center gap-2"
              >
                <span>🗓️</span>
                <span>Apple/Outlook</span>
              </button>
              <hr className="border-[var(--glass-border)] my-1" />
              <button
                onClick={handleCopy}
                className="w-full px-3 py-2 text-left text-xs text-[var(--text-primary)] hover:bg-[var(--surface-hover)] rounded flex items-center gap-2"
              >
                <span>{copied ? '✅' : '📋'}</span>
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
