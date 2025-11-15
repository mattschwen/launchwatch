'use client';

import { useNextLaunch } from '@/lib/hooks';
import Countdown from './Countdown';

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
    <div className="w-full bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-500/30 rounded-lg p-6 mb-8">
      <h2 className="text-2xl font-bold text-blue-400 mb-4">⏰ Next Launch</h2>

      <div className="space-y-4">
        <div>
          <h3 className="text-3xl font-bold text-white mb-2">{nextLaunch.name}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-gray-300">
            <div>
              <span className="text-gray-400">Rocket:</span>{' '}
              <span className="font-semibold">{nextLaunch.rocket}</span>
            </div>
            <div>
              <span className="text-gray-400">Launch Site:</span>{' '}
              <span className="font-semibold">{nextLaunch.launchSite}</span>
            </div>
          </div>
          <div className="mt-2 text-gray-300">
            <span className="text-gray-400">Scheduled:</span>{' '}
            <span className="font-semibold">{formatDate(nextLaunch.date)}</span>
          </div>
        </div>

        {nextLaunch.description && (
          <p className="text-gray-300 text-sm">{nextLaunch.description}</p>
        )}

        <div className="pt-4 border-t border-gray-700">
          <p className="text-gray-400 text-sm mb-3">Countdown:</p>
          <Countdown targetDate={nextLaunch.date} />
        </div>

        {nextLaunch.livestream && (
          <a
            href={nextLaunch.livestream}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
          >
            <span>Watch Stream</span>
            <span>→</span>
          </a>
        )}
      </div>
    </div>
  );
}
