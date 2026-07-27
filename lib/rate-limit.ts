interface RateLimitBucket {
  count: number;
  resetAt: number;
}

interface RateLimitStore {
  buckets: Map<string, RateLimitBucket>;
  checks: number;
}

interface RateLimitOptions {
  namespace: string;
  limit: number;
  windowMs: number;
  globalLimit: number;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
}

const MAX_BUCKETS = 5_000;
const globalWithRateLimit = globalThis as typeof globalThis & {
  __launchWatchRateLimitStore?: RateLimitStore;
};

const store = globalWithRateLimit.__launchWatchRateLimitStore ?? {
  buckets: new Map<string, RateLimitBucket>(),
  checks: 0,
};

globalWithRateLimit.__launchWatchRateLimitStore = store;

function requestIdentity(headers: Headers): string {
  const forwardedFor = headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return (
    headers.get('x-vercel-forwarded-for')?.trim() ||
    forwardedFor ||
    headers.get('x-real-ip')?.trim() ||
    'anonymous'
  ).slice(0, 96);
}

function pruneExpiredBuckets(now: number): void {
  store.checks += 1;
  if (store.checks % 100 !== 0 && store.buckets.size < MAX_BUCKETS) return;

  for (const [key, bucket] of store.buckets) {
    if (bucket.resetAt <= now) {
      store.buckets.delete(key);
    }
  }

  if (store.buckets.size <= MAX_BUCKETS) return;
  const overflow = store.buckets.size - MAX_BUCKETS;
  const oldest = [...store.buckets.entries()]
    .sort((left, right) => left[1].resetAt - right[1].resetAt)
    .slice(0, overflow);
  oldest.forEach(([key]) => store.buckets.delete(key));
}

function consumeBucket(
  key: string,
  windowMs: number,
  now: number,
): RateLimitBucket {
  const current = store.buckets.get(key);
  if (!current || current.resetAt <= now) {
    const bucket = { count: 1, resetAt: now + windowMs };
    store.buckets.set(key, bucket);
    return bucket;
  }

  current.count += 1;
  return current;
}

export function checkRequestRateLimit(
  headers: Headers,
  options: RateLimitOptions,
): RateLimitResult {
  const now = Date.now();
  pruneExpiredBuckets(now);

  const identity = requestIdentity(headers);
  const clientBucket = consumeBucket(
    `${options.namespace}:client:${identity}`,
    options.windowMs,
    now,
  );
  if (clientBucket.count > options.limit) {
    return {
      allowed: false,
      limit: options.limit,
      remaining: 0,
      resetAt: clientBucket.resetAt,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((clientBucket.resetAt - now) / 1_000),
      ),
    };
  }

  const globalBucket = consumeBucket(
    `${options.namespace}:global`,
    options.windowMs,
    now,
  );
  const allowed = globalBucket.count <= options.globalLimit;
  const resetAt = Math.max(clientBucket.resetAt, globalBucket.resetAt);

  return {
    allowed,
    limit: options.limit,
    remaining: Math.max(
      0,
      Math.min(
        options.limit - clientBucket.count,
        options.globalLimit - globalBucket.count,
      ),
    ),
    resetAt,
    retryAfterSeconds: Math.max(1, Math.ceil((resetAt - now) / 1_000)),
  };
}

export function rateLimitHeaders(result: RateLimitResult): HeadersInit {
  return {
    'RateLimit-Limit': String(result.limit),
    'RateLimit-Remaining': String(result.remaining),
    'RateLimit-Reset': String(Math.ceil(result.resetAt / 1_000)),
    ...(result.allowed
      ? {}
      : { 'Retry-After': String(result.retryAfterSeconds) }),
  };
}
