'use client';

import { useEffect, useState, type RefObject } from 'react';

export function useCompactTextLayout(
  targetRef: RefObject<HTMLElement | null>,
  thresholdInRootEm = 13,
): boolean {
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;

    const update = (): void => {
      const rootFontSize = Number.parseFloat(
        window.getComputedStyle(document.documentElement).fontSize,
      );
      if (!Number.isFinite(rootFontSize) || rootFontSize <= 0) {
        setCompact(false);
        return;
      }

      const next = target.clientWidth / rootFontSize < thresholdInRootEm;
      setCompact((current) => (current === next ? current : next));
    };
    const observer = new ResizeObserver(update);
    observer.observe(target);
    window.addEventListener('resize', update);
    update();

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [targetRef, thresholdInRootEm]);

  return compact;
}
