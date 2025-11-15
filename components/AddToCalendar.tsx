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
          className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          <span>📅</span>
          <span>Add to Calendar</span>
        </button>
      ) : (
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          title="Add to Calendar"
        >
          <span className="text-xl">📅</span>
        </button>
      )}

      {showMenu && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowMenu(false)}
          />

          {/* Menu */}
          <div className="absolute right-0 mt-2 w-56 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-20 overflow-hidden">
            <div className="py-1">
              <button
                onClick={handleGoogleCalendar}
                className="w-full px-4 py-2 text-left text-sm text-white hover:bg-gray-700 transition-colors flex items-center gap-3"
              >
                <span className="text-lg">📆</span>
                <span>Google Calendar</span>
              </button>

              <button
                onClick={handleDownloadICS}
                className="w-full px-4 py-2 text-left text-sm text-white hover:bg-gray-700 transition-colors flex items-center gap-3"
              >
                <span className="text-lg">🗓️</span>
                <span>Apple/Outlook (.ics)</span>
              </button>

              <hr className="border-gray-700 my-1" />

              <button
                onClick={handleCopy}
                className="w-full px-4 py-2 text-left text-sm text-white hover:bg-gray-700 transition-colors flex items-center gap-3"
              >
                <span className="text-lg">{copied ? '✅' : '📋'}</span>
                <span>{copied ? 'Copied!' : 'Copy Details'}</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
