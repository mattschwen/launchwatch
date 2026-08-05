import type { LaunchSource } from './types';

const SOURCE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;

export interface ParsedLaunchId {
  source: LaunchSource;
  sourceId: string;
  canonicalId: string;
  legacy: boolean;
}

export function toCanonicalLaunchId(
  source: LaunchSource,
  sourceId: string,
): string {
  return `${source}-${sourceId}`;
}

export function parseLaunchId(
  value: string | null | undefined,
): ParsedLaunchId | null {
  const id = value?.trim();
  if (!id || id.length > 140) return null;

  const legacyMatch = id.match(/^past-(.+)$/);
  if (legacyMatch?.[1] && SOURCE_ID_PATTERN.test(legacyMatch[1])) {
    return {
      source: 'spacex',
      sourceId: legacyMatch[1],
      canonicalId: toCanonicalLaunchId('spacex', legacyMatch[1]),
      legacy: true,
    };
  }

  const match = id.match(/^(spacex|ll2)-(.+)$/);
  if (!match?.[1] || !match[2] || !SOURCE_ID_PATTERN.test(match[2])) {
    return null;
  }

  const source = match[1] as LaunchSource;
  return {
    source,
    sourceId: match[2],
    canonicalId: toCanonicalLaunchId(source, match[2]),
    legacy: false,
  };
}
