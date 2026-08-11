'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';

const WATCH_SECTIONS = [
  { id: 'watch-coverage', label: 'Coverage' },
  { id: 'watch-queue', label: 'Queue' },
  { id: 'watch-mission', label: 'Mission' },
  { id: 'watch-intelligence', label: 'Intel' },
  { id: 'watch-trajectory', label: 'Path' },
] as const;

type WatchSectionId = (typeof WATCH_SECTIONS)[number]['id'];

function isWatchSectionId(value: string): value is WatchSectionId {
  return WATCH_SECTIONS.some((section) => section.id === value);
}

export default function WatchSectionIndex(): React.ReactElement {
  const [activeSectionId, setActiveSectionId] =
    useState<WatchSectionId>('watch-coverage');
  const navRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number | null>(null);

  const revealSection = useCallback(
    (
      sectionId: WatchSectionId,
      { focus = true, updateHash = true } = {},
    ): void => {
      const target = document.getElementById(sectionId);
      if (!target) return;

      setActiveSectionId(sectionId);
      if (updateHash) {
        window.history.replaceState(
          window.history.state,
          '',
          `${window.location.pathname}${window.location.search}#${sectionId}`,
        );
      }
      const behavior = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches
        ? 'auto'
        : 'smooth';
      const headerBottom =
        document.querySelector<HTMLElement>('header')?.getBoundingClientRect()
          .bottom ?? 0;
      const indexHeight = navRef.current?.getBoundingClientRect().height ?? 0;
      const targetDocumentTop =
        target.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({
        top: Math.max(0, targetDocumentTop - headerBottom - indexHeight - 16),
        behavior,
      });
      if (focus) target.focus({ preventScroll: true });
    },
    [],
  );

  useEffect(() => {
    const requestedSection = window.location.hash.slice(1);
    if (!isWatchSectionId(requestedSection)) return;

    const frame = window.requestAnimationFrame(() =>
      revealSection(requestedSection, { focus: false, updateHash: false }),
    );
    return () => window.cancelAnimationFrame(frame);
  }, [revealSection]);

  useEffect(() => {
    const updateActiveSection = (): void => {
      frameRef.current = null;
      const activationLine =
        (navRef.current?.getBoundingClientRect().bottom ?? 0) + 24;
      let nextSection: (typeof WATCH_SECTIONS)[number] = WATCH_SECTIONS[0];
      let nextTop = Number.NEGATIVE_INFINITY;

      for (const section of WATCH_SECTIONS) {
        const top =
          document.getElementById(section.id)?.getBoundingClientRect().top;
        if (top === undefined || top > activationLine || top <= nextTop + 1) {
          continue;
        }
        nextSection = section;
        nextTop = top;
      }

      if (
        document.documentElement.scrollHeight > window.innerHeight &&
        window.scrollY + window.innerHeight >=
        document.documentElement.scrollHeight - 2
      ) {
        nextSection = WATCH_SECTIONS[WATCH_SECTIONS.length - 1];
      }
      setActiveSectionId(nextSection.id);
    };
    const scheduleUpdate = (): void => {
      if (frameRef.current !== null) return;
      frameRef.current = window.requestAnimationFrame(updateActiveSection);
    };

    updateActiveSection();
    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate);
    return () => {
      window.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    const activeLink = track?.querySelector<HTMLElement>(
      `[data-watch-section-id="${activeSectionId}"]`,
    );
    if (!track || !activeLink) return;

    const trackBounds = track.getBoundingClientRect();
    const linkBounds = activeLink.getBoundingClientRect();
    if (
      linkBounds.left >= trackBounds.left &&
      linkBounds.right <= trackBounds.right
    ) {
      return;
    }
    track.scrollBy({
      left:
        linkBounds.left -
        trackBounds.left -
        (trackBounds.width - linkBounds.width) / 2,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'auto'
        : 'smooth',
    });
  }, [activeSectionId]);

  const handleTrackKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (
      event.key !== 'ArrowLeft' &&
      event.key !== 'ArrowRight' &&
      event.key !== 'Home' &&
      event.key !== 'End'
    ) {
      return;
    }

    const links = Array.from(
      trackRef.current?.querySelectorAll<HTMLAnchorElement>('a') ?? [],
    );
    const currentIndex = links.indexOf(
      document.activeElement as HTMLAnchorElement,
    );
    if (currentIndex < 0) return;

    event.preventDefault();
    const nextIndex =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? links.length - 1
          : event.key === 'ArrowRight'
            ? (currentIndex + 1) % links.length
            : (currentIndex - 1 + links.length) % links.length;
    links[nextIndex]?.focus();
  };

  return (
    <nav
      ref={navRef}
      aria-label="Watch console sections"
      className="watch-section-index surface-card holo-card signal-cold !sticky top-[calc(3.5rem+var(--safe-area-top))] z-40 mb-4 min-w-0 max-w-full overflow-hidden bg-[color:var(--surface-header)] shadow-[0_10px_24px_rgba(0,0,0,0.34)] sm:top-[calc(4.375rem+var(--safe-area-top))]"
    >
      <div
        ref={trackRef}
        data-watch-section-track
        onKeyDown={handleTrackKeyDown}
        className="flex min-w-0 max-w-full overflow-x-auto overscroll-x-contain"
      >
        {WATCH_SECTIONS.map((section, index) => {
          const active = section.id === activeSectionId;
          return (
            <a
              key={section.id}
              href={`#${section.id}`}
              data-watch-section-id={section.id}
              aria-current={active ? 'location' : undefined}
              onClick={(event) => {
                event.preventDefault();
                revealSection(section.id);
              }}
              className={`group inline-flex min-h-11 min-w-[3.5rem] flex-1 shrink-0 items-center justify-center gap-1.5 border-r border-[var(--border-subtle)] px-2 font-mono text-[0.67rem] font-semibold uppercase tracking-[0.04em] transition-colors last:border-r-0 hover:bg-[var(--surface-subtle)] hover:text-[var(--text-primary)] focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--console-cyan)] min-[360px]:min-w-[4.5rem] min-[360px]:px-3 min-[360px]:text-[0.7rem] min-[360px]:tracking-[0.06em] ${
                active
                  ? 'bg-[var(--surface-accent)] text-[var(--console-green)]'
                  : 'text-[var(--text-secondary)]'
              }`}
            >
              <span
                aria-hidden="true"
                className={`hidden min-[360px]:inline ${
                  active
                    ? 'text-[var(--console-green)]'
                    : 'text-[var(--console-cyan)]'
                }`}
              >
                {String(index + 1).padStart(2, '0')}
              </span>
              {section.label}
            </a>
          );
        })}
      </div>
    </nav>
  );
}
