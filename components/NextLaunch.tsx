'use client';

import { useNextLaunch } from '@/lib/hooks';
import Countdown from './Countdown';
import AddToCalendar from './AddToCalendar';

export default function NextLaunch() {
  const { nextLaunch, loading } = useNextLaunch();

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
    <div className="glass border border-[var(--primary)]/30 rounded-xl p-4 sm:p-5">
      <h2 className="text-lg sm:text-xl font-bold gradient-text mb-3">⏰ Next Launch</h2>

      <div className="space-y-3">
        <h3 className="text-xl font-bold text-[var(--text-primary)]">{nextLaunch.name}</h3>
        
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="glass rounded-lg p-2">
            <p className="text-[var(--text-muted)] text-xs">Rocket</p>
            <p className="font-medium text-[var(--text-primary)]">{nextLaunch.rocket}</p>
          </div>
          <div className="glass rounded-lg p-2">
            <p className="text-[var(--text-muted)] text-xs">Site</p>
            <p className="font-medium text-[var(--text-primary)] truncate">{nextLaunch.launchSite}</p>
          </div>
        </div>

        {nextLaunch.description && (
          <p className="text-[var(--text-secondary)] text-sm line-clamp-2">{nextLaunch.description}</p>
        )}

        <Countdown targetDate={nextLaunch.date} />

        <div className="flex gap-2">
          {nextLaunch.livestream && (
            <a
              href={nextLaunch.livestream}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 text-center px-4 py-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-sm font-semibold rounded-lg transition-all"
            >
              Watch Stream →
            </a>
          )}
          <AddToCalendar launch={nextLaunch} variant="button" />
        </div>
      </div>
    </div>
  );
}
