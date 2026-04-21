'use client';

import { useRocketFacts } from '@/lib/hooks';

export default function RocketFacts() {
  const { currentFact, loading } = useRocketFacts();

  if (loading || !currentFact) {
    return (
      <div className="w-full glass border-t border-[var(--glass-border)] py-4 px-4">
        <div className="max-w-7xl mx-auto animate-pulse">
          <div className="h-3 bg-[var(--surface)] rounded w-1/4 mb-1.5"></div>
          <div className="h-4 bg-[var(--surface)] rounded w-3/4"></div>
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
    <div className="w-full glass border-t border-[var(--glass-border)] py-4 px-4">
      <div className="max-w-7xl mx-auto">
        <div key={currentFact.id} className="animate-fade-in">
          <div className="flex items-start gap-2">
            <span className="text-xl flex-shrink-0">{getIcon(currentFact.type)}</span>
            <div className="flex-1 min-w-0">
              <h3 className="text-xs font-semibold gradient-text uppercase tracking-wide">
                {currentFact.title}
              </h3>
              <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
                {currentFact.value}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
