import { describe, expect, it, vi } from 'vitest';
import {
  copyToClipboard,
  generateICS,
  getGoogleCalendarUrl,
} from '@/lib/calendar';
import { UPCOMING_LAUNCHES } from '../fixtures/launches';

describe('calendar exports', () => {
  it('builds an RFC 5545 event from the provider window and escapes text', () => {
    const launch = {
      ...UPCOMING_LAUNCHES[0],
      name: 'Orbital Dawn, Phase 1',
      description: 'Payload checkout; then deployment.',
    };

    const calendar = generateICS(launch);
    const unfolded = calendar.replace(/\r\n /g, '');

    expect(calendar).toContain('BEGIN:VCALENDAR\r\n');
    expect(calendar).toContain('DTSTART:20350728T143000Z');
    expect(calendar).toContain('DTEND:20350728T163000Z');
    expect(unfolded).toContain(
      'Target Time: Jul 28\\, 2035\\, 14:30 UTC'
    );
    expect(unfolded).toContain(
      'Launch Window: Jul 28\\, 2035\\, 14:30–16:30 UTC'
    );
    expect(calendar).toContain('SUMMARY:Orbital Dawn\\, Phase 1');
    expect(unfolded).toContain('Payload checkout\\; then deployment.');
    expect(calendar).toContain(`UID:launch-${launch.id}@launchwatch.app`);
  });

  it('uses a short provider window instead of manufacturing two hours', () => {
    const launch = {
      ...UPCOMING_LAUNCHES[0],
      date: '2035-07-28T14:40:00.000Z',
      windowStart: '2035-07-28T14:30:00.000Z',
      windowEnd: '2035-07-28T14:55:00.000Z',
    };

    const calendar = generateICS(launch);
    const googleUrl = new URL(getGoogleCalendarUrl(launch));

    expect(calendar).toContain('DTSTART:20350728T143000Z');
    expect(calendar).toContain('DTEND:20350728T145500Z');
    expect(googleUrl.searchParams.get('dates')).toBe(
      '20350728T143000Z/20350728T145500Z'
    );
    expect(googleUrl.searchParams.get('details')).toContain(
      'Target Time: Jul 28, 2035, 14:40 UTC'
    );
    expect(googleUrl.searchParams.get('details')).toContain(
      'Launch Window: Jul 28, 2035, 14:30–14:55 UTC'
    );
  });

  it('falls back to two hours for incomplete windows and marks TBD events tentative', () => {
    const launch = {
      ...UPCOMING_LAUNCHES[0],
      status: 'tbd' as const,
      windowStart: 'not-a-date',
      windowEnd: null,
    };

    const calendar = generateICS(launch);

    expect(calendar).toContain('DTSTART:20350728T143000Z');
    expect(calendar).toContain('DTEND:20350728T163000Z');
    expect(calendar).toContain('STATUS:TENTATIVE');
    expect(calendar).not.toContain('Launch Window:');
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
      'Rocket: R\\\\1\\nLaunch Site: Pad\\, 1 · Cape Canaveral\\nFirst\\nSecond\\nThird\\nFourth\\; phase',
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

  it('adds provider facility context to an ambiguous launch pad', () => {
    const launch = {
      ...UPCOMING_LAUNCHES[0],
      launchSite: '201',
      location: {
        lat: 19.618452,
        lng: 110.955356,
        name: "Wenchang Space Launch Site, People's Republic of China",
        countryCode: 'CN',
      },
    };
    const calendar = generateICS(launch).replace(/\r\n /g, '');
    const googleUrl = new URL(getGoogleCalendarUrl(launch));

    expect(calendar).toContain(
      'LOCATION:201 · Wenchang Space Launch Site\\, China'
    );
    expect(googleUrl.searchParams.get('location')).toBe(
      '201 · Wenchang Space Launch Site, China'
    );
  });

  it('copies explicitly labeled UTC target and window times', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    await expect(copyToClipboard(UPCOMING_LAUNCHES[0])).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining('📅 Target: Jul 28, 2035, 14:30 UTC')
    );
    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining(
        '🛰️ Window: Jul 28, 2035, 14:30–16:30 UTC'
      )
    );
  });
});
