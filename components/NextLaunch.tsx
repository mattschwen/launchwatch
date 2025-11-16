'use client';

import { useState } from 'react';
import { useNextLaunch } from '@/lib/hooks';
import Countdown from './Countdown';
import AddToCalendar from './AddToCalendar';
import { generateYouTubeSearchUrl, getProviderYouTubeChannel } from '@/lib/youtube';

export default function NextLaunch() {
  const { nextLaunch, loading } = useNextLaunch();
  const [showStreamMenu, setShowStreamMenu] = useState(false);

  if (loading || !nextLaunch) {
    return null;
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });
  };

  return (
    <div className="glass border border-[var(--primary)]/30 rounded-xl p-4 sm:p-5 lg:p-6">
      <h2 className="text-base sm:text-lg lg:text-xl font-bold gradient-text mb-3">Next Launch</h2>

      <div className="space-y-3 sm:space-y-4">
        <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-[var(--text-primary)]">{nextLaunch.name}</h3>
        
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="glass rounded-lg p-2 sm:p-3">
            <p className="text-[var(--text-muted)] text-xs">Rocket</p>
            <p className="font-medium text-[var(--text-primary)] text-xs sm:text-sm">{nextLaunch.rocket}</p>
          </div>
          <div className="glass rounded-lg p-2 sm:p-3">
            <p className="text-[var(--text-muted)] text-xs">Site</p>
            <p className="font-medium text-[var(--text-primary)] truncate text-xs sm:text-sm">{nextLaunch.launchSite}</p>
          </div>
        </div>

        {nextLaunch.description && (
          <p className="text-[var(--text-secondary)] text-sm line-clamp-2">{nextLaunch.description}</p>
        )}

        <Countdown targetDate={nextLaunch.date} />

        <div className="flex gap-2 sm:gap-3 relative">
          {nextLaunch.livestream ? (
            <a
              href={nextLaunch.livestream}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 text-center px-3 sm:px-4 py-2.5 sm:py-3 bg-[var(--primary)] hover:bg-[var(--primary-hover)] active:bg-[var(--primary-hover)] text-white text-xs sm:text-sm font-semibold rounded-lg transition-all min-h-[44px] flex items-center justify-center"
            >
              <span className="hidden sm:inline">Watch Stream →</span>
              <span className="sm:hidden">Watch →</span>
            </a>
          ) : (
            <>
              <button
                onClick={() => setShowStreamMenu(!showStreamMenu)}
                className="flex-1 text-center px-3 sm:px-4 py-2.5 sm:py-3 bg-white border-2 border-gray-200 hover:border-[var(--primary)] text-[var(--text-primary)] hover:text-[var(--primary)] active:border-[var(--primary)] text-xs sm:text-sm font-semibold rounded-lg transition-all min-h-[44px] flex items-center justify-center shadow-sm hover:shadow-md"
              >
                <span className="hidden sm:inline">Find Stream 🔍</span>
                <span className="sm:hidden">Find 🔍</span>
              </button>
              
              {showStreamMenu && (
                <>
                  <div
                    className="fixed inset-0 z-[60]"
                    onClick={() => setShowStreamMenu(false)}
                  />
                  <div className="absolute bottom-full left-0 mb-2 w-64 bg-white rounded-lg shadow-lg z-[70] border border-gray-200">
                    <div className="p-2 space-y-1">
                      <p className="text-xs text-[var(--text-muted)] px-2 py-1">Find livestream:</p>
                      {getProviderYouTubeChannel(nextLaunch) && (
                        <a
                          href={getProviderYouTubeChannel(nextLaunch)!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full px-3 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-gray-100 rounded flex items-center gap-2"
                          onClick={() => setShowStreamMenu(false)}
                        >
                          <span>📺</span>
                          <span>Provider Channel</span>
                        </a>
                      )}
                      <a
                        href={generateYouTubeSearchUrl(nextLaunch)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full px-3 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-gray-100 rounded flex items-center gap-2"
                        onClick={() => setShowStreamMenu(false)}
                      >
                        <span>🔍</span>
                        <span>Search YouTube</span>
                      </a>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
          <AddToCalendar launch={nextLaunch} variant="icon" />
        </div>
      </div>
    </div>
  );
}
