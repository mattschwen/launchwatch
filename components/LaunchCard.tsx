'use client';

import { Launch } from '@/lib/types';

interface LaunchCardProps {
  launch: Launch;
}

export default function LaunchCard({ launch }: LaunchCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }),
      time: date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
      })
    };
  };

  const getStatusColor = (status: Launch['status']) => {
    switch (status) {
      case 'live':
        return 'bg-red-500/20 text-red-400 border-red-500/50';
      case 'upcoming':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
      case 'success':
        return 'bg-green-500/20 text-green-400 border-green-500/50';
      case 'failure':
        return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
      case 'tbd':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    }
  };

  const { date, time } = formatDate(launch.date);

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-5 hover:border-gray-600 transition-all hover:shadow-lg hover:shadow-blue-500/10 group">
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors flex-1">
          {launch.name}
        </h3>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold border uppercase ${getStatusColor(launch.status)}`}>
          {launch.status}
        </span>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-400">🚀</span>
          <span className="text-gray-300">{launch.rocket}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-400">📍</span>
          <span className="text-gray-300">{launch.launchSite}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-400">📅</span>
          <span className="text-gray-300">{date}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-400">🕐</span>
          <span className="text-gray-300">{time}</span>
        </div>
      </div>

      {launch.description && (
        <p className="text-gray-400 text-sm mb-4 line-clamp-2">
          {launch.description}
        </p>
      )}

      {launch.livestream && (
        <a
          href={launch.livestream}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          <span>Watch Stream</span>
          <span>→</span>
        </a>
      )}
    </div>
  );
}
