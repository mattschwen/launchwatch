'use client';

import { useRocketFacts } from '@/lib/hooks';
import { useEffect, useState } from 'react';

export default function HeaderRocketFact() {
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
      <div className="flex-1 min-w-0 px-3 py-2 animate-pulse">
        <div className="h-3 bg-[var(--surface)] rounded w-24 mb-1"></div>
        <div className="h-4 bg-[var(--surface)] rounded w-full"></div>
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

  // Highlight important text like numbers, percentages, dates, etc.
  const highlightText = (text: string) => {
    // Match numbers (including decimals, commas, percentages, etc.)
    const parts = text.split(/(\d[\d,\.]*%?|\b\d{4}\b)/g);
    
    return parts.map((part, index) => {
      // Check if it's a number or year
      if (/\d/.test(part)) {
        return (
          <span key={index} className="font-bold text-[var(--primary)] bg-[var(--primary)]/10 px-1 rounded">
            {part}
          </span>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div className="flex-1 min-w-0 px-3 py-2">
      <div className={`transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
        <div className="flex items-start gap-2">
          <span className="text-base flex-shrink-0 mt-0.5">{getIcon(currentFact.type)}</span>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-0.5">
              {currentFact.title}
            </p>
            <p className="text-xs text-[var(--text-secondary)] font-medium leading-tight line-clamp-2">
              {highlightText(currentFact.value)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

