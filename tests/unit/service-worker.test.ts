import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

type WorkerHandler = (event: Record<string, unknown>) => void;

interface WorkerHarness {
  handlers: Map<string, WorkerHandler>;
  cache: {
    addAll: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    keys: ReturnType<typeof vi.fn>;
    match: ReturnType<typeof vi.fn>;
    put: ReturnType<typeof vi.fn>;
  };
  caches: {
    delete: ReturnType<typeof vi.fn>;
    keys: ReturnType<typeof vi.fn>;
    match: ReturnType<typeof vi.fn>;
    open: ReturnType<typeof vi.fn>;
  };
  fetchMock: ReturnType<typeof vi.fn>;
  self: {
    clients: {
      claim: ReturnType<typeof vi.fn>;
      matchAll: ReturnType<typeof vi.fn>;
      openWindow: ReturnType<typeof vi.fn>;
    };
    skipWaiting: ReturnType<typeof vi.fn>;
  };
}

function createHarness(): WorkerHarness {
  const handlers = new Map<string, WorkerHandler>();
  const cache = {
    addAll: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(true),
    keys: vi.fn().mockResolvedValue([]),
    match: vi.fn().mockResolvedValue(undefined),
    put: vi.fn().mockResolvedValue(undefined),
  };
  const caches = {
    delete: vi.fn().mockResolvedValue(true),
    keys: vi.fn().mockResolvedValue([]),
    match: vi.fn().mockResolvedValue(undefined),
    open: vi.fn().mockResolvedValue(cache),
  };
  const fetchMock = vi.fn();
  const self = {
    location: { origin: 'https://launchwatch.test' },
    addEventListener: vi.fn(
      (type: string, handler: WorkerHandler) => handlers.set(type, handler)
    ),
    skipWaiting: vi.fn(),
    clients: {
      claim: vi.fn().mockResolvedValue(undefined),
      matchAll: vi.fn().mockResolvedValue([]),
      openWindow: vi.fn().mockResolvedValue(undefined),
    },
    registration: {
      showNotification: vi.fn().mockResolvedValue(undefined),
    },
  };
  const source = readFileSync(
    resolve(process.cwd(), 'public', 'sw.js'),
    'utf8'
  );

  runInNewContext(source, {
    URL,
    Headers,
    Promise,
    Response,
    Set,
    caches,
    fetch: fetchMock,
    self,
  });

  return { handlers, cache, caches, fetchMock, self };
}

function request(
  path: string,
  overrides: Partial<{
    headers: Headers;
    method: string;
    mode: string;
  }> = {}
): {
  headers: Headers;
  method: string;
  mode: string;
  url: string;
} {
  return {
    method: 'GET',
    mode: 'cors',
    headers: new Headers(),
    url: `https://launchwatch.test${path}`,
    ...overrides,
  };
}

async function clickNotification(
  harness: WorkerHarness,
  url: string
): Promise<void> {
  let navigation: Promise<unknown> | undefined;

  harness.handlers.get('notificationclick')?.({
    action: 'view',
    notification: {
      close: vi.fn(),
      data: { url },
    },
    waitUntil: (value: Promise<unknown>) => {
      navigation = value;
    },
  });
  await navigation;
}

describe('service worker lifecycle', () => {
  it('pre-caches only the explicit offline shell and install icons', async () => {
    const { handlers, cache, caches } = createHarness();
    let installation: Promise<unknown> | undefined;

    handlers.get('install')?.({
      waitUntil: (value: Promise<unknown>) => {
        installation = value;
      },
    });
    await installation;

    expect(caches.open).toHaveBeenCalledWith('launchwatch-shell-v7');
    expect(cache.addAll).toHaveBeenCalledWith([
      '/offline.html',
      '/icon-192.png',
      '/icon-512.png',
      '/apple-touch-icon.png',
      '/badge-96.png',
    ]);
  });

  it('removes older LaunchWatch caches, claims clients, and supports skip waiting', async () => {
    const { handlers, caches, self } = createHarness();
    caches.keys.mockResolvedValue([
      'launchwatch-shell-v4',
      'launchwatch-static-v7',
      'other-app-cache',
    ]);
    let activation: Promise<unknown> | undefined;

    handlers.get('activate')?.({
      waitUntil: (value: Promise<unknown>) => {
        activation = value;
      },
    });
    await activation;

    expect(caches.delete).toHaveBeenCalledTimes(1);
    expect(caches.delete).toHaveBeenCalledWith('launchwatch-shell-v4');
    expect(caches.delete).not.toHaveBeenCalledWith('other-app-cache');
    expect(self.clients.claim).toHaveBeenCalledOnce();

    handlers.get('message')?.({ data: { type: 'SKIP_WAITING' } });
    expect(self.skipWaiting).toHaveBeenCalledOnce();
  });
});

