'use client';

import { Search, Tv, Bell } from 'lucide-react';
import { Launch } from '@/lib/types';
import { generateYouTubeSearchUrl, getProviderYouTubeChannel } from '@/lib/youtube';

interface VideoFallbackProps {
  launch: Launch;
  className?: string;
}

export default function VideoFallback({ launch, className = '' }: VideoFallbackProps): React.ReactElement {
  const searchUrl = generateYouTubeSearchUrl(launch);
  const channelUrl = getProviderYouTubeChannel(launch);

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      <a
        href={searchUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-4 py-2.5 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-sm font-medium rounded-lg transition-colors min-h-[44px]"
      >
        <Search size={16} />
        <span>Search YouTube</span>
      </a>

      {channelUrl && (
        <a
          href={channelUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2.5 panel-interactive rounded-lg text-sm font-medium text-[var(--text-primary)] min-h-[44px]"
        >
          <Tv size={16} />
          <span>Provider Channel</span>
        </a>
      )}

      <button
        onClick={() => {
          if ('Notification' in window && Notification.permission === 'granted') {
            alert('Reminder set! You\'ll be notified when the stream goes live.');
          } else {
            alert('Enable notifications to get launch reminders.');
          }
        }}
        className="inline-flex items-center gap-2 px-4 py-2.5 panel-interactive rounded-lg text-sm font-medium text-[var(--text-primary)] min-h-[44px]"
      >
        <Bell size={16} />
        <span className="hidden sm:inline">Set Reminder</span>
      </button>
    </div>
  );
}
