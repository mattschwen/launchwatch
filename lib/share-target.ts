import { SCHEDULE_SEARCH_MAX_LENGTH } from '@/lib/schedule-return';

const URL_TOKEN = /(?:https?:\/\/|www\.)\S+/giu;
const CONTROL_CHARACTER = /[\u0000-\u001f\u007f]/g;

function normalizeSharedText(value: FormDataEntryValue | null): string {
  if (typeof value !== 'string') return '';

  return value
    .replace(CONTROL_CHARACTER, ' ')
    .replace(URL_TOKEN, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncateSearch(value: string): string {
  if (value.length <= SCHEDULE_SEARCH_MAX_LENGTH) return value;

  const bounded = value.slice(0, SCHEDULE_SEARCH_MAX_LENGTH + 1);
  const lastSpace = bounded.lastIndexOf(' ');
  return bounded
    .slice(0, lastSpace > SCHEDULE_SEARCH_MAX_LENGTH / 2
      ? lastSpace
      : SCHEDULE_SEARCH_MAX_LENGTH)
    .trim();
}

export function getShareTargetSearch(formData: FormData): string {
  const sharedText = normalizeSharedText(formData.get('text'));
  const sharedTitle = normalizeSharedText(formData.get('title'));

  return truncateSearch(sharedText || sharedTitle);
}
