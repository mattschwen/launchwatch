import type { Page, Route } from '@playwright/test';
import {
  FEED_META,
  HISTORICAL_LAUNCHES,
  LAUNCH_INTEL,
  UPCOMING_LAUNCHES,
} from '../../fixtures/launches';

function json(route: Route, body: unknown, status = 200): Promise<void> {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

export async function installApiFixtures(page: Page): Promise<void> {
  await page.emulateMedia({ reducedMotion: 'reduce' });

  await page.route('**/api/launches**', async (route) => {
    const url = new URL(route.request().url());

    if (url.pathname === '/api/launches') {
      const type = url.searchParams.get('type') || 'all';
      if (type === 'history') {
        await json(route, {
          launches: HISTORICAL_LAUNCHES,
          meta: FEED_META,
          cached: false,
          source: 'api',
        });
        return;
      }

      const launches =
        type === 'live'
          ? []
          : type === 'next'
            ? undefined
            : UPCOMING_LAUNCHES;

      if (type === 'next') {
        await json(route, {
          launch: UPCOMING_LAUNCHES[0],
          meta: FEED_META,
          cached: false,
          source: 'api',
        });
        return;
      }

      await json(route, {
        launches,
        meta: FEED_META,
        cached: false,
        source: 'api',
      });
      return;
    }

    const encodedId = url.pathname.replace('/api/launches/', '');
    const id = decodeURIComponent(encodedId);
    const launch = [...UPCOMING_LAUNCHES, ...HISTORICAL_LAUNCHES].find(
      (candidate) => candidate.id === id
    );

    if (!launch) {
      await json(route, { error: 'Launch not found' }, 404);
      return;
    }

    const detailedLaunch =
      launch.id === 'll2-demo-orbital-dawn'
        ? {
            ...launch,
            livestream: 'https://x.com/i/broadcasts/demo-orbital-dawn',
            livestreams: [
              {
                url: 'https://x.com/i/broadcasts/demo-orbital-dawn',
                title: 'Orbital Dawn official webcast',
                source: 'x.com',
                type: 'Official Webcast',
                isLive: false,
              },
            ],
          }
        : launch;

    await json(route, {
      launch: detailedLaunch,
      canonicalId: detailedLaunch.id,
      meta: FEED_META,
    });
  });

  await page.route('**/api/launch-intel**', (route) =>
    json(route, LAUNCH_INTEL)
  );
}

export async function expectNoHorizontalOverflow(page: Page): Promise<boolean> {
  return page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth + 1
  );
}
