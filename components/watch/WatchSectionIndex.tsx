'use client';

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const WATCH_SECTIONS = [
  { id: 'watch-coverage', label: 'Coverage' },
  { id: 'watch-queue', label: 'Queue' },
  { id: 'watch-mission', label: 'Mission' },
  { id: 'watch-intelligence', label: 'Intel' },
  { id: 'watch-trajectory', label: 'Path' },
] as const;

type WatchSectionId = (typeof WATCH_SECTIONS)[number]['id'];

interface SectionTrackState {
  overflowing: boolean;
  canMoveBackward: boolean;
  canMoveForward: boolean;
  firstVisible: number;
  lastVisible: number;
}

function isWatchSectionId(value: string): value is WatchSectionId {
  return WATCH_SECTIONS.some((section) => section.id === value);
}

export default function WatchSectionIndex(): React.ReactElement {
  const [activeSectionId, setActiveSectionId] =
    useState<WatchSectionId>('watch-coverage');
  const navRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number | null>(null);
  const trackId = useId();
  const trackInstructionsId = useId();
  const [trackState, setTrackState] = useState<SectionTrackState>({
    overflowing: false,
    canMoveBackward: false,
    canMoveForward: false,
    firstVisible: 1,
    lastVisible: WATCH_SECTIONS.length,
  });

  const updateTrackState = useCallback((): void => {
    const track = trackRef.current;
    if (!track) return;

    const maxScrollLeft = Math.max(0, track.scrollWidth - track.clientWidth);
    const trackBounds = track.getBoundingClientRect();
    const visibleIndexes = [...track.children].flatMap((child, index) => {
      const bounds = child.getBoundingClientRect();
      const visibleWidth = Math.max(
        0,
        Math.min(bounds.right, trackBounds.right) -
          Math.max(bounds.left, trackBounds.left),
      );
      return visibleWidth >= bounds.width - 1 ? [index] : [];
    });
    const fallbackIndex = Math.min(
      WATCH_SECTIONS.length - 1,
      Math.max(
        0,
        Math.round(
          (track.scrollLeft / Math.max(1, maxScrollLeft)) *
            (WATCH_SECTIONS.length - 1),
        ),
      ),
    );
    const nextState = {
      overflowing: maxScrollLeft > 1,
      canMoveBackward: track.scrollLeft > 1,
      canMoveForward: track.scrollLeft < maxScrollLeft - 1,
      firstVisible: (visibleIndexes[0] ?? fallbackIndex) + 1,
      lastVisible:
        (visibleIndexes[visibleIndexes.length - 1] ?? fallbackIndex) + 1,
    };

    setTrackState((current) =>
      current.overflowing === nextState.overflowing &&
      current.canMoveBackward === nextState.canMoveBackward &&
      current.canMoveForward === nextState.canMoveForward &&
      current.firstVisible === nextState.firstVisible &&
      current.lastVisible === nextState.lastVisible
        ? current
        : nextState,
    );
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const frame = window.requestAnimationFrame(updateTrackState);
    const observer = new ResizeObserver(updateTrackState);
    observer.observe(track);
    for (const child of track.children) observer.observe(child);
    window.addEventListener('resize', updateTrackState);

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('resize', updateTrackState);
    };
  }, [updateTrackState]);

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

  const moveTrack = (direction: -1 | 1): void => {
    const track = trackRef.current;
    if (!track) return;

    track.scrollBy({
      left: direction * Math.max(112, Math.floor(track.clientWidth * 0.72)),
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'auto'
        : 'smooth',
    });
  };

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
    if (currentIndex < 0) {
      const track = trackRef.current;
      if (!track) return;

      event.preventDefault();
      if (event.key === 'Home') {
        track.scrollTo({ left: 0, behavior: 'auto' });
      } else if (event.key === 'End') {
        track.scrollTo({ left: track.scrollWidth, behavior: 'auto' });
      } else {
        moveTrack(event.key === 'ArrowLeft' ? -1 : 1);
      }
      return;
    }

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
      {trackState.overflowing ? (
        <div className="flex items-center justify-between gap-1.5 px-1.5 py-1.5">
          <p
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className="whitespace-nowrap font-mono text-[0.5rem] uppercase tracking-[0.04em] text-[var(--text-muted)]"
          >
            <span className="sr-only">
              Watch index. {WATCH_SECTIONS.length} sections. Showing{' '}
              {trackState.firstVisible === trackState.lastVisible
                ? trackState.firstVisible
                : `${trackState.firstVisible} through ${trackState.lastVisible}`}{' '}
              of {WATCH_SECTIONS.length}.
            </span>
            <span aria-hidden="true">
              <span className="text-[var(--console-cyan)]">Index</span>{' '}
              {trackState.firstVisible === trackState.lastVisible
                ? trackState.firstVisible
                : `${trackState.firstVisible}–${trackState.lastVisible}`}{' '}
              / {WATCH_SECTIONS.length}
            </span>
          </p>
          <div
            role="group"
            aria-label="Watch index navigation"
            className="flex shrink-0 items-center gap-1.5"
          >
            <button
              type="button"
              aria-label="Previous watch sections"
              aria-controls={trackId}
              aria-disabled={!trackState.canMoveBackward}
              tabIndex={trackState.canMoveBackward ? undefined : -1}
              onClick={() => {
                if (trackState.canMoveBackward) moveTrack(-1);
              }}
              className="icon-button !h-[44px] !w-[44px] aria-disabled:cursor-default aria-disabled:opacity-35"
            >
              <ChevronLeft aria-hidden="true" size={17} />
            </button>
            <button
              type="button"
              aria-label="Next watch sections"
              aria-controls={trackId}
              aria-disabled={!trackState.canMoveForward}
              tabIndex={trackState.canMoveForward ? undefined : -1}
              onClick={() => {
                if (trackState.canMoveForward) moveTrack(1);
              }}
              className="icon-button !h-[44px] !w-[44px] aria-disabled:cursor-default aria-disabled:opacity-35"
            >
              <ChevronRight aria-hidden="true" size={17} />
            </button>
          </div>
        </div>
      ) : null}
      {trackState.overflowing ? (
        <p id={trackInstructionsId} className="sr-only">
          Use the previous and next buttons, horizontal scrolling, or the left
          and right arrow keys to reveal every watch section.
        </p>
      ) : null}
      <div
        id={trackId}
        ref={trackRef}
        data-watch-section-track
        tabIndex={trackState.overflowing ? 0 : undefined}
        aria-describedby={
          trackState.overflowing ? trackInstructionsId : undefined
        }
        onKeyDown={handleTrackKeyDown}
        onScroll={updateTrackState}
        className="flex min-w-0 max-w-full overflow-x-auto overscroll-x-contain outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--console-cyan)]"
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
                className={`hidden min-[440px]:inline ${
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
