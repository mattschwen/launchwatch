import { describe, expect, it } from 'vitest';
import { generateICS, getGoogleCalendarUrl } from '@/lib/calendar';
import { UPCOMING_LAUNCHES } from '../fixtures/launches';

describe('calendar exports', () => {
  it('builds a two-hour RFC 5545 event and escapes text', () => {
    const launch = {
      ...UPCOMING_LAUNCHES[0],
      name: 'Orbital Dawn, Phase 1',
      description: 'Payload checkout; then deployment.',
    };

    const calendar = generateICS(launch);

    expect(calendar).toContain('BEGIN:VCALENDAR\r\n');
    expect(calendar).toContain('DTSTART:20350728T143000Z');
    expect(calendar).toContain('DTEND:20350728T163000Z');
    expect(calendar).toContain('SUMMARY:Orbital Dawn\\, Phase 1');
    expect(calendar).toContain('Payload checkout\\; then deployment.');
    expect(calendar).toContain(`UID:launch-${launch.id}@launchwatch.app`);
  });

  it('normalizes newlines, escapes reserved characters, and folds at 75 bytes', () => {
    const launch = {
      ...UPCOMING_LAUNCHES[0],
      name: 'Mission\\Path,\r\nSecond; stage',
      rocket: 'R\\1',
      launchSite: 'Pad, 1',
      description: 'First\r\nSecond\rThird\nFourth; phase',
    };

    const calendar = generateICS(launch);
    const unfolded = calendar.replace(/\r\n /g, '');
    const physicalLines = calendar.split('\r\n').filter(Boolean);

    expect(calendar.endsWith('\r\n')).toBe(true);
    expect(calendar.replace(/\r\n/g, '')).not.toMatch(/[\r\n]/);
    expect(unfolded).toContain(
      'SUMMARY:Mission\\\\Path\\,\\nSecond\\; stage',
    );
    expect(unfolded).toContain(
      'DESCRIPTION:Rocket: R\\\\1\\nLaunch Site: Pad\\, 1\\nFirst\\nSecond\\nThird\\nFourth\\; phase',
    );
    expect(
      physicalLines.every(
        (line) => new TextEncoder().encode(line).length <= 75,
      ),
    ).toBe(true);
  });

  it.each([
    'https://example.com/watch\r\nX-URL-INJECTED:YES',
    'javascript:alert(1)',
  ])('omits an unsafe livestream URL from ICS output', (livestream) => {
    const launch = {
      ...UPCOMING_LAUNCHES[0],
      id: 'safe\r\nX-UID-INJECTED:YES',
      livestream,
    };

    const calendar = generateICS(launch);
    const unfoldedLines = calendar
      .replace(/\r\n /g, '')
      .split('\r\n')
      .filter(Boolean);

    expect(unfoldedLines).not.toContain(
      expect.stringMatching(/^URL:/),
    );
    expect(calendar).not.toContain('Watch Live:');
    expect(calendar).not.toContain('\r\nX-URL-INJECTED:');
    expect(calendar).toContain(
      'UID:launch-safe--X-UID-INJECTED-YES@launchwatch.app',
    );
  });

  it('creates a Google Calendar template URL with mission context', () => {
    const url = new URL(getGoogleCalendarUrl(UPCOMING_LAUNCHES[0]));

    expect(url.origin).toBe('https://calendar.google.com');
    expect(url.searchParams.get('action')).toBe('TEMPLATE');
    expect(url.searchParams.get('text')).toBe('Orbital Dawn');
    expect(url.searchParams.get('dates')).toBe(
      '20350728T143000Z/20350728T163000Z'
    );
    expect(url.searchParams.get('details')).toContain('Astra Nova');
  });
});
