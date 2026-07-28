import { describe, expect, it } from 'vitest';
import { UPCOMING_LAUNCHES } from '../fixtures/launches';
import {
  buildSearchQuery,
  generateYouTubeSearchUrl,
} from '@/lib/youtube';

describe('YouTube fallback search', () => {
  it('uses the mission segment and omits the generic provider placeholder', () => {
    const launch = {
      ...UPCOMING_LAUNCHES[0],
      name: 'Long March 7A | Unknown Payload',
      rocket: 'Long March 7A',
      provider: 'China Aerospace Science and Technology Corporation',
    };

    expect(buildSearchQuery(launch)).toBe(
      'Long March 7A Unknown Payload launch livestream'
    );

    const searchUrl = new URL(generateYouTubeSearchUrl(launch));
    expect(searchUrl.hostname).toBe('www.youtube.com');
    expect(searchUrl.pathname).toBe('/results');
    expect(searchUrl.searchParams.get('search_query')).toBe(
      'Long March 7A Unknown Payload launch livestream'
    );
  });

  it('keeps a recognized provider while avoiding duplicate mission terms', () => {
    const launch = {
      ...UPCOMING_LAUNCHES[1],
      name: 'Falcon 9 | Polaris Relay',
      rocket: 'Falcon 9',
      provider: 'SpaceX',
    };

    expect(buildSearchQuery(launch)).toBe(
      'SpaceX Falcon 9 Polaris Relay launch livestream'
    );
  });
});
