import { describe, expect, it } from 'vitest';

import {
  buildXaiSpaceXRequest,
  getXaiDailyLookupBudget,
  parseXaiSpaceXResponse,
  shouldUseXaiSpaceXSearch,
} from '@/lib/xai-launch-intel';
import type { Launch } from '@/lib/types';
import { UPCOMING_LAUNCHES } from '@/tests/fixtures/launches';

const SPACEX_LAUNCH: Launch = {
  ...UPCOMING_LAUNCHES[0],
  id: 'spacex-demo-official-update',
  sourceId: 'demo-official-update',
  source: 'spacex',
  provider: 'SpaceX',
  name: 'Falcon 9 Block 5 | Polaris Relay',
  missionName: 'Polaris Relay',
  rocket: 'Falcon 9 Block 5',
  date: '2035-07-27T12:00:00.000Z',
  dateUnix: 2069150400,
};
const OFFICIAL_POST_TIME = '2035-07-26T10:00:00.000Z';
const OFFICIAL_POST_ID = (
  (BigInt(Date.parse(OFFICIAL_POST_TIME)) - BigInt('1288834974657')) <<
  BigInt(22)
).toString();

function xaiResponse(posts: unknown): unknown {
  return {
    output: [
      {
        type: 'message',
        content: [
          {
            type: 'output_text',
            text: JSON.stringify({ posts }),
          },
        ],
      },
    ],
  };
}

describe('xAI SpaceX enrichment policy', () => {
  it('only permits a lookup near a SpaceX launch without an official signal', () => {
    const now = new Date('2035-07-26T12:00:00.000Z').getTime();

    expect(shouldUseXaiSpaceXSearch(SPACEX_LAUNCH, false, now)).toBe(true);
    expect(shouldUseXaiSpaceXSearch(SPACEX_LAUNCH, true, now)).toBe(false);
    expect(
      shouldUseXaiSpaceXSearch(
        { ...SPACEX_LAUNCH, source: 'll2', provider: 'Rocket Lab' },
        false,
        now,
      ),
    ).toBe(false);
    expect(
      shouldUseXaiSpaceXSearch(
        { ...SPACEX_LAUNCH, dateUnix: SPACEX_LAUNCH.dateUnix + 7 * 86_400 },
        false,
        now,
      ),
    ).toBe(false);
  });

  it('keeps the configurable daily budget small and bounded', () => {
    expect(getXaiDailyLookupBudget()).toBe(4);
    expect(getXaiDailyLookupBudget('0')).toBe(0);
    expect(getXaiDailyLookupBudget('12')).toBe(12);
    expect(getXaiDailyLookupBudget('200')).toBe(24);
    expect(getXaiDailyLookupBudget('invalid')).toBe(4);
    expect(getXaiDailyLookupBudget('12credits')).toBe(4);
  });

  it('builds one official-account search with hard output and turn caps', () => {
    const request = buildXaiSpaceXRequest(
      SPACEX_LAUNCH,
      new Date('2035-07-26T12:00:00.000Z'),
      'grok-4.3',
    );

    expect(request).toMatchObject({
      model: 'grok-4.3',
      store: false,
      max_turns: 2,
      max_output_tokens: 600,
      parallel_tool_calls: false,
      reasoning: { effort: 'none' },
      tools: [
        {
          type: 'x_search',
          allowed_x_handles: ['SpaceX'],
          from_date: '2035-07-19',
          to_date: '2035-07-26',
        },
      ],
    });
  });

  it('accepts only canonical official SpaceX status URLs', () => {
    expect(
      parseXaiSpaceXResponse(
        SPACEX_LAUNCH,
        xaiResponse([
          {
            title: 'Polaris Relay is targeted to launch on Falcon 9.',
            url: `https://x.com/SpaceX/status/${OFFICIAL_POST_ID}`,
          },
          {
            title: 'Duplicate URL',
            url: `https://twitter.com/SpaceX/status/${OFFICIAL_POST_ID}`,
          },
          {
            title: 'Untrusted result',
            url: 'https://example.com/SpaceX/status/987654321',
          },
        ]),
      ),
    ).toEqual([
      {
        id: OFFICIAL_POST_ID,
        platform: 'x',
        title: 'Polaris Relay is targeted to launch on Falcon 9.',
        url: `https://x.com/SpaceX/status/${OFFICIAL_POST_ID}`,
        publishedAt: OFFICIAL_POST_TIME,
        author: 'SpaceX',
        community: '@SpaceX',
        note: 'Official SpaceX update matched to Polaris Relay.',
      },
    ]);
  });

  it('fails closed for malformed or non-structured responses', () => {
    expect(parseXaiSpaceXResponse(SPACEX_LAUNCH, null)).toEqual([]);
    expect(
      parseXaiSpaceXResponse(SPACEX_LAUNCH, {
        output: [
          {
            type: 'message',
            content: [{ type: 'output_text', text: 'not-json' }],
          },
        ],
      }),
    ).toEqual([]);
  });
});
