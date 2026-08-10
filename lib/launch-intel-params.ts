import { parseLaunchId } from './launch-id';
import type { Launch } from './types';

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
  const idValues = searchParams.getAll('id');
  if (idValues.length !== 1) {
    return null;
  }

  const id = idValues[0];
  if (
    !id ||
    id !== id.trim() ||
    id.length > MAX_LAUNCH_ID_LENGTH
  ) {
    return null;
  }

  const parsed = parseLaunchId(id);
  return parsed && !parsed.legacy && parsed.canonicalId === id ? id : null;
}
