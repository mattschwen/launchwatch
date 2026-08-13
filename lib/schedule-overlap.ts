import { getLaunchWindowBounds, hasCalendarReadyLaunchTime } from './format';
import type { Launch } from './types';

const MAX_PLANNING_WINDOW_MS = 24 * 60 * 60 * 1_000;

export interface LaunchWindowOverlap {
  firstLaunch: Launch;
  secondLaunch: Launch;
  start: string;
  end: string;
  durationMs: number;
}

interface PlanningWindow {
  launch: Launch;
  startMs: number;
  endMs: number;
}

export function getLaunchWindowOverlaps(
  launches: readonly Launch[],
): LaunchWindowOverlap[] {
  const windows = launches
    .flatMap((launch): PlanningWindow[] => {
      if (!hasCalendarReadyLaunchTime(launch.datePrecision)) return [];

      const bounds = getLaunchWindowBounds(launch);
      if (!bounds) return [];

      const startMs = bounds.start.getTime();
      const endMs = bounds.end.getTime();
      if (endMs - startMs > MAX_PLANNING_WINDOW_MS) return [];

      return [{ launch, startMs, endMs }];
    })
    .sort(
      (a, b) =>
        a.startMs - b.startMs ||
        a.endMs - b.endMs ||
        a.launch.id.localeCompare(b.launch.id),
    );
  const overlaps: LaunchWindowOverlap[] = [];

  for (let firstIndex = 0; firstIndex < windows.length; firstIndex += 1) {
    const first = windows[firstIndex];

    for (
      let secondIndex = firstIndex + 1;
      secondIndex < windows.length;
      secondIndex += 1
    ) {
      const second = windows[secondIndex];
      if (second.startMs >= first.endMs) break;
      if (second.launch.id === first.launch.id) continue;

      const startMs = Math.max(first.startMs, second.startMs);
      const endMs = Math.min(first.endMs, second.endMs);
      if (endMs <= startMs) continue;

      overlaps.push({
        firstLaunch: first.launch,
        secondLaunch: second.launch,
        start: new Date(startMs).toISOString(),
        end: new Date(endMs).toISOString(),
        durationMs: endMs - startMs,
      });
    }
  }

  return overlaps.sort(
    (a, b) =>
      Date.parse(a.start) - Date.parse(b.start) ||
      b.durationMs - a.durationMs ||
      a.firstLaunch.id.localeCompare(b.firstLaunch.id) ||
      a.secondLaunch.id.localeCompare(b.secondLaunch.id),
  );
}
