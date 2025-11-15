'use client';

import { useRocketFacts } from '@/lib/hooks';
import { useEffect, useState } from 'react';

export default function RocketFacts() {
  const { currentFact, loading } = useRocketFacts();
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Fade out animation before changing fact
    setIsVisible(false);
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 300);

    return () => clearTimeout(timer);
  }, [currentFact]);

  if (loading || !currentFact) {
    return (
      <div className="w-full bg-gradient-to-r from-purple-900/20 to-blue-900/20 border-t border-purple-500/30 py-6 px-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-700 rounded w-1/4 mb-2"></div>
            <div className="h-6 bg-gray-700 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'stat':
        return '📊';
      case 'mission':
        return '🎯';
      case 'apod':
        return '🌌';
      case 'trivia':
        return '💡';
      default:
        return '🚀';
    }
  };

  return (
    <div className="w-full bg-gradient-to-r from-purple-900/20 to-blue-900/20 border-t border-purple-500/30 py-6 px-8">
      <div className="max-w-7xl mx-auto">
        <div
          className={`transition-opacity duration-300 ${
            isVisible ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div className="flex items-start gap-3">
            <span className="text-2xl">{getIcon(currentFact.type)}</span>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-purple-400 mb-1 uppercase tracking-wide">
                {currentFact.title}
              </h3>
              <p className="text-gray-300 text-base leading-relaxed">
                {currentFact.value}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Source: {currentFact.source.toUpperCase()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
