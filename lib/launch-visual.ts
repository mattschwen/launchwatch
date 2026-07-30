import type {
  Launch,
  LaunchVisual,
  LaunchVisualKind,
} from '@/lib/types';

export type { LaunchVisualKind };
export type LaunchVisualStatus =
  | 'available'
  | 'missing'
  | 'rights-unverified';

export type LaunchVisualAssetLike = LaunchVisual;

export interface EligibleLaunchVisual {
  kind: LaunchVisualKind;
  url: string;
  thumbnailUrl: string | null;
  name: string | null;
  credit: string;
  licenseName: string;
  licenseUrl: string;
  sourceLabel: string | null;
  sourceUrl: string | null;
}

export interface LaunchVisualMetadata {
  url: string;
  alt: string;
}

export type LaunchVisualSelection =
  | {
      status: 'available';
      visual: EligibleLaunchVisual;
    }
  | {
      status: 'missing' | 'rights-unverified';
      visual: null;
    };

const LL2_IMAGE_HOST =
  'thespacedevs-prod.nyc3.digitaloceanspaces.com';
const EXACT_IMAGE_HOSTS = new Set([
  'images2.imgbox.com',
  'i.imgur.com',
]);

function trimmed(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const result = value.trim();
  return result.length > 0 ? result : null;
}

function isSafeHttpsUrl(value: string | null | undefined): value is string {
  const normalized = trimmed(value);
  if (!normalized) return false;

  try {
    const parsed = new URL(normalized);
    return (
      parsed.protocol === 'https:' &&
      Boolean(parsed.hostname) &&
      !parsed.username &&
      !parsed.password
    );
  } catch {
    return false;
  }
}

export function isSupportedLaunchVisualUrl(
  value: string | null | undefined
): value is string {
  const normalized = trimmed(value);
  if (!normalized) return false;

  if (
    normalized.startsWith('/') &&
    !normalized.startsWith('//') &&
    !normalized.includes('\\')
  ) {
    return true;
  }

  try {
    const parsed = new URL(normalized);
    const hostname = parsed.hostname.toLowerCase();
    const flickrSubdomain =
      hostname.endsWith('.staticflickr.com') &&
      hostname.length > '.staticflickr.com'.length;
    const ll2MediaPath =
      hostname === LL2_IMAGE_HOST &&
      parsed.pathname.startsWith('/media/');

    return (
      parsed.protocol === 'https:' &&
      !parsed.username &&
      !parsed.password &&
      !parsed.port &&
      (
        EXACT_IMAGE_HOSTS.has(hostname) ||
        flickrSubdomain ||
        ll2MediaPath
      )
    );
  } catch {
    return false;
  }
}

function isPermittedLicense(value: string): boolean {
  const normalized = value
    .trim()
    .toUpperCase()
    .replace(/[‐‑‒–—−_]/g, '-')
    .replace(/\s+/g, ' ');

  if (!normalized || /\bUNKNOWN\b/.test(normalized)) return false;
  if (
    /(?:^|[\s-])ND(?:$|[\s-])/.test(normalized) ||
    /NO\s*DERIVATIVES?/.test(normalized) ||
    /NODERIVATIVES?/.test(normalized)
  ) {
    return false;
  }

  if (
    /(?:^|[\s(])CC\s*0(?:$|[\s).,-])/.test(normalized) ||
    normalized.includes('CREATIVE COMMONS ZERO') ||
    normalized.includes('PUBLIC DOMAIN')
  ) {
    return true;
  }

  return (
    /(?:^|[\s(])CC\s*BY(?:$|[\s).,-])/.test(normalized) ||
    (
      normalized.includes('CREATIVE COMMONS') &&
      normalized.includes('ATTRIBUTION')
    )
  );
}

function meaningfulCredit(
  value: string | null | undefined
): string | null {
  const credit = trimmed(value);
  if (!credit) return null;

  const placeholder = credit
    .toUpperCase()
    .replace(/[._-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (
    /^(?:UNKNOWN(?: CREDIT)?|N\/?A|TBD|NONE|UNSPECIFIED|NOT (?:AVAILABLE|PROVIDED)|NO (?:CREDIT|ATTRIBUTION))$/.test(
      placeholder
    )
  ) {
    return null;
  }

  return credit;
}

function eligibleVisual(
  asset: LaunchVisualAssetLike,
  kind: LaunchVisualKind
): EligibleLaunchVisual | null {
  const url = trimmed(asset.url);
  const credit = meaningfulCredit(asset.credit);
  const licenseName = trimmed(asset.licenseName);
  const licenseUrl = trimmed(asset.licenseUrl);

  if (
    !url ||
    !isSupportedLaunchVisualUrl(url) ||
    !credit ||
    !licenseName ||
    !licenseUrl ||
    !isSafeHttpsUrl(licenseUrl) ||
    !isPermittedLicense(licenseName) ||
    asset.singleUse !== false
  ) {
    return null;
  }

  const thumbnailUrl = trimmed(asset.thumbnailUrl);
  const sourceUrl = trimmed(asset.sourceUrl);

  return {
    kind,
    url,
    thumbnailUrl:
      thumbnailUrl && isSupportedLaunchVisualUrl(thumbnailUrl)
        ? thumbnailUrl
        : null,
    name: trimmed(asset.name),
    credit,
    licenseName,
    licenseUrl,
    sourceLabel: trimmed(asset.sourceLabel),
    sourceUrl:
      sourceUrl && isSafeHttpsUrl(sourceUrl) ? sourceUrl : null,
  };
}

export function isEligibleLaunchVisual(
  asset: LaunchVisualAssetLike
): boolean {
  return eligibleVisual(asset, asset.kind) !== null;
}

export function selectLaunchVisual(
  launch: Launch | null | undefined
): LaunchVisualSelection {
  if (!launch) {
    return { status: 'missing', visual: null };
  }

  const candidates: Array<{
    asset: LaunchVisualAssetLike | null | undefined;
    kind: LaunchVisualKind;
  }> = [
    { asset: launch.vehicleVisual, kind: 'vehicle' },
    { asset: launch.missionVisual, kind: 'mission' },
  ];
  const supplied = candidates.filter(({ asset }) => asset != null);

  if (supplied.length === 0) {
    return { status: 'missing', visual: null };
  }

  for (const { asset, kind } of supplied) {
    const eligible = eligibleVisual(asset as LaunchVisualAssetLike, kind);
    if (eligible) {
      return { status: 'available', visual: eligible };
    }
  }

  return { status: 'rights-unverified', visual: null };
}

export function launchVisualSubject(
  launch: Launch,
  visual: EligibleLaunchVisual
): string {
  if (visual.name) return visual.name;
  return visual.kind === 'vehicle' ? launch.rocket : launch.name;
}

export function launchVisualAlt(
  launch: Launch,
  visual: EligibleLaunchVisual
): string {
  const subject = launchVisualSubject(launch, visual);
  return visual.kind === 'vehicle'
    ? `Vehicle reference image of ${subject}`
    : `Mission image for ${subject}`;
}

export function getLaunchVisualMetadata(
  launch: Launch | null | undefined
): LaunchVisualMetadata | null {
  const selection = selectLaunchVisual(launch);
  if (selection.status !== 'available' || !launch) return null;

  return {
    url: selection.visual.url,
    alt: `${launchVisualAlt(launch, selection.visual)}. Credit: ${
      selection.visual.credit
    }. License: ${selection.visual.licenseName}.`,
  };
}
