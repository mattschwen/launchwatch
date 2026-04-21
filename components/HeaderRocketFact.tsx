'use client';

import { useRocketFacts } from '@/lib/hooks';

export default function HeaderRocketFact() {
  const { currentFact, loading } = useRocketFacts();

  if (loading || !currentFact) {
    return (
      <div className="px-5 py-5">
        <div className="animate-pulse space-y-2">
          <div className="h-3 w-24 rounded-full bg-[var(--line-soft)]" />
          <div className="h-5 w-full rounded-full bg-[var(--line-soft)]" />
          <div className="h-5 w-4/5 rounded-full bg-[var(--line-soft)]" />
        </div>
      </div>
    );
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'stat':
        return 'Vector';
      case 'mission':
        return 'Mission';
      case 'apod':
        return 'Sky';
      case 'trivia':
        return 'Fact';
      default:
        return 'Launch';
    }
  };

  const highlightText = (text: string) => {
    const parts = text.split(/(\d[\d,\.]*%?|\b\d{4}\b)/g);

    return parts.map((part, index) => {
      if (/\d/.test(part)) {
        return (
          <span key={index} className="rounded-full bg-[rgba(36,84,166,0.1)] px-1.5 py-0.5 font-semibold text-[var(--primary)]">
            {part}
          </span>
        );
      }

      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div className="px-5 py-5">
      <div key={currentFact.id} className="reveal-up">
        <p className="section-kicker">{getIcon(currentFact.type)}</p>
        <p className="mt-3 font-display text-2xl uppercase leading-none text-[var(--text-primary)] sm:text-3xl">
          {currentFact.title}
        </p>
        <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
          {highlightText(currentFact.value)}
        </p>
      </div>
    </div>
  );
}
