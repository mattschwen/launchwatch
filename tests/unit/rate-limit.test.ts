import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  checkRequestRateLimit,
  rateLimitHeaders,
} from '@/lib/rate-limit';

const WINDOW_MS = 60_000;

function headersFor(ip: string): Headers {
  return new Headers({ 'x-forwarded-for': `${ip}, 10.0.0.1` });
}

describe('request rate limiting', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2035-07-26T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows the client quota, denies the next request, and emits retry headers', () => {
    const options = {
      namespace: 'test-client-quota',
      limit: 2,
      windowMs: WINDOW_MS,
      globalLimit: 100,
    };

    const first = checkRequestRateLimit(headersFor('203.0.113.1'), options);
    const second = checkRequestRateLimit(headersFor('203.0.113.1'), options);
    const denied = checkRequestRateLimit(headersFor('203.0.113.1'), options);
    const responseHeaders = new Headers(rateLimitHeaders(denied));

    expect(first).toMatchObject({ allowed: true, remaining: 1 });
    expect(second).toMatchObject({ allowed: true, remaining: 0 });
    expect(denied).toMatchObject({
      allowed: false,
      limit: 2,
      remaining: 0,
      retryAfterSeconds: 60,
    });
    expect(responseHeaders.get('RateLimit-Limit')).toBe('2');
    expect(responseHeaders.get('RateLimit-Remaining')).toBe('0');
    expect(responseHeaders.get('Retry-After')).toBe('60');

    vi.advanceTimersByTime(WINDOW_MS);

    expect(
      checkRequestRateLimit(headersFor('203.0.113.1'), options),
    ).toMatchObject({ allowed: true, remaining: 1 });
  });

  it('does not charge client-blocked requests against the global quota', () => {
    const options = {
      namespace: 'test-client-global-isolation',
      limit: 2,
      windowMs: WINDOW_MS,
      globalLimit: 4,
    };
    const firstClient = headersFor('203.0.113.10');
    const secondClient = headersFor('203.0.113.20');

    expect(checkRequestRateLimit(firstClient, options).allowed).toBe(true);
    expect(checkRequestRateLimit(firstClient, options).allowed).toBe(true);

    for (let request = 0; request < 10; request += 1) {
      expect(checkRequestRateLimit(firstClient, options).allowed).toBe(false);
    }

    expect(checkRequestRateLimit(secondClient, options).allowed).toBe(true);
    expect(checkRequestRateLimit(secondClient, options).allowed).toBe(true);
    expect(
      checkRequestRateLimit(headersFor('203.0.113.30'), options).allowed,
    ).toBe(false);
  });
});
