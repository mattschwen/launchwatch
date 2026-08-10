import { describe, expect, it } from 'vitest';
import { getLaunchDetailQueryError } from '@/lib/launch-detail-params';

describe('launch detail query contract', () => {
  it('accepts the canonical detail URL without a query', () => {
    expect(getLaunchDetailQueryError(new URLSearchParams())).toBeNull();
  });

  it.each([
    'view=compact',
    'utm_source=cache-fragment',
    'view=one&view=two',
    '=empty-key',
  ])('rejects cache-fragmenting query variant %s', (query) => {
    expect(getLaunchDetailQueryError(new URLSearchParams(query))).toBe(
      'Launch detail does not accept query parameters',
    );
  });
});
