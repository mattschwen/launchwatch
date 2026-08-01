import type { Launch } from '@/lib/types';

export type MissionShareResult =
  | 'shared'
  | 'copied'
  | 'cancelled'
  | 'error';

export function getCanonicalLaunchUrl(id: string, origin: string): string {
  return new URL(`/launch/${encodeURIComponent(id)}`, origin).toString();
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException
    ? error.name === 'AbortError'
    : Boolean(
        error &&
          typeof error === 'object' &&
          'name' in error &&
          error.name === 'AbortError'
      );
}

export async function shareMission(
  launch: Launch,
  origin: string
): Promise<MissionShareResult> {
  const url = getCanonicalLaunchUrl(launch.id, origin);
  const shareData: ShareData = {
    title: `${launch.name} | LaunchWatch`,
    text: `Track ${launch.name} on LaunchWatch.`,
    url,
  };

  if (typeof navigator.share === 'function') {
    try {
      await navigator.share(shareData);
      return 'shared';
    } catch (error) {
      if (isAbortError(error)) return 'cancelled';
    }
  }

  try {
    await navigator.clipboard.writeText(url);
    return 'copied';
  } catch {
    return 'error';
  }
}
