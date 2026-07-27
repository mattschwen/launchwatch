import { Launch } from './types';

const MAX_LAUNCH_ID_LENGTH = 140;

/**
 * Launch intelligence is resolved from canonical server data. Keeping the
 * client request to an ID prevents descriptions and other mutable launch
 * fields from being placed in URLs or trusted as server input.
 */
export function serializeLaunchForIntel(launch: Launch): string {
  return new URLSearchParams({ id: launch.id }).toString();
}

export function getLaunchIdFromIntelParams(searchParams: URLSearchParams): string | null {
  const id = searchParams.get('id')?.trim();
  if (!id || id.length > MAX_LAUNCH_ID_LENGTH) {
    return null;
  }

  return id;
}
