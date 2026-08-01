export const STREAM_VERIFICATION_UNAVAILABLE_RATIONALE =
  'Automatic stream verification is unavailable. Use the mission-specific search to check current coverage.';

const INTERNAL_OPERATIONS_PATTERN =
  /\b(?:api key|credential|configured|configuration|budget|quota)\b/i;

export function publicLaunchIntelRationale(
  value: string | null | undefined
): string | null | undefined {
  const rationale = value?.trim();
  if (!rationale) return value;

  return INTERNAL_OPERATIONS_PATTERN.test(rationale)
    ? STREAM_VERIFICATION_UNAVAILABLE_RATIONALE
    : rationale;
}
