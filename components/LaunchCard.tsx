'use client';

import { Launch } from '@/lib/types';
import AddToCalendar from './AddToCalendar';
import { getYouTubeEmbedUrl, generateYouTubeSearchUrl, getProviderYouTubeChannel } from '@/lib/youtube';
import Image from 'next/image';
import { useState } from 'react';

interface LaunchCardProps {
  launch: Launch;
  showVideo?: boolean;
  showCalendar?: boolean;
}

export default function LaunchCard({ launch, showVideo = false, showCalendar = true }: LaunchCardProps) {
  const [showStreamMenu, setShowStreamMenu] = useState(false);
  
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
  const providerChannel = getProviderYouTubeChannel(launch);
  const searchUrl = generateYouTubeSearchUrl(launch);

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
        <div className="relative w-full h-40 sm:h-48 lg:h-56 bg-[var(--surface)]">
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
      <div className="p-4 sm:p-5 flex-1 flex flex-col">
        <div className="flex justify-between items-start gap-2 mb-3 sm:mb-4">
          <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)] group-hover:text-[var(--primary-hover)] transition-colors leading-tight">
            {launch.name}
          </h3>
          <span className={`px-2 py-1 rounded-full text-[10px] sm:text-xs font-semibold border uppercase flex-shrink-0 ${getStatusColor(launch.status)}`}>
            {launch.status}
          </span>
        </div>

        <div className="space-y-1.5 sm:space-y-2 mb-3 sm:mb-4 text-xs sm:text-sm flex-1">
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
          <p className="text-[var(--text-secondary)] text-xs sm:text-sm mb-3 sm:mb-4 line-clamp-2 sm:line-clamp-3 leading-relaxed">
            {launch.description}
          </p>
        )}

        <div className="flex gap-2 mt-auto relative min-h-[44px] items-center">
          {!showVideo && (launch.status === 'upcoming' || launch.status === 'live' || launch.status === 'tbd' || !showCalendar) && (
            <>
              {launch.livestream ? (
                <a
                  href={launch.livestream}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 text-center px-3 py-2.5 bg-[var(--primary)] hover:bg-[var(--primary-hover)] active:bg-[var(--primary-hover)] text-white text-xs sm:text-sm font-semibold rounded-lg transition-all min-h-[44px] flex items-center justify-center"
                >
                  <span className="hidden sm:inline">Watch Stream →</span>
                  <span className="sm:hidden">Watch →</span>
                </a>
              ) : (
                <>
                  <button
                    onClick={() => setShowStreamMenu(!showStreamMenu)}
                    className="flex-1 text-center px-3 py-2.5 bg-white border-2 border-gray-200 hover:border-[var(--primary)] text-[var(--text-primary)] hover:text-[var(--primary)] active:border-[var(--primary)] text-xs sm:text-sm font-semibold rounded-lg transition-all min-h-[44px] flex items-center justify-center shadow-sm hover:shadow-md"
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
                      <div className="absolute bottom-full left-0 mb-2 w-full bg-white rounded-lg shadow-lg z-[70] border border-gray-200">
                        <div className="p-2 space-y-1">
                          <p className="text-xs text-[var(--text-muted)] px-2 py-1">Find livestream:</p>
                          {providerChannel && (
                            <a
                              href={providerChannel}
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
                            href={searchUrl}
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
            </>
          )}
          {showCalendar && <AddToCalendar launch={launch} variant={(launch.status === 'upcoming' || launch.status === 'live' || launch.status === 'tbd') && !showVideo ? "icon" : "button"} />}
        </div>
      </div>
    </div>
  );
}