describe('service worker request policy', () => {
  it.each([
    ['/api/launches?type=all', {}],
    ['/?_rsc=fixture', {}],
    ['/watch?mission=fixture', {}],
    ['/_next/static/chunks/app-abc123.js?tracking=fixture', {}],
    ['/_next/static/chunks/app-abc123.js?dpl=deploy-1&tracking=fixture', {}],
    ['/_next/static/chunks/app-abc123.js?dpl=', {}],
    ['/_next/data', { headers: new Headers({ RSC: '1' }) }],
  ])('leaves fresh data request %s to the network', (path, overrides) => {
    const { handlers } = createHarness();
    const respondWith = vi.fn();

    handlers.get('fetch')?.({
      request: request(path, overrides),
      respondWith,
    });

    expect(respondWith).not.toHaveBeenCalled();
  });

  it('falls back to the offline document for a failed navigation', async () => {
    const { handlers, caches, fetchMock } = createHarness();
    const offlineResponse = new Response('<h1>Offline</h1>', { status: 200 });
    fetchMock.mockRejectedValue(new TypeError('offline'));
    caches.match.mockResolvedValue(offlineResponse);
    let response: Promise<Response> | undefined;

    handlers.get('fetch')?.({
      request: request('/history', { mode: 'navigate' }),
      respondWith: (value: Promise<Response>) => {
        response = value;
      },
    });

    await expect(response).resolves.toBe(offlineResponse);
    expect(caches.match).toHaveBeenCalledWith('/offline.html', {
      cacheName: 'launchwatch-shell-v7',
    });
  });

  it.each([
    '/_next/static/chunks/app-abc123.js',
    '/_next/static/chunks/app-abc123.js?dpl=deploy-1',
  ])('serves immutable Next asset %s from the bounded static cache', async (path) => {
    const { handlers, cache, fetchMock } = createHarness();
    const cachedResponse = new Response('compiled');
    cache.match.mockResolvedValue(cachedResponse);
    let response: Promise<Response> | undefined;

    handlers.get('fetch')?.({
      request: request(path),
      respondWith: (value: Promise<Response>) => {
        response = value;
      },
    });

    await expect(response).resolves.toBe(cachedResponse);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('service worker notification navigation', () => {
  it('focuses an already-open notification destination', async () => {
    const harness = createHarness();
    const { self } = harness;
    const focus = vi.fn().mockResolvedValue(undefined);
    self.clients.matchAll.mockResolvedValue([
      { url: 'https://launchwatch.test/launch/ll2-demo', focus },
    ]);

    await clickNotification(harness, '/launch/ll2-demo');

    expect(focus).toHaveBeenCalledOnce();
    expect(self.clients.openWindow).not.toHaveBeenCalled();
  });

  it('reuses an existing LaunchWatch window for a different mission route', async () => {
    const harness = createHarness();
    const { self } = harness;
    const focus = vi.fn().mockResolvedValue(undefined);
    const destinationClient = { focus };
    const navigate = vi.fn().mockResolvedValue(destinationClient);
    self.clients.matchAll.mockResolvedValue([
      {
        url: 'https://launchwatch.test/history',
        focus: vi.fn(),
        navigate,
      },
    ]);

    await clickNotification(harness, '/launch/ll2-demo');

    expect(navigate).toHaveBeenCalledWith(
      'https://launchwatch.test/launch/ll2-demo'
    );
    expect(focus).toHaveBeenCalledOnce();
    expect(self.clients.openWindow).not.toHaveBeenCalled();
  });

  it('opens a new window when no existing LaunchWatch client can be reused', async () => {
    const harness = createHarness();
    const { self } = harness;
    self.clients.matchAll.mockResolvedValue([]);

    await clickNotification(harness, '/launch/ll2-demo');

    expect(self.clients.openWindow).toHaveBeenCalledWith(
      'https://launchwatch.test/launch/ll2-demo'
    );
  });

  it('falls back to a new window when an existing client disappears', async () => {
    const harness = createHarness();
    const { self } = harness;
    self.clients.matchAll.mockResolvedValue([
      {
        url: 'https://launchwatch.test/watch',
        focus: vi.fn(),
        navigate: vi.fn().mockRejectedValue(new Error('client closed')),
      },
    ]);

    await clickNotification(harness, '/launch/ll2-demo');

    expect(self.clients.openWindow).toHaveBeenCalledWith(
      'https://launchwatch.test/launch/ll2-demo'
    );
  });
});
