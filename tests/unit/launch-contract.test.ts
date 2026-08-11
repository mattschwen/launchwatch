import { describe, expect, it } from 'vitest';
import {
  isLaunch,
  isLaunchCollection,
  isLaunchIntel,
} from '@/lib/launch-contract';
import {
  LAUNCH_INTEL,
  UPCOMING_LAUNCHES,
} from '@/tests/fixtures/launches';

describe('client launch contract', () => {
  it('accepts a normalized launch with canonical provider identity', () => {
    expect(isLaunch(UPCOMING_LAUNCHES[0])).toBe(true);
    expect(
      isLaunch({
        ...UPCOMING_LAUNCHES[0],
        livestream: 'https://x.com/i/broadcasts/orbital-dawn',
        livestreams: [
          {
            url: 'https://x.com/i/broadcasts/orbital-dawn',
            title: 'Orbital Dawn official coverage',
          },
        ],
      }),
    ).toBe(true);
  });

  it.each([
    {
      label: 'unqualified ID',
      launch: { ...UPCOMING_LAUNCHES[0], id: 'demo-orbital-dawn' },
    },
    {
      label: 'legacy ID',
      launch: { ...UPCOMING_LAUNCHES[0], id: 'past-demo-orbital-dawn' },
    },
    {
      label: 'source-mismatched ID',
      launch: { ...UPCOMING_LAUNCHES[0], source: 'spacex' },
    },
    {
      label: 'source-mismatched native ID',
      launch: { ...UPCOMING_LAUNCHES[0], sourceId: 'another-mission' },
    },
  ])('rejects a launch with $label', ({ launch }) => {
    expect(isLaunch(launch)).toBe(false);
  });

  it.each([
    {
      label: 'executable primary coverage',
      launch: {
        ...UPCOMING_LAUNCHES[0],
        livestream: 'javascript:alert(document.domain)',
      },
    },
    {
      label: 'credential-bearing primary coverage',
      launch: {
        ...UPCOMING_LAUNCHES[0],
        livestream: 'https://viewer:secret@example.test/coverage',
      },
    },
    {
      label: 'insecure ranked coverage',
      launch: {
        ...UPCOMING_LAUNCHES[0],
        livestream: null,
        livestreams: [
          {
            url: 'http://example.test/coverage',
            title: 'Unsafe provider coverage',
          },
        ],
      },
    },
  ])('rejects a launch with $label', ({ launch }) => {
    expect(isLaunch(launch)).toBe(false);
  });

  it('requires every collection to contain unique canonical launch IDs', () => {
    expect(isLaunchCollection(UPCOMING_LAUNCHES)).toBe(true);
    expect(
      isLaunchCollection([
        UPCOMING_LAUNCHES[0],
        { ...UPCOMING_LAUNCHES[0], name: 'Conflicting duplicate mission' },
      ])
    ).toBe(false);
  });

  it('accepts mission intelligence with credential-free HTTPS destinations', () => {
    expect(isLaunchIntel(LAUNCH_INTEL)).toBe(true);
  });

  it.each([
    {
      label: 'executable recommended action',
      intel: {
        ...LAUNCH_INTEL,
        summary: {
          ...LAUNCH_INTEL.summary,
          recommendedUrl: 'javascript:alert(document.domain)',
        },
      },
    },
    {
      label: 'credential-bearing stream',
      intel: {
        ...LAUNCH_INTEL,
        streamCandidates: [
          {
            id: 'unsafe-stream',
            title: 'Unsafe stream',
            url: 'https://user:secret@example.test/coverage',
            channelTitle: 'Fixture channel',
            source: 'provided',
            confidence: 'high',
            liveStatus: 'live',
          },
        ],
      },
    },
    {
      label: 'insecure news item',
      intel: {
        ...LAUNCH_INTEL,
        newsItems: [
          {
            id: 'unsafe-news',
            title: 'Unsafe news',
            url: 'http://example.test/mission',
            source: 'Fixture news',
            publishedAt: '2035-07-26T12:00:00.000Z',
          },
        ],
      },
    },
    {
      label: 'executable social item',
      intel: {
        ...LAUNCH_INTEL,
        socialItems: [
          {
            id: 'unsafe-social',
            platform: 'x',
            title: 'Unsafe social signal',
            url: 'data:text/html,unsafe',
          },
        ],
      },
    },
    {
      label: 'insecure search fallback',
      intel: {
        ...LAUNCH_INTEL,
        quickLinks: {
          ...LAUNCH_INTEL.quickLinks,
          redditSearch: 'http://example.test/search',
        },
      },
    },
  ])('rejects mission intelligence with $label', ({ intel }) => {
    expect(isLaunchIntel(intel)).toBe(false);
  });
});
