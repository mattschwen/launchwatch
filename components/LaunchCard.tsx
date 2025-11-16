'use client';

import { Launch } from '@/lib/types';
import AddToCalendar from './AddToCalendar';
import { getYouTubeEmbedUrl } from '@/lib/youtube';
import Image from 'next/image';

interface LaunchCardProps {
  launch: Launch;
  showVideo?: boolean;
}

export default function LaunchCard({ launch, showVideo = false }: LaunchCardProps) {
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
        return 'bg-[var(--live)]/20 text-[var(--live)] border-[var(--live)]/50';
      case 'upcoming':
        return 'bg-[var(--upcoming)]/20 text-[var(--upcoming)] border-[var(--upcoming)]/50';
      case 'success':
        return 'bg-[var(--success)]/20 text-[var(--success)] border-[var(--success)]/50';
      case 'failure':
        return 'bg-[var(--text-muted)]/20 text-[var(--text-muted)] border-[var(--text-muted)]/50';
      case 'tbd':
        return 'bg-[var(--warning)]/20 text-[var(--warning)] border-[var(--warning)]/50';
      default:
        return 'bg-[var(--text-muted)]/20 text-[var(--text-muted)] border-[var(--text-muted)]/50';
    }
  };

  const { date, time } = formatDate(launch.date);
  const embedUrl = showVideo && launch.livestream ? getYouTubeEmbedUrl(launch.livestream) : null;
  const displayImage = launch.missionPatch || launch.image;

  return (
    <div className="glass glass-hover rounded-xl overflow-hidden group flex flex-col">
      {/* Image/Video Section */}
      {showVideo && embedUrl && !embedUrl.includes('/results') ? (
        <div className="aspect-video w-full bg-black">
          <iframe
            src={embedUrl}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
        </div>
      ) : displayImage ? (
        <div className="relative w-full h-48 bg-[var(--surface)]">
          <Image
            src={displayImage}
            alt={launch.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </div>
      ) : null}

      {/* Content Section */}
      <div className="p-5 flex-1 flex flex-col">
        <div className="flex justify-between items-start gap-2 mb-4">
          <h3 className="text-lg font-bold text-[var(--text-primary)] group-hover:text-[var(--primary-hover)] transition-colors leading-tight">
            {launch.name}
          </h3>
          <span className={`px-2 py-1 rounded-full text-xs font-semibold border uppercase flex-shrink-0 ${getStatusColor(launch.status)}`}>
            {launch.status}
          </span>
        </div>

        <div className="space-y-2 mb-4 text-sm flex-1">
          <div className="flex items-center gap-2">
            <span className="text-base">🚀</span>
            <span className="text-[var(--text-primary)] font-medium">{launch.rocket}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-base">📍</span>
            <span className="text-[var(--text-secondary)] truncate">{launch.launchSite}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-base">🕐</span>
            <span className="text-[var(--text-secondary)]">{date} • {time}</span>
          </div>
        </div>

        {launch.description && (
          <p className="text-[var(--text-secondary)] text-sm mb-4 line-clamp-3 leading-relaxed">
            {launch.description}
          </p>
        )}

        <div className="flex gap-2 mt-auto">
          {launch.livestream && !showVideo && (
            <a
              href={launch.livestream}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 text-center px-3 py-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-sm font-semibold rounded-lg transition-all"
            >
              Watch Stream →
            </a>
          )}
          <AddToCalendar launch={launch} variant={launch.livestream && !showVideo ? "icon" : "button"} />
        </div>
      </div>
    </div>
  );
}
