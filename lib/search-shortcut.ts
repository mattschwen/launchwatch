'use client';

import { useEffect, useRef } from 'react';

export function shouldHandleSearchShortcut(
  event: Pick<
    KeyboardEvent,
    | 'altKey'
    | 'ctrlKey'
    | 'defaultPrevented'
    | 'key'
    | 'metaKey'
    | 'repeat'
    | 'target'
  >,
): boolean {
  if (
    event.key !== '/' ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    event.defaultPrevented ||
    event.repeat
  ) {
    return false;
  }

  const target = event.target;
  if (!(target instanceof HTMLElement)) return true;

  return !(
    target.matches('input, textarea, select') ||
    target.isContentEditable ||
    target.closest('[contenteditable]:not([contenteditable="false"])')
  );
}

export function useMissionSearchShortcut(onShortcut: () => void): void {
  const shortcutRef = useRef(onShortcut);

  useEffect(() => {
    shortcutRef.current = onShortcut;
  }, [onShortcut]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (!shouldHandleSearchShortcut(event)) return;

      event.preventDefault();
      shortcutRef.current();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);
}
