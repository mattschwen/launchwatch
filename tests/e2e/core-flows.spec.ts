import { expect, test, type Locator, type Route } from '@playwright/test';
import {
  expectNoHorizontalOverflow,
  installApiFixtures,
} from './support/api-fixtures';
import {
  FEED_META,
  HISTORICAL_LAUNCHES,
  LAUNCH_INTEL,
  UPCOMING_LAUNCHES,
} from '../fixtures/launches';

test.beforeEach(async ({ page }) => {
  await installApiFixtures(page);
});

test('first visit confirms synchronization without covering the active route', async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.localStorage.removeItem('launchwatch.boot-sequence.v3');
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.route('**/api/launches?type=all', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        launches: UPCOMING_LAUNCHES,
        meta: { ...FEED_META, partial: true },
      }),
    })
  );
  await page.goto('/');

  const toast = page.getByRole('complementary', { name: 'MISSION CONTROL' });
  await expect(toast).toBeVisible();
  await expect(toast.getByRole('status')).toHaveAccessibleName(
    'Partial provider schedule loaded'
  );
  await expect
    .poll(() =>
      toast.evaluate((element) => {
        const bounds = element.getBoundingClientRect();
        const header = document
          .querySelector<HTMLElement>('header')
          ?.getBoundingClientRect();
        const main = document
          .querySelector<HTMLElement>('#main-content')
          ?.getBoundingClientRect();
        const heading = document
          .querySelector<HTMLElement>('#main-content h1')
          ?.getBoundingClientRect();
        const primaryAction = document
          .querySelector<HTMLElement>('#main-content .action-button-primary')
          ?.getBoundingClientRect();
        const intersects = (target?: DOMRect): boolean =>
          Boolean(
            target &&
              bounds.left < target.right &&
              bounds.right > target.left &&
              bounds.top < target.bottom &&
              bounds.bottom > target.top
          );
        return {
          withinViewport:
            bounds.left >= 0 &&
            bounds.right <= window.innerWidth &&
            bounds.top >= 0 &&
            bounds.bottom <= window.innerHeight,
          containedInHeader: Boolean(
            header &&
              bounds.top >= header.top &&
              bounds.bottom <= header.bottom + 1
          ),
          coversHeading: intersects(heading),
          coversPrimaryAction: intersects(primaryAction),
          coversMainContent: Boolean(main && bounds.bottom > main.top + 1),
        };
      })
    )
    .toEqual({
      withinViewport: true,
      containedInHeader: true,
      coversHeading: false,
      coversPrimaryAction: false,
      coversMainContent: false,
    });
  expect(await expectNoHorizontalOverflow(page)).toBe(true);

  const feedStatusShortcuts = page.locator(
    'header button[aria-label="Partial feed — view provider status"]'
  );
  await expect
    .poll(() =>
      feedStatusShortcuts.evaluateAll((elements) =>
        elements.every(
          (element) => getComputedStyle(element).visibility === 'hidden'
        )
      )
    )
    .toBe(true);
  const dismiss = toast.getByRole('button', {
    name: 'Dismiss system status',
  });
  expect((await dismiss.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  await dismiss.focus();
  await dismiss.press('Enter');
  await expect(toast).toHaveCount(0);
  await expect(page.locator('#main-content')).toBeFocused();
  await expect(
    page.locator(
      'header .header-instruments:visible button[aria-label="Partial feed — view provider status"]'
    )
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Orbital Dawn' })
  ).toBeVisible();
});

test('shared routes publish the branded LaunchWatch social preview', async ({
  page,
}) => {
  await page.goto('/');

  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    'content',
    'Track upcoming launches, official coverage, and mission telemetry from SpaceX and Launch Library 2.'
  );
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
    'content',
    'summary_large_image'
  );

  const openGraphImage = page.locator('meta[property="og:image"]');
  const twitterImage = page.locator('meta[name="twitter:image"]');
  await expect(openGraphImage).toHaveCount(1);
  await expect(twitterImage).toHaveCount(1);
  await expect(openGraphImage).toHaveAttribute(
    'content',
    /\/opengraph-image/
  );
  await expect(twitterImage).toHaveAttribute(
    'content',
    /\/opengraph-image/
  );
  await expect(page.locator('meta[property="og:image:alt"]')).toHaveAttribute(
    'content',
    'LaunchWatch mission control — schedule, coverage, and telemetry'
  );

  const imageUrl = await openGraphImage.getAttribute('content');
  expect(imageUrl).not.toBeNull();
  const imageResponse = await page.request.get(imageUrl!);
  expect(imageResponse.status()).toBe(200);
  expect(imageResponse.headers()['content-type']).toContain('image/png');
  expect((await imageResponse.body()).byteLength).toBeGreaterThan(20_000);
});

test('external actions identify when they open a new tab', async ({ page }) => {
  for (const route of [
    '/',
    '/watch',
    '/history',
    '/launch/ll2-demo-orbital-dawn',
  ]) {
    await page.goto(route);
    await page.waitForLoadState('networkidle');

    const externalLinks = page.locator('a[target="_blank"]');
    await expect(externalLinks.first()).toBeVisible();
    await expect
      .poll(() =>
        externalLinks.evaluateAll(
          (links) =>
            links.length > 0 &&
            links.every((link) =>
              `${link.getAttribute('aria-label') || ''} ${
                link.textContent || ''
              }`
                .toLocaleLowerCase()
                .includes('new tab')
            )
        )
      )
      .toBe(true);
  }
});

test('mission details publish a consistent canonical social preview', async ({
  page,
}) => {
  await page.goto('/launch/ll2-demo-orbital-dawn?from=watch');

  const canonicalUrl =
    'https://www.launchwatch.io/launch/ll2-demo-orbital-dawn';
  const description = await page
    .locator('meta[name="description"]')
    .getAttribute('content');
  expect(description).toBe(
    'A communications payload mission opening a new low-Earth-orbit relay corridor. Mission objectives: • Deploy the relay payload • Validate the communications link'
  );

  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    canonicalUrl
  );
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
    'content',
    canonicalUrl
  );
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
    'content',
    'Orbital Dawn'
  );
  await expect(
    page.locator('meta[property="og:description"]')
  ).toHaveAttribute('content', description!);
  await expect(page.locator('meta[name="twitter:title"]')).toHaveAttribute(
    'content',
    'Orbital Dawn'
  );
  await expect(
    page.locator('meta[name="twitter:description"]')
  ).toHaveAttribute('content', description!);
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
    'content',
    'summary_large_image'
  );
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    'content',
    /\/icon-512\.png$/
  );
  await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute(
    'content',
    /\/icon-512\.png$/
  );
});

test('primary mission headings remove a redundant provider vehicle prefix', async ({
  page,
}) => {
  const browserErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') browserErrors.push(message.text());
  });
  page.on('pageerror', (error) => browserErrors.push(error.message));
  const providerName =
    'Falcon Heavy | Nancy Grace Roman Space Telescope';
  const missionName = 'Nancy Grace Roman Space Telescope';
  const prefixedLaunch = {
    ...UPCOMING_LAUNCHES[0],
    name: providerName,
    missionName,
    rocket: 'Falcon Heavy',
  };

  await page.route('**/api/launches**', async (route) => {
    const url = new URL(route.request().url());
    const launch = url.pathname === '/api/launches'
      ? null
      : prefixedLaunch;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(
        launch
          ? { launch, canonicalId: launch.id, meta: FEED_META }
          : { launches: [prefixedLaunch], meta: FEED_META }
      ),
    });
  });

  await page.goto('/');
  await expect(
    page.getByRole('heading', { level: 1, name: missionName })
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { level: 3, name: providerName })
  ).toBeVisible();
  const homeMissionLink = page.getByRole('link', { name: missionName }).first();
  await homeMissionLink.focus();
  await expect(homeMissionLink).toBeFocused();
  expect((await homeMissionLink.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  expect(await expectNoHorizontalOverflow(page)).toBe(true);

  await page.goto(`/watch?id=${encodeURIComponent(prefixedLaunch.id)}`);
  const watchHeading = page.getByRole('heading', {
    level: 2,
    name: missionName,
  });
  await expect(watchHeading).toBeVisible();
  const watchMissionLink = watchHeading.locator('..');
  await watchMissionLink.focus();
  await expect(watchMissionLink).toBeFocused();
  await expect(page.getByText(/^Falcon Heavy ·/)).toBeVisible();
  expect(await expectNoHorizontalOverflow(page)).toBe(true);

  await page.goto('/launch/ll2-demo-prefixed-mission');
  await expect(
    page.getByRole('heading', { level: 1, name: missionName })
  ).toBeVisible();
  await expect(page).toHaveTitle(`${providerName} | LaunchWatch`);
  await expect(
    page.getByText('Falcon Heavy', { exact: true }).first()
  ).toBeVisible();
  const returnLink = page.getByRole('link', { name: 'Back to launches' });
  await returnLink.focus();
  await expect(returnLink).toBeFocused();
  expect(await expectNoHorizontalOverflow(page)).toBe(true);
  expect(browserErrors).toEqual([]);
});

test('prelaunch coverage stays distinct from mission flight state', async ({
  page,
}) => {
  const coverageLaunch = {
    ...UPCOMING_LAUNCHES[0],
    status: 'live' as const,
    statusName: 'Go for Launch',
    isLive: true,
    webcastLive: true,
    livestream: 'https://x.com/i/broadcasts/coverage-live',
    livestreams: [
      {
        url: 'https://x.com/i/broadcasts/coverage-live',
        title: 'Official prelaunch coverage',
        isLive: true,
      },
    ],
  };
  await page.route('**/api/launches?type=all', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ launches: [coverageLaunch], meta: FEED_META }),
    })
  );
  await page.route(
    '**/api/launches/ll2-demo-orbital-dawn',
    (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          launch: coverageLaunch,
          canonicalId: coverageLaunch.id,
          meta: FEED_META,
        }),
      })
  );

  await page.goto('/');

  const hero = page.locator(
    'section[aria-labelledby="featured-launch-title"]'
  );
  await expect(hero.getByText('Coverage live').first()).toBeVisible();
  await expect(hero.getByText('LIVE NOW')).toHaveCount(0);
  await expect(hero.locator('time')).toBeVisible();
  await expect(
    page.locator('section[aria-labelledby="upcoming-launches-title"]')
      .getByText('Coverage live')
  ).toBeVisible();

  await page.goto('/watch');

  await expect(page.getByText('1 live broadcast')).toBeVisible();
  await expect(page.getByText('COVERAGE LIVE', { exact: true })).toBeVisible();
  await expect(page.getByText('1 mission live')).toHaveCount(0);
  expect(await expectNoHorizontalOverflow(page)).toBe(true);
});

test('launch feed rejects cache-fragmenting query variants', async ({
  request,
}) => {
  const cases = [
    {
      query: 'type=all&tracking=campaign',
      error: 'Only type and the history limit parameters are accepted',
    },
    {
      query: 'type=all&type=history',
      error: 'Only one type parameter is accepted',
    },
    {
      query: 'type=all&limit=20',
      error: 'The limit parameter is only available for history',
    },
  ];

  for (const testCase of cases) {
    const response = await request.get(`/api/launches?${testCase.query}`);

    expect(response.status()).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: testCase.error,
    });
  }
});

test('watch prefers official provider coverage over an earlier restream', async ({
  page,
}) => {
  await page.unroute('**/api/launches**');
  await page.goto('/watch?id=ll2-demo-ranked-coverage');

  await expect(
    page.getByRole('heading', { level: 2, name: 'Orbital Dawn' })
  ).toBeVisible();
  await expect(page).toHaveTitle('Orbital Dawn | Watch | LaunchWatch');
  const primaryCoverage = page.getByRole('link', {
    name: /Open provider stream.*new tab/i,
  });
  await expect(primaryCoverage).toHaveAttribute(
    'href',
    'https://x.com/i/broadcasts/official-orbital-dawn'
  );
  await primaryCoverage.focus();
  await expect(primaryCoverage).toBeFocused();
  const primaryBounds = await primaryCoverage.boundingBox();
  expect(primaryBounds?.height).toBeGreaterThanOrEqual(44);
  expect(
    page.locator(
      'a[href="https://www.youtube.com/watch?v=community-orbital-dawn"]'
    )
  ).toHaveCount(0);
  expect(await expectNoHorizontalOverflow(page)).toBe(true);
});

test('watch degrades unsafe provider coverage to a safe stream search', async ({
  page,
}) => {
  await page.unroute('**/api/launches**');
  await page.goto('/watch?id=ll2-demo-unsafe-coverage');

  await expect(
    page.getByRole('heading', { level: 2, name: 'Unsafe Coverage Fixture' })
  ).toBeVisible();
  const fallback = page.getByRole('link', { name: /Search for stream.*new tab/i });
  await expect(fallback).toHaveAttribute(
    'href',
    /https:\/\/www\.youtube\.com\/results\?search_query=/
  );
  await fallback.focus();
  await expect(fallback).toBeFocused();
  expect((await fallback.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  await expect(page.locator('a[href^="javascript:"]')).toHaveCount(0);
  await expect(page.locator('a[href*="viewer:secret"]')).toHaveCount(0);
  expect(await expectNoHorizontalOverflow(page)).toBe(true);
});

test('keyboard skip link is visible, touch-safe, and clears the sticky header', async ({
  page,
}) => {
  await page.goto('/');

  await page.keyboard.press('Tab');
  const skipLink = page.getByRole('link', { name: 'Skip to main content' });
  await expect(skipLink).toBeFocused();
  await expect(skipLink).toBeVisible();
  await expect(skipLink).toBeInViewport();

  const skipLinkBounds = await skipLink.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    return {
      bottom: bounds.bottom,
      height: bounds.height,
      left: bounds.left,
      right: bounds.right,
      top: bounds.top,
      width: bounds.width,
    };
  });
  expect(skipLinkBounds.height).toBeGreaterThanOrEqual(44);
  expect(skipLinkBounds.width).toBeGreaterThanOrEqual(44);
  expect(skipLinkBounds.top).toBeGreaterThanOrEqual(0);
  expect(skipLinkBounds.left).toBeGreaterThanOrEqual(0);
  expect(skipLinkBounds.right).toBeLessThanOrEqual(
    page.viewportSize()?.width ?? 0
  );
  expect(skipLinkBounds.bottom).toBeLessThanOrEqual(
    page.viewportSize()?.height ?? 0
  );

  await skipLink.press('Enter');
  const main = page.locator('#main-content');
  await expect(main).toBeFocused();

  const landing = await main.evaluate((element) => {
    const mainBounds = element.getBoundingClientRect();
    const headerBounds = document
      .querySelector('header')
      ?.getBoundingClientRect();
    return {
      headerBottom: headerBounds?.bottom ?? 0,
      mainTop: mainBounds.top,
    };
  });
  expect(landing.mainTop).toBeGreaterThanOrEqual(landing.headerBottom - 1);
  expect(await expectNoHorizontalOverflow(page)).toBe(true);
});

test('persistent bottom chrome keeps focused mission rows visible', async ({
  page,
}) => {
  const bottomChrome = test.info().project.name.startsWith('mobile')
    ? page.locator('nav[aria-label="Primary navigation"]:visible')
    : page.getByRole('complementary', { name: 'Mission status' });
  const expectFocusAboveChrome = async (target: Locator): Promise<void> => {
    await target.evaluate((element) => {
      if (!(element instanceof HTMLElement)) return;
      element.focus({ preventScroll: true });
      element.scrollIntoView({ block: 'nearest' });
    });
    await expect(target).toBeFocused();
    const [targetBox, chromeBox] = await Promise.all([
      target.boundingBox(),
      bottomChrome.boundingBox(),
    ]);

    expect(targetBox).not.toBeNull();
    expect(chromeBox).not.toBeNull();
    expect(targetBox!.y + targetBox!.height + 5).toBeLessThanOrEqual(
      chromeBox!.y
    );
  };

  await page.goto('/');
  await expectFocusAboveChrome(
    page.getByRole('link', { name: /Polaris Relay/ })
  );

  await page.goto('/history');
  await expectFocusAboveChrome(
    page.getByRole('button', { name: /Pathfinder Qualification/ })
  );
  expect(await expectNoHorizontalOverflow(page)).toBe(true);
});

test('route content hands off directly to the protected footer', async ({
  page,
}) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Orbital Dawn' }),
  ).toBeVisible();

  const shellSpacing = await page.evaluate(() => {
    const main = document.querySelector('main');
    const route = main?.lastElementChild;
    const footer = document.querySelector('footer');
    const mobileNav = document.querySelector<HTMLElement>(
      'nav[aria-label="Primary navigation"].fixed',
    );
    const mainStyle = main ? getComputedStyle(main) : null;
    const footerStyle = footer ? getComputedStyle(footer) : null;

    return {
      routeGap:
        main && route
          ? main.getBoundingClientRect().bottom -
            route.getBoundingClientRect().bottom
          : null,
      mainPaddingBottom: mainStyle?.paddingBottom ?? null,
      footerPaddingBottom: footerStyle?.paddingBottom ?? null,
      mobileNavHeight: mobileNav?.getBoundingClientRect().height ?? 0,
    };
  });

  expect(shellSpacing.routeGap).not.toBeNull();
  expect(shellSpacing.routeGap!).toBeLessThanOrEqual(1);
  expect(shellSpacing.mainPaddingBottom).toBe('0px');

  if ((page.viewportSize()?.width ?? 0) < 768) {
    expect(
      Number.parseFloat(shellSpacing.footerPaddingBottom!),
    ).toBeGreaterThanOrEqual(shellSpacing.mobileNavHeight - 1);

    const sourceLink = page.getByRole('link', { name: /^Source.*new tab/i });
    await sourceLink.focus();
    await expect(sourceLink).toBeFocused();
    await expect
      .poll(async () =>
        sourceLink.evaluate((element) => {
          const mobileNav = document.querySelector<HTMLElement>(
            'nav[aria-label="Primary navigation"].fixed',
          );
          return mobileNav
            ? element.getBoundingClientRect().bottom <=
                mobileNav.getBoundingClientRect().top
            : false;
        }),
      )
      .toBe(true);
  }
});

test('short landscape keeps mission telemetry clear of duplicate bottom chrome', async ({
  page,
}) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto('/');

  const hero = page.locator(
    'section[aria-labelledby="featured-launch-title"]'
  );
  await expect(
    hero.getByRole('heading', { level: 1, name: 'Orbital Dawn' })
  ).toBeVisible();
  await expect(
    page.getByRole('complementary', { name: 'Mission status' })
  ).toBeHidden();
  await expect(
    page.locator('header').getByRole('navigation', {
      name: 'Primary navigation',
    })
  ).toBeVisible();

  const constrainedLayout = await page.evaluate(() => ({
    shellPaddingBottom: getComputedStyle(
      document.querySelector<HTMLElement>('.app-shell')!
    ).paddingBottom,
    dateBottom: document
      .querySelector<HTMLElement>(
        'section[aria-labelledby="featured-launch-title"] .compact-hero-telemetry > div:first-child'
      )
      ?.getBoundingClientRect().bottom,
  }));
  expect(constrainedLayout.shellPaddingBottom).toBe('0px');
  expect(constrainedLayout.dateBottom).toBeDefined();
  expect(constrainedLayout.dateBottom!).toBeLessThanOrEqual(390);
  expect(await expectNoHorizontalOverflow(page)).toBe(true);

  await page.setViewportSize({ width: 1180, height: 820 });
  const statusBar = page.getByRole('complementary', {
    name: 'Mission status',
  });
  await expect(statusBar).toBeVisible();
  await expect
    .poll(() =>
      page.locator('.app-shell').evaluate((element) =>
        getComputedStyle(element).paddingBottom
      )
    )
    .toBe('44px');
});

test('tablet watch commands stay clear of redundant bottom status chrome', async ({
  page,
}) => {
  await page.setViewportSize({ width: 844, height: 720 });
  await page.goto('/watch');

  const statusBar = page.getByRole('complementary', {
    name: 'Mission status',
  });
  await expect(statusBar).toBeHidden();
  await expect(
    page.locator('header').getByRole('navigation', {
      name: 'Primary navigation',
    })
  ).toBeVisible();

  const commands = [
    page.getByRole('button', { name: 'Briefing' }),
    page.getByRole('button', { name: 'Calendar' }),
    page.getByRole('button', { name: 'Share' }),
  ];
  const commandBounds = await Promise.all(
    commands.map(async (command) => {
      await expect(command).toBeVisible();
      return command.boundingBox();
    })
  );
  expect(commandBounds.every((bounds) => bounds?.height === 44)).toBe(true);
  await expect
    .poll(() =>
      page.locator('.app-shell').evaluate((element) =>
        getComputedStyle(element).paddingBottom
      )
    )
    .toBe('0px');
  expect(await expectNoHorizontalOverflow(page)).toBe(true);
});

test('brand wordmark stays legible and tappable in the header', async ({ page }) => {
  await page.goto('/');

  const homeLink = page.getByRole('link', { name: 'LaunchWatch home' });
  await expect(homeLink).toBeVisible();
  await expect(homeLink.locator('img')).toHaveCount(0);
  const wordmark = homeLink.locator('span').first();
  await expect(wordmark).toHaveText('LaunchWatch');
  await expect
    .poll(async () => (await homeLink.boundingBox())?.height ?? 0)
    .toBeGreaterThanOrEqual(44);
  await expect
    .poll(() =>
      wordmark.evaluate((element) =>
        Number.parseFloat(getComputedStyle(element).fontSize)
      )
    )
    .toBeGreaterThanOrEqual(20);
  await expect(page.locator('link[rel~="icon"][href="/favicon.ico"]')).toHaveCount(
    1
  );
  expect(await expectNoHorizontalOverflow(page)).toBe(true);
});

test('primary navigation follows the brand before mission content', async ({
  page,
}) => {
  await page.goto('/');

  const homeLink = page.getByRole('link', { name: 'LaunchWatch home' });
  const primaryNavigation = page.locator(
    'nav[aria-label="Primary navigation"]:visible'
  );
  const home = primaryNavigation.getByRole('link', { name: 'Home' });
  const watch = primaryNavigation.getByRole('link', { name: 'Watch' });
  const history = primaryNavigation.getByRole('link', { name: 'History' });
  const mission = page.getByRole('link', { name: 'Orbital Dawn' }).first();

  await homeLink.focus();
  await homeLink.press('Tab');
  await expect(home).toBeFocused();
  await home.press('Tab');
  await expect(watch).toBeFocused();
  await watch.press('Tab');
  await expect(history).toBeFocused();
  await history.press('Tab');
  const feedStatusShortcut = page
    .locator('header')
    .getByRole('button', { name: /view provider status/ });
  if (await feedStatusShortcut.isVisible()) {
    await expect(feedStatusShortcut).toBeFocused();
    await feedStatusShortcut.press('Tab');
  }
  await expect(mission).toBeFocused();

  expect(await expectNoHorizontalOverflow(page)).toBe(true);
});

test('home keeps meaningful hierarchy while the launch feed is synchronizing', async ({
  page,
}) => {
  let pendingFeed: Route | null = null;
  await page.route('**/api/launches?type=all', async (route) => {
    pendingFeed = route;
  });

  await page.goto('/');

  const acquisitionHeading = page.getByRole('heading', {
    level: 1,
    name: 'Acquiring next mission',
  });
  await expect(acquisitionHeading).toBeVisible();
  await expect(
    page.getByRole('heading', {
      level: 2,
      name: 'Upcoming launches',
    })
  ).toBeVisible();
  await expect(page.getByText('Synchronizing mission queue')).toBeVisible();

  const busyRegions = page.locator('[aria-busy="true"]:visible');
  await expect(busyRegions).toHaveCount(
    test.info().project.name.startsWith('mobile') ? 2 : 3
  );
  expect(await expectNoHorizontalOverflow(page)).toBe(true);

  expect(pendingFeed).not.toBeNull();
  await pendingFeed!.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      launches: UPCOMING_LAUNCHES,
      meta: FEED_META,
    }),
  });

  await expect(
    page.getByRole('heading', {
      level: 1,
      name: UPCOMING_LAUNCHES[0].name,
    })
  ).toBeVisible();
});

test('coarse provider dates stay estimates until T-0 is confirmed', async ({
  page,
}) => {
  const estimatedLaunch = {
    ...UPCOMING_LAUNCHES[0],
    date: '2035-08-31T00:00:00.000Z',
    dateUnix: 2072131200,
    datePrecision: {
      name: 'Month',
      abbrev: 'M',
      description: 'The T-0 is expected in the given month.',
    },
    status: 'tbd' as const,
    statusName: 'To Be Determined',
    windowStart: '2035-08-31T00:00:00.000Z',
    windowEnd: '2035-08-31T00:00:00.000Z',
  };

  await page.route('**/api/launches?type=all', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        launches: [estimatedLaunch, UPCOMING_LAUNCHES[1]],
        meta: FEED_META,
      }),
    })
  );
  await page.route(
    '**/api/launches/ll2-demo-orbital-dawn',
    (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          launch: estimatedLaunch,
          canonicalId: estimatedLaunch.id,
          meta: FEED_META,
        }),
      })
  );

  await page.goto('/');

  const hero = page.locator(
    'section[aria-labelledby="featured-launch-title"]'
  );
  await expect(hero.getByText('Target estimate')).toBeVisible();
  await expect(hero.getByText('August 2035', { exact: true })).toHaveCount(2);
  await expect(hero.getByText(/Month estimate · countdown begins/)).toBeVisible();
  await expect(hero.locator('.countdown-display')).toHaveCount(0);

  if (!test.info().project.name.startsWith('mobile')) {
    const ticker = page
      .getByRole('complementary', { name: 'Mission status' })
      .getByRole('link', { name: /Orbital Dawn/ });
    await expect(ticker).toContainText('August 2035 · Month estimate');
    await expect(ticker).not.toContainText('T−');
    await expect(ticker.locator('time')).toHaveAttribute(
      'datetime',
      estimatedLaunch.date
    );
    expect(
      await ticker.evaluate((element) =>
        Math.round(element.getBoundingClientRect().height)
      )
    ).toBeGreaterThanOrEqual(44);
  }

  await page.getByRole('button', { name: 'Open briefing' }).click();
  const calendar = page.getByRole('button', {
    name: 'Calendar export pending a confirmed launch time',
  });
  await expect(calendar).toBeVisible();
  await expect(calendar).not.toHaveAttribute('disabled', '');
  await expect(calendar).toHaveAttribute('aria-disabled', 'true');
  await expect(calendar).toHaveAccessibleDescription(
    'Month estimate. Calendar export and browser alerts become available after the provider confirms the launch time.'
  );
  const fullMission = page.getByRole('link', { name: 'View full mission' });
  await fullMission.focus();
  await fullMission.press('Tab');
  await expect(calendar).toBeFocused();
  const pendingExplanation = page.locator(
    '[data-calendar-pending-tooltip="true"]'
  );
  await expect(pendingExplanation).toBeVisible();
  await expect(pendingExplanation).toHaveCSS('opacity', '1');
  expect(
    await pendingExplanation.evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      return (
        bounds.top >= 0 &&
        bounds.left >= 0 &&
        bounds.right <= window.innerWidth &&
        bounds.bottom <= window.innerHeight
      );
    })
  ).toBe(true);
  await calendar.press('Enter');
  await expect(
    page.getByRole('group', { name: 'Calendar options' })
  ).toHaveCount(0);
  expect(
    await calendar.evaluate((element) => element.getBoundingClientRect().height)
  ).toBeGreaterThanOrEqual(44);
  expect(await expectNoHorizontalOverflow(page)).toBe(true);
});

test('timed estimates retain a live approximate countdown', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const hourLaunch = {
    ...UPCOMING_LAUNCHES[0],
    datePrecision: {
      name: 'Hour',
      abbrev: 'HR',
      description: 'The T-0 is accurate to the hour.',
    },
  };

  await page.route('**/api/launches?type=all', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ launches: [hourLaunch], meta: FEED_META }),
    })
  );
  await page.route('**/api/launches/ll2-demo-orbital-dawn', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        launch: hourLaunch,
        canonicalId: hourLaunch.id,
        meta: FEED_META,
      }),
    })
  );

  await page.goto('/');

  const hero = page.locator(
    'section[aria-labelledby="featured-launch-title"]'
  );
  await expect(hero.locator('.countdown-display')).toBeVisible();
  await expect(hero.locator('.countdown-prefix')).toHaveText('≈T−');
  await expect(hero.locator('.countdown-unit')).toHaveCount(4);
  const spokenCountdown = hero.locator('.countdown-spoken');
  await expect(spokenCountdown).toContainText('Estimated countdown:');
  await expect(spokenCountdown).toHaveCSS('white-space', 'normal');
  await expect(spokenCountdown).toHaveCSS('overflow-wrap', 'anywhere');
  await expect(hero.locator('.countdown-unit-label')).toHaveText([
    'days',
    'hrs',
    'min',
    'sec',
  ]);
  const seconds = hero.locator('.countdown-digits').last();
  const initialSeconds = await seconds.textContent();
  await expect
    .poll(() => seconds.textContent(), { timeout: 3_000 })
    .not.toBe(initialSeconds);
  await expect(seconds).toHaveClass(/countdown-digit-tick/);
  await expect
    .poll(() =>
      seconds.evaluate((element) => getComputedStyle(element).animationName)
    )
    .toBe('countdown-digit-tick');
  await expect
    .poll(() =>
      seconds.evaluate((element) =>
        Number.parseFloat(getComputedStyle(element).animationDuration)
      )
    )
    .toBeGreaterThan(0.25);

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect
    .poll(() =>
      seconds.evaluate((element) =>
        Number.parseFloat(getComputedStyle(element).animationDuration)
      )
    )
    .toBeLessThanOrEqual(0.001);
  await expect(
    hero.getByText('Hour estimate · provider target may move')
  ).toBeVisible();
  await expect(hero.getByText('Target estimate')).toHaveCount(0);

  await page.goto(`/watch?id=${hourLaunch.id}`);

  const compactTarget = page.locator('section.stream-surface time');
  await expect(compactTarget).toContainText('≈T−');
  await expect(compactTarget).toContainText('Hour estimate');
  await expect(compactTarget.locator('.countdown-compact-tick')).toBeVisible();

  if (!test.info().project.name.startsWith('mobile')) {
    const ticker = page
      .getByRole('complementary', { name: 'Mission status' })
      .getByRole('link', { name: /Orbital Dawn/ });
    await expect(ticker).toContainText('≈T−');
    await expect(ticker).toContainText('Hour estimate');
    const tickerCountdown = ticker.locator('time');
    const initialTickerCountdown = await tickerCountdown.textContent();
    await expect
      .poll(() => tickerCountdown.textContent(), { timeout: 3_000 })
      .not.toBe(initialTickerCountdown);
    await expect(
      tickerCountdown.locator('.countdown-compact-tick')
    ).toHaveCount(0);
    await expect(tickerCountdown).toHaveClass(/!text-\[var\(--text-muted\)\]/);
  }

  expect(await expectNoHorizontalOverflow(page)).toBe(true);
});

test('shared chrome reports partial feed health on every route', async ({
  page,
}) => {
  const generatedAt = new Date(Date.now() - 5_000).toISOString();
  await page.route('**/api/launches?type=all', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        launches: UPCOMING_LAUNCHES,
        meta: {
          ...FEED_META,
          generatedAt,
          partial: true,
          providers: {
            ...FEED_META.providers,
            spacex: {
              state: 'error',
              cached: false,
              updatedAt: null,
              error: 'Provider request failed',
            },
          },
        },
      }),
    })
  );

  await page.goto('/launch/ll2-demo-orbital-dawn');

  const headerStatus = page
    .locator('header')
    .getByRole('status', { name: 'Launch feed status: Partial feed' });
  await expect(headerStatus).toHaveCount(1);
  await expect(headerStatus).toContainText('Partial feed');
  const feedAnnouncements = page.getByRole('status', {
    name: /^Launch feed status:/,
  });
  await expect(feedAnnouncements).toHaveCount(1);
  const footerStatus = page.locator('footer').getByText('Launch feed is partial.').locator('..');
  await expect(footerStatus).toContainText('Partial feed · refreshed');
  const visualAge = footerStatus.locator('[aria-hidden="true"]');
  const initialVisualAge = await visualAge.innerText();
  await expect.poll(() => visualAge.innerText()).not.toBe(initialVisualAge);
  await expect(footerStatus).not.toHaveAttribute('aria-live');
  await expect(page.locator('footer [aria-live]')).toHaveCount(0);
  const sourceFeeds = page.getByRole('navigation', {
    name: 'Launch data sources',
  });
  const feedStatusShortcut = page
    .locator('header')
    .getByRole('button', { name: 'Partial feed — view provider status' });
  await expect(feedStatusShortcut).toBeVisible();
  const shortcutBounds = await feedStatusShortcut.boundingBox();
  expect(shortcutBounds?.height).toBeGreaterThanOrEqual(44);
  expect(shortcutBounds?.width).toBeGreaterThanOrEqual(44);
  await feedStatusShortcut.click();
  await expect(sourceFeeds).toBeFocused();
  await expect(sourceFeeds).toBeInViewport();
  await expect(
    sourceFeeds.getByRole('link', {
      name: /SpaceX source — unavailable.*new tab/i,
    })
  ).toContainText('unavailable');
  await expect(
    sourceFeeds.getByRole('link', {
      name: /Launch Library 2 source — available.*new tab/i,
    })
  ).toContainText('available');
  expect(await expectNoHorizontalOverflow(page)).toBe(true);
});

test('narrow mobile chrome keeps concurrent live and degraded states readable', async ({
  page,
}) => {
  test.skip(!test.info().project.name.startsWith('mobile'));
  await page.setViewportSize({ width: 320, height: 568 });

  await page.route('**/api/launches?type=all', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        launches: [
          { ...UPCOMING_LAUNCHES[0], isLive: true },
          ...UPCOMING_LAUNCHES.slice(1),
        ],
        meta: {
          ...FEED_META,
          partial: true,
          providers: {
            ...FEED_META.providers,
            spacex: {
              state: 'error',
              cached: false,
              updatedAt: null,
              error: 'Provider request failed',
            },
          },
        },
      }),
    })
  );

  await page.goto('/');

  const header = page.locator('header.sticky:visible');
  await expect(
    header.getByRole('link', { name: '1 active live signal' })
  ).toContainText('LIVE');
  await expect(header.getByText('Partial', { exact: true })).toBeVisible();
  await expect(header.locator('.hardware-clock:visible')).toHaveCount(0);

  const headerLayout = await header.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }));
  expect(headerLayout.scrollWidth).toBeLessThanOrEqual(
    headerLayout.clientWidth
  );
  expect(await expectNoHorizontalOverflow(page)).toBe(true);

  await page.setViewportSize({ width: 360, height: 568 });
  await expect(header.locator('.hardware-clock:visible')).toHaveCount(1);
  expect(await expectNoHorizontalOverflow(page)).toBe(true);
});

test('home identifies and recovers retained missions after refresh failure', async ({
  page,
}) => {
  let failureEnabled = false;
  await page.route('**/api/launches?type=all', (route) => {
    if (!failureEnabled) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ launches: UPCOMING_LAUNCHES, meta: FEED_META }),
      });
    }

    return route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Provider maintenance' }),
    });
  });

  await page.goto('/');
  await expect(page.getByText('Last-known mission · refresh failed')).toHaveCount(0);

  failureEnabled = true;
  await page.getByRole('button', { name: 'Refresh now' }).click();

  const hero = page.locator(
    'section[aria-labelledby="featured-launch-title"]'
  );
  await expect(hero).toContainText('Last-known mission · refresh failed');
  await expect(hero).toHaveClass(/signal-warm/);

  const schedule = page.locator(
    'section[aria-labelledby="upcoming-launches-title"]'
  );
  await expect(schedule).toHaveClass(/signal-warm/);
  await expect(
    schedule.getByRole('status', { name: 'Upcoming launch results' })
  ).toContainText('refresh failed; showing last-known schedule');
  await expect(schedule).toContainText(
    'Refresh failed. Showing the last-known mission schedule.'
  );

  const retry = schedule.getByRole('button', { name: 'Retry feed' });
  await retry.click();
  await expect(retry).toBeFocused();
  await expect(retry).toHaveAttribute('aria-busy', 'false');
  expect((await retry.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  expect(await expectNoHorizontalOverflow(page)).toBe(true);
});

test('home rejects incomplete successful refreshes without erasing retained missions', async ({
  page,
}) => {
  let incompleteResponseEnabled = false;
  await page.route('**/api/launches?type=all', (route) => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(
        incompleteResponseEnabled
          ? { meta: FEED_META }
          : { launches: UPCOMING_LAUNCHES, meta: FEED_META }
      ),
    });
  });

  await page.goto('/');
  await expect(
    page.getByRole('heading', { level: 1, name: UPCOMING_LAUNCHES[0].name })
  ).toBeVisible();

  incompleteResponseEnabled = true;
  await page.getByRole('button', { name: 'Refresh now' }).click();

  const hero = page.locator(
    'section[aria-labelledby="featured-launch-title"]'
  );
  await expect(hero).toContainText('Last-known mission · refresh failed');
  await expect(hero).toContainText(UPCOMING_LAUNCHES[0].name);
  await expect(
    page.getByRole('status', { name: 'Launch feed status: Partial feed' })
  ).toBeVisible();
  expect(await expectNoHorizontalOverflow(page)).toBe(true);
});

test('home rejects incomplete mission records without erasing retained missions', async ({
  page,
}) => {
  let incompleteRecordEnabled = false;
  await page.route('**/api/launches?type=all', (route) => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        launches: incompleteRecordEnabled
          ? [{ id: UPCOMING_LAUNCHES[0].id }]
          : UPCOMING_LAUNCHES,
        meta: FEED_META,
      }),
    });
  });

  await page.goto('/');
  await expect(
    page.getByRole('heading', { level: 1, name: UPCOMING_LAUNCHES[0].name })
  ).toBeVisible();

  incompleteRecordEnabled = true;
  await page.getByRole('button', { name: 'Refresh now' }).click();

  const hero = page.locator(
    'section[aria-labelledby="featured-launch-title"]'
  );
  await expect(hero).toContainText('Last-known mission · refresh failed');
  await expect(hero).toContainText(UPCOMING_LAUNCHES[0].name);
  await expect(
    page.getByRole('status', { name: 'Launch feed status: Partial feed' })
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Upcoming launches' }))
    .toBeVisible();
  expect(await expectNoHorizontalOverflow(page)).toBe(true);
});

test('home rejects noncanonical mission identity without erasing retained missions', async ({
  page,
}) => {
  let malformedIdentityEnabled = false;
  await page.route('**/api/launches?type=all', (route) => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        launches: malformedIdentityEnabled
          ? [
              {
                ...UPCOMING_LAUNCHES[0],
                id: 'demo-orbital-dawn',
              },
            ]
          : UPCOMING_LAUNCHES,
        meta: FEED_META,
      }),
    });
  });

  await page.goto('/');
  const mission = page.getByRole('heading', {
    level: 1,
    name: UPCOMING_LAUNCHES[0].name,
  });
  await expect(mission).toBeVisible();

  malformedIdentityEnabled = true;
  await page.getByRole('button', { name: 'Refresh now' }).click();

  const hero = page.locator(
    'section[aria-labelledby="featured-launch-title"]'
  );
  await expect(hero).toContainText('Last-known mission · refresh failed');
  await expect(mission).toBeVisible();
  await expect(mission.locator('..')).toHaveAttribute(
    'href',
    '/launch/ll2-demo-orbital-dawn?from=home'
  );
  await expect(
    page.locator('a[href="/launch/demo-orbital-dawn"]')
  ).toHaveCount(0);
  expect(await expectNoHorizontalOverflow(page)).toBe(true);
});

test('desktop ticker keeps the last known mission after refresh failure', async ({
  page,
}) => {
  test.skip(
    test.info().project.name.startsWith('mobile'),
    'The mission ticker is desktop system-bar navigation.'
  );

  let feedRequests = 0;
  await page.route('**/api/launches?type=all', (route) => {
    feedRequests += 1;
    if (feedRequests === 1) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ launches: UPCOMING_LAUNCHES, meta: FEED_META }),
      });
    }

    return route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Provider maintenance' }),
    });
  });

  await page.goto('/');

  const statusBar = page.getByRole('complementary', {
    name: 'Mission status',
  });
  const missionLink = statusBar.getByRole('link', { name: /Orbital Dawn/ });
  await expect(missionLink).toContainText('NEXT');

  await page.getByRole('button', { name: 'Refresh now' }).click();

  await expect(statusBar).toContainText('PARTIAL FEED');
  await expect(missionLink).toContainText('LAST KNOWN');
  await expect(missionLink).toHaveAttribute(
    'href',
    '/launch/ll2-demo-orbital-dawn'
  );
  await expect(statusBar).not.toContainText('SCHEDULE DEGRADED');
  await missionLink.focus();
  await expect(missionLink).toBeFocused();
  expect(
    await missionLink.evaluate(
      (element) => element.getBoundingClientRect().height
    )
  ).toBeGreaterThanOrEqual(44);
  expect(await expectNoHorizontalOverflow(page)).toBe(true);
});

test('desktop ticker marks stale cached live coverage as unconfirmed', async ({
  page,
}) => {
  test.skip(
    test.info().project.name.startsWith('mobile'),
    'The mission ticker is desktop system-bar navigation.'
  );

  const staleLiveLaunch = {
    ...UPCOMING_LAUNCHES[0],
    status: 'live',
    statusName: 'In Flight',
    isLive: true,
    webcastLive: true,
  };
  await page.route('**/api/launches?type=all', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        launches: [staleLiveLaunch],
        meta: { ...FEED_META, stale: true },
      }),
    })
  );

  await page.goto('/');

  const statusBar = page.getByRole('complementary', {
    name: 'Mission status',
  });
  const missionLink = statusBar.getByRole('link', { name: /Orbital Dawn/ });
  await expect(statusBar).toContainText('STALE CACHE');
  await expect(missionLink).toContainText('LAST KNOWN');
  await expect(missionLink).toContainText('Coverage unconfirmed');
  await expect(missionLink).not.toContainText('LIVE');
  await expect(missionLink).not.toContainText('In progress');
  await expect(missionLink).toHaveAttribute(
    'href',
    '/watch?id=ll2-demo-orbital-dawn'
  );
  const schedule = page.locator(
    'section[aria-labelledby="upcoming-launches-title"]'
  );
  await expect(schedule.getByText('Coverage unconfirmed')).toBeVisible();
  await expect(schedule.getByText('Live now')).toHaveCount(0);
  await expect(schedule.locator('.status-dot-live')).toHaveCount(0);
  await missionLink.focus();
  await expect(missionLink).toBeFocused();
  expect(
    await missionLink.evaluate(
      (element) => element.getBoundingClientRect().height
    )
  ).toBeGreaterThanOrEqual(44);
  expect(await expectNoHorizontalOverflow(page)).toBe(true);
});

test('primary mission title links are touch-safe and keyboard-focusable', async ({
  page,
}) => {
  await page.goto('/');

  const heroMission = page
    .getByRole('link', { name: 'Orbital Dawn', exact: true })
    .first();
  await heroMission.focus();
  await expect(heroMission).toBeFocused();
  expect(
    await heroMission.evaluate(
      (element) => element.getBoundingClientRect().height
    )
  ).toBeGreaterThanOrEqual(44);

  await page.route(
    '**/api/launches/ll2-demo-orbital-dawn',
    (route) =>
      route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Detailed provider data unavailable' }),
      })
  );
  await page.goto('/watch');

  const watchMissionLinks = page.getByRole('link', {
    name: 'Orbital Dawn',
    exact: true,
  });
  await expect(watchMissionLinks).toHaveCount(2);

  for (const link of await watchMissionLinks.all()) {
    await expect(link).toHaveAttribute(
      'href',
      '/launch/ll2-demo-orbital-dawn?from=watch'
    );
    await link.focus();
    await expect(link).toBeFocused();
    expect(
      await link.evaluate((element) => element.getBoundingClientRect().height)
    ).toBeGreaterThanOrEqual(44);
  }

  expect(await expectNoHorizontalOverflow(page)).toBe(true);
});

test('watch mission details return to the same selected mission', async ({
  page,
}) => {
  await page.goto('/watch?id=ll2-demo-orbital-dawn');

  await page.getByRole('button', { name: 'Briefing', exact: true }).click();
  const briefing = page.getByRole('dialog', { name: /Orbital Dawn/i });
  await expect(briefing.getByRole('link', { name: 'View full mission' }))
    .toHaveAttribute(
      'href',
      '/launch/ll2-demo-orbital-dawn?from=watch'
    );
  await briefing
    .getByRole('button', { name: 'Close mission briefing' })
    .click();

  const selectedMissionLink = page
    .getByRole('heading', { level: 2, name: 'Orbital Dawn' })
    .locator('xpath=ancestor::a[1]');
  await selectedMissionLink.focus();
  await selectedMissionLink.press('Enter');

  await expect(page).toHaveURL(
    /\/launch\/ll2-demo-orbital-dawn\?from=watch$/
  );
  const returnLink = page.getByRole('link', {
    name: 'Back to watch room',
  });
  await expect(returnLink).toHaveAttribute(
    'href',
    '/watch?id=ll2-demo-orbital-dawn'
  );
  const visualName = page.getByText('Astra Nova launch vehicle', {
    exact: true,
  });
  const visualNameMetrics = await visualName.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    const lineHeight = Number.parseFloat(getComputedStyle(element).lineHeight);
    return {
      height: bounds.height,
      lineHeight,
      width: bounds.width,
    };
  });
  expect(visualNameMetrics.width).toBeGreaterThan(120);
  expect(visualNameMetrics.height).toBeLessThanOrEqual(
    visualNameMetrics.lineHeight * 2.1
  );
  await returnLink.focus();
  await expect(returnLink).toBeFocused();
  expect((await returnLink.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  await returnLink.press('Enter');

  await expect(page).toHaveURL(/\/watch\?id=ll2-demo-orbital-dawn$/);
  await expect(
    page.getByRole('heading', { level: 2, name: 'Orbital Dawn' })
  ).toBeVisible();
  expect(await expectNoHorizontalOverflow(page)).toBe(true);
});

test('watch navigation clears same-route mission selection', async ({ page }) => {
  await page.goto('/watch');

  const selectedMission = page.locator('[data-watch-selected-mission]');
  await page.getByRole('button', { name: /Polaris Relay/ }).click();
  await expect(page).toHaveURL(/\/watch\?id=spacex-demo-polaris$/);
  await expect(selectedMission).toContainText('Polaris Relay');

  const navigation = page
    .getByRole('navigation', { name: 'Primary navigation' })
    .filter({ visible: true });
  const watchLink = navigation.getByRole('link', { name: 'Watch' });
  await watchLink.focus();
  await watchLink.press('Enter');

  await expect(page).toHaveURL(/\/watch$/);
  await expect(selectedMission).toContainText('Orbital Dawn');
  await expect(page).toHaveTitle('Orbital Dawn | Watch | LaunchWatch');
  await expect(watchLink).toBeFocused();

  await page.goBack();
  await expect(page).toHaveURL(/\/watch\?id=spacex-demo-polaris$/);
  await expect(selectedMission).toContainText('Polaris Relay');

  await page.goForward();
  await expect(page).toHaveURL(/\/watch$/);
  await expect(selectedMission).toContainText('Orbital Dawn');
  expect(await expectNoHorizontalOverflow(page)).toBe(true);
});

test('mission details keep their parent surface current in primary navigation', async ({
  page,
}) => {
  const cases = [
    {
      path: '/launch/ll2-demo-orbital-dawn',
      activeLabel: 'Home',
    },
    {
      path: '/launch/spacex-demo-return',
      activeLabel: 'History',
    },
    {
      path: '/launch/ll2-demo-orbital-dawn?from=watch',
      activeLabel: 'Watch',
    },
    {
      path: '/launch/spacex-demo-return?from=history',
      activeLabel: 'History',
    },
  ];

  for (const { path, activeLabel } of cases) {
    await page.goto(path);
    const navigation = page.locator(
      'nav[aria-label="Primary navigation"]:visible',
    );
    const currentLink = navigation.locator('[aria-current="page"]');

    await expect(currentLink).toHaveCount(1);
    await expect(currentLink).toHaveAccessibleName(
      new RegExp(`^${activeLabel}$`, 'i'),
    );
    await currentLink.focus();
    await expect(currentLink).toBeFocused();
    expect((await currentLink.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  }
});

test('unfiltered archive missions retain History navigation context', async ({
  page,
}) => {
  await page.goto('/history');

  const missionDetail = page.locator(
    'a[href="/launch/spacex-demo-return?from=history"]',
  );
  await expect(missionDetail).toHaveCount(1);
  await expect(missionDetail).toHaveAccessibleName('View mission');
  await missionDetail.click();

  await expect(page).toHaveURL(
    /\/launch\/spacex-demo-return\?from=history$/,
  );
  const navigation = page.locator(
    'nav[aria-label="Primary navigation"]:visible',
  );
  const currentHistory = navigation.locator('[aria-current="page"]');
  await expect(currentHistory).toHaveAccessibleName(/^History$/i);
  await currentHistory.focus();
  await expect(currentHistory).toBeFocused();

  const returnLink = page.getByRole('link', { name: 'Back to history' });
  await expect(returnLink).toHaveAttribute(
    'href',
    '/history?focus=spacex-demo-return',
  );
  await returnLink.focus();
  await expect(returnLink).toBeFocused();
  expect((await returnLink.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  expect(await expectNoHorizontalOverflow(page)).toBe(true);
});

test('featured mission telemetry stays legible in the split layout', async ({
  page,
}) => {
  if ((page.viewportSize()?.width ?? 0) >= 768) {
    await page.setViewportSize({ width: 1440, height: 900 });
  } else {
    await page.setViewportSize({ width: 320, height: 568 });
  }
  const telemetryLaunch = {
    ...UPCOMING_LAUNCHES[0],
    rocket: 'Long March 6A',
    launchSite:
      "Taiyuan Satellite Launch Center, People's Republic of China",
    missionType: 'Communications',
    orbit: null,
  };
  await page.route('**/api/launches?type=all', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        launches: [
          telemetryLaunch,
          ...UPCOMING_LAUNCHES.slice(1),
        ],
        meta: FEED_META,
      }),
    })
  );
  await page.route(
    '**/api/launches/ll2-demo-orbital-dawn',
    (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          launch: telemetryLaunch,
          canonicalId: telemetryLaunch.id,
          meta: FEED_META,
        }),
      })
  );

  await page.goto('/');

  const telemetry = page
    .getByRole('heading', { level: 1, name: 'Orbital Dawn' })
    .locator('xpath=ancestor::section[1]')
    .locator('dl');
  await expect(telemetry).toBeVisible();
  const layout = await telemetry.evaluate((element) => {
    const columns = getComputedStyle(element).gridTemplateColumns
      .split(' ')
      .filter(Boolean);
    const cells = Array.from(element.children).map(
      (child) => child.getBoundingClientRect().width
    );

    return {
      columns: columns.length,
      narrowestCell: Math.min(...cells),
      clippedValues: Array.from(element.querySelectorAll('dd')).filter(
        (value) => value.scrollWidth > value.clientWidth + 1
      ).length,
    };
  });

  expect(layout.columns).toBe(2);
  expect(layout.narrowestCell).toBeGreaterThanOrEqual(
    (page.viewportSize()?.width ?? 0) >= 768 ? 220 : 120
  );
  expect(layout.clippedValues).toBe(0);
  await expect(
    telemetry.getByText('Long March 6A', { exact: true })
  ).toBeVisible();
  await expect(
    telemetry.getByText('Taiyuan Satellite Launch Center', { exact: true })
  ).toBeVisible();
  await expect(
    telemetry.getByText('China', { exact: true })
  ).toBeVisible();
  await expect(
    telemetry.getByText('Communications', { exact: true })
  ).toBeVisible();
  expect(await expectNoHorizontalOverflow(page)).toBe(true);
});

test('primary mission summaries keep the provider launch window visible', async ({
  page,
}) => {
  const routes = [
    '/',
    '/watch?id=ll2-demo-orbital-dawn',
    '/launch/ll2-demo-orbital-dawn',
  ];

  for (const route of routes) {
    await page.goto(route);
    await expect(
      page.getByRole('heading', { name: 'Orbital Dawn' }).first()
    ).toBeVisible();

    const launchWindow = page.getByRole('note', {
      name: /^Launch window \d{2}:\d{2}–\d{2}:\d{2} UTC$/,
    });
    await expect(launchWindow).toBeVisible();
    await expect(launchWindow).toHaveAccessibleName(
      /^Launch window \d{2}:\d{2}–\d{2}:\d{2} UTC$/
    );

    const geometry = await launchWindow.evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      return {
        left: bounds.left,
        right: bounds.right,
        viewportWidth: window.innerWidth,
      };
    });
    expect(geometry.left).toBeGreaterThanOrEqual(0);
    expect(geometry.right).toBeLessThanOrEqual(geometry.viewportWidth);
  }
});

test('home keeps the schedule ahead of optional licensed mission imagery', async ({
  page,
}) => {
  await page.goto('/');

  const primaryAction = page.getByRole('link', {
    name: 'Open coverage',
    exact: true,
  });
  const briefingAction = page.getByRole('button', {
    name: 'Open briefing',
    exact: true,
  });
  const visuals = page.locator('figure[data-visual-kind]');
  await expect(visuals).toHaveCount(0);

  const showVisual = page.getByRole('button', {
    name: 'Show mission visual for Orbital Dawn',
  });
  await expect(showVisual).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('.mission-visual')).toHaveCount(0);

  const initialHierarchy = await showVisual.evaluate((element) => {
    const scheduleHeading = Array.from(document.querySelectorAll('h2')).find(
      (heading) => heading.textContent?.includes('Upcoming launches')
    );
    const action = Array.from(document.querySelectorAll('a, button')).find(
      (candidate) => candidate.textContent?.trim() === 'Open briefing'
    );
    return {
      actionBottom: action?.getBoundingClientRect().bottom ?? 0,
      disclosureTop: element.getBoundingClientRect().top,
      disclosureHeight: element.getBoundingClientRect().height,
      scheduleTop: scheduleHeading?.getBoundingClientRect().top ?? Infinity,
      viewportHeight: window.innerHeight,
    };
  });
  expect(initialHierarchy.actionBottom).toBeLessThan(
    initialHierarchy.scheduleTop
  );
  expect(initialHierarchy.disclosureHeight).toBeGreaterThanOrEqual(44);
  expect(initialHierarchy.scheduleTop).toBeLessThan(
    initialHierarchy.viewportHeight
  );
  expect(initialHierarchy.scheduleTop).toBeLessThan(
    initialHierarchy.disclosureTop
  );

  await showVisual.focus();
  await showVisual.press('Enter');
  const hideVisual = page.getByRole('button', {
    name: 'Hide mission visual for Orbital Dawn',
  });
  await expect(hideVisual).toBeFocused();
  await expect(hideVisual).toHaveAttribute('aria-expanded', 'true');
  await expect(visuals).toHaveCount(1);

  const visual = visuals.first();
  const hierarchy = await visual.evaluate((element) => ({
    disclosureBottom:
      element.parentElement?.previousElementSibling?.getBoundingClientRect()
        .bottom ?? 0,
    visualTop: element.getBoundingClientRect().top,
  }));
  expect(hierarchy.disclosureBottom).toBeLessThanOrEqual(hierarchy.visualTop);
  await expect(primaryAction).toBeVisible();
  await expect(briefingAction).toBeVisible();
  await expect(visual).toHaveAttribute('data-visual-kind', 'vehicle');
  await expect(
    visual.getByRole('img', {
      name: 'Vehicle reference image of Astra Nova launch vehicle',
    })
  ).toBeVisible();
  await expect(
    visual.getByText('Vehicle reference', { exact: true })
  ).toBeVisible();
  await expect(
    visual.getByText('Astra Nova launch vehicle', { exact: true })
  ).toBeVisible();
  await expect(
    visual.getByText(
      'Credit: LaunchWatch fixture · via LaunchWatch fixture',
      { exact: true }
    )
  ).toBeVisible();
  await expect(
    visual.getByRole('link', {
      name: 'Open CC BY 4.0 license in a new tab',
    })
  ).toHaveAttribute(
    'href',
    'https://creativecommons.org/licenses/by/4.0/'
  );
  await expect(
    visual.getByRole('link', {
      name: 'Open LaunchWatch fixture source record in a new tab',
    })
  ).toHaveAttribute('href', 'https://example.test/source');

  const fullImage = visual.getByRole('link', {
    name: 'Open full image in a new tab',
  });
  await expect(fullImage).toHaveAttribute('href', '/icon-512.png');
  await fullImage.focus();
  await expect(fullImage).toBeFocused();
  const fullImageTarget = await fullImage.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    return {
      height: bounds.height,
      width: bounds.width,
    };
  });
  expect(fullImageTarget.height).toBeGreaterThanOrEqual(44);
  expect(fullImageTarget.width).toBeGreaterThanOrEqual(44);

  const visualFrame = await visual.evaluate((element) => {
    const viewport = element.querySelector('.mission-visual-viewport');
    const image = element.querySelector('img');
    const viewportStyle = viewport ? getComputedStyle(viewport) : null;
    const imageStyle = image ? getComputedStyle(image) : null;

    return {
      height: viewport?.getBoundingClientRect().height ?? 0,
      overflow: viewportStyle?.overflow,
      position: viewportStyle?.position,
      objectFit: imageStyle?.objectFit,
    };
  });
  expect(visualFrame.height).toBeGreaterThanOrEqual(160);
  expect(visualFrame.overflow).toBe('hidden');
  expect(visualFrame.position).toBe('relative');
  expect(visualFrame.objectFit).toBe('contain');
  expect(await expectNoHorizontalOverflow(page)).toBe(true);
});

test('short mobile viewports keep featured actions clear of primary navigation', async ({
  page,
}) => {
  test.skip(!test.info().project.name.startsWith('mobile'));
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/');

  const hero = page.locator(
    'section[aria-labelledby="featured-launch-title"]'
  );
  const primaryAction = hero.locator('a.action-button').first();
  const briefingAction = hero.getByRole('button', {
    name: 'Open briefing',
  });
  const telemetry = hero.locator('dl');
  const missionType = telemetry.getByText('Communications', { exact: true });
  const mobileNav = page.locator(
    'nav[aria-label="Primary navigation"]:visible'
  );

  await expect(primaryAction).toBeInViewport();
  await expect(briefingAction).toBeInViewport();
  await primaryAction.focus();
  await expect(primaryAction).toBeFocused();
  await briefingAction.focus();
  await expect(briefingAction).toBeFocused();

  const [primaryBox, briefingBox, telemetryBox, navBox] = await Promise.all([
    primaryAction.boundingBox(),
    briefingAction.boundingBox(),
    telemetry.boundingBox(),
    mobileNav.boundingBox(),
  ]);

  expect(primaryBox).not.toBeNull();
  expect(briefingBox).not.toBeNull();
  expect(telemetryBox).not.toBeNull();
  expect(navBox).not.toBeNull();
  expect(primaryBox!.y).toBeLessThan(telemetryBox!.y);
  expect(briefingBox!.y + briefingBox!.height + 4).toBeLessThanOrEqual(
    navBox!.y
  );
  await expect(missionType).toBeVisible();
  expect(
    await missionType.evaluate((element) => {
      const range = document.createRange();
      range.selectNodeContents(element);
      return range.getClientRects().length;
    })
  ).toBe(1);

  await page.setViewportSize({ width: 393, height: 727 });
  await expect
    .poll(async () => {
      const [
        compactTelemetryBox,
        compactPrimaryBox,
        compactBriefingBox,
        compactNavBox,
      ] = await Promise.all([
          telemetry.boundingBox(),
          primaryAction.boundingBox(),
          briefingAction.boundingBox(),
          mobileNav.boundingBox(),
        ]);

      return Boolean(
        compactTelemetryBox &&
          compactPrimaryBox &&
          compactBriefingBox &&
          compactNavBox &&
          compactPrimaryBox.y < compactTelemetryBox.y &&
          compactBriefingBox.y + compactBriefingBox.height + 4 <= compactNavBox.y
      );
    })
    .toBe(true);

  await page.setViewportSize({ width: 393, height: 851 });
  await expect
    .poll(async () => {
      const [standardTelemetryBox, standardPrimaryBox] = await Promise.all([
        telemetry.boundingBox(),
        primaryAction.boundingBox(),
      ]);

      return Boolean(
        standardTelemetryBox &&
          standardPrimaryBox &&
          standardTelemetryBox.y < standardPrimaryBox.y
      );
    })
    .toBe(true);
  expect(await expectNoHorizontalOverflow(page)).toBe(true);
});

test('home waits for canonical coverage before offering a stream fallback', async ({
  page,
}) => {
  let releaseDetail: () => void = () => undefined;
  const detailGate = new Promise<void>((resolve) => {
    releaseDetail = resolve;
  });

  await page.route(
    '**/api/launches/ll2-demo-orbital-dawn',
    async (route) => {
      await detailGate;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          launch: {
            ...UPCOMING_LAUNCHES[0],
            livestream: 'https://www.youtube.com/watch?v=official-stream',
          },
          canonicalId: UPCOMING_LAUNCHES[0].id,
          meta: FEED_META,
        }),
      });
    }
  );

  await page.goto('/');

  const checkingCoverage = page.getByRole('status', {
    name: 'Checking official coverage',
  });
  await expect(checkingCoverage).toBeVisible();
  await expect(
    page.getByRole('link', { name: /Find stream.*new tab/i })
  ).toHaveCount(0);
  expect(
    await checkingCoverage.evaluate(
      (element) => element.getBoundingClientRect().height
    )
  ).toBeGreaterThanOrEqual(44);

  releaseDetail();

  const officialCoverage = page.getByRole('link', {
    name: 'Watch mission',
  });
  await expect(officialCoverage).toHaveAttribute(
    'href',
    '/watch?id=ll2-demo-orbital-dawn'
  );
  await expect(checkingCoverage).toHaveCount(0);
  await officialCoverage.focus();
  await expect(officialCoverage).toBeFocused();
  expect(
    await officialCoverage.evaluate(
      (element) => element.getBoundingClientRect().height
    )
  ).toBeGreaterThanOrEqual(44);
  expect(await expectNoHorizontalOverflow(page)).toBe(true);
});

test('mission imagery recovers from a transient load failure without losing keyboard focus', async ({
  page,
}) => {
  let imageRequests = 0;
  let allowImageRecovery = false;
  let releaseRetry: () => void = () => undefined;
  const retryGate = new Promise<void>((resolve) => {
    releaseRetry = resolve;
  });

  await page.route('**/_next/image?**', async (route) => {
    const source = new URL(route.request().url()).searchParams.get('url');
    if (source !== '/icon-512.png') {
      await route.continue();
      return;
    }

    imageRequests += 1;
    if (!allowImageRecovery) {
      await route.fulfill({
        status: 503,
        contentType: 'text/plain',
        body: 'Temporary image optimizer failure',
      });
      return;
    }

    await retryGate;
    await route.continue();
  });

  await page.goto('/');

  await page
    .getByRole('button', { name: 'Show mission visual for Orbital Dawn' })
    .click();
  const visual = page.locator('figure[data-visual-kind="vehicle"]');
  await expect(visual).toHaveAttribute('data-visual-status', 'error');
  await expect(
    visual.getByText('Visual signal unavailable', { exact: true })
  ).toBeVisible();

  const retry = visual.locator('.mission-visual-retry');
  await expect(retry).toBeVisible();
  await expect(retry).toHaveRole('button');
  await expect(retry).toHaveAccessibleName('Retry image');
  const retryTarget = await retry.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    return { height: bounds.height, width: bounds.width };
  });
  expect(retryTarget.height).toBeGreaterThanOrEqual(44);
  expect(retryTarget.width).toBeGreaterThanOrEqual(44);

  allowImageRecovery = true;
  await retry.focus();
  await retry.press('Enter');
  await expect(retry).toBeFocused();
  await expect(retry).toHaveAttribute('aria-disabled', 'true');
  await expect(retry).toHaveAttribute('aria-busy', 'true');
  await expect(retry).toHaveText('Retrying image');
  await expect(visual).toHaveAttribute('data-visual-status', 'retrying');

  releaseRetry();

  await expect(visual).toHaveAttribute('data-visual-status', 'loaded');
  const fullImage = visual.getByRole('link', {
    name: 'Open full image in a new tab',
  });
  await expect(fullImage).toBeFocused();
  await expect(retry).toHaveCount(0);
  expect(imageRequests).toBeGreaterThanOrEqual(2);
  expect(await expectNoHorizontalOverflow(page)).toBe(true);
});

test('home visual enrichment keeps a stable footprint', async ({ page }) => {
  let releaseDetail: () => void = () => undefined;
  const detailGate = new Promise<void>((resolve) => {
    releaseDetail = resolve;
  });
  const feedLaunch = {
    ...UPCOMING_LAUNCHES[0],
    vehicleVisual: null,
    missionVisual: null,
  };

  await page.route('**/api/launches?type=all', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        launches: [feedLaunch, ...UPCOMING_LAUNCHES.slice(1)],
        meta: FEED_META,
      }),
    })
  );
  await page.route(
    '**/api/launches/ll2-demo-orbital-dawn',
    async (route) => {
      await detailGate;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          launch: UPCOMING_LAUNCHES[0],
          canonicalId: UPCOMING_LAUNCHES[0].id,
          meta: FEED_META,
        }),
      });
    }
  );

  await page.goto('/');

  await page
    .getByRole('button', { name: 'Show mission visual for Orbital Dawn' })
    .click();
  const loadingVisual = page.getByRole('status', {
    name: 'Loading mission visual',
  });
  await expect(loadingVisual).toBeVisible();
  const loadingHeight = await loadingVisual.evaluate(
    (element) => element.getBoundingClientRect().height
  );
  releaseDetail();

  const availableVisual = page.locator('figure[data-visual-kind="vehicle"]');
  await expect(availableVisual).toBeVisible();
  const availableHeight = await availableVisual.evaluate(
    (element) => element.getBoundingClientRect().height
  );

  expect(Math.abs(availableHeight - loadingHeight)).toBeLessThanOrEqual(2);
  expect(await expectNoHorizontalOverflow(page)).toBe(true);
});

test('home reports visual-detail failures as degraded data', async ({
  page,
}) => {
  const feedLaunch = {
    ...UPCOMING_LAUNCHES[0],
    vehicleVisual: null,
    missionVisual: null,
  };

  await page.route('**/api/launches?type=all', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        launches: [feedLaunch, ...UPCOMING_LAUNCHES.slice(1)],
        meta: FEED_META,
      }),
    })
  );
  await page.route(
    '**/api/launches/ll2-demo-orbital-dawn',
    async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 150));
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Detailed provider data unavailable',
        }),
      });
    }
  );

  await page.goto('/');

  await page
    .getByRole('button', { name: 'Show mission visual for Orbital Dawn' })
    .click();
  const degradedVisual = page.getByRole('status', {
    name: 'Mission visual unavailable',
  });
  await expect(degradedVisual).toHaveAttribute(
    'data-visual-status',
    'degraded'
  );
  await expect(
    degradedVisual.getByText('Visual metadata temporarily unavailable')
  ).toBeVisible();
  await expect(
    degradedVisual.getByText('Provider image not supplied')
  ).toHaveCount(0);
  await expect(
    page.getByRole('link', { name: /Find stream.*new tab/i })
  ).toBeVisible();
  await expect(
    page.getByText(
      'Official coverage status unavailable; search fallback shown.',
      { exact: true }
    )
  ).toBeVisible();
  expect(await expectNoHorizontalOverflow(page)).toBe(true);
});

test('footer controls keep source provenance touch-safe and preserve refresh focus', async ({
  page,
}) => {
  let feedRequests = 0;
  await page.route('**/api/launches?type=all', async (route) => {
    feedRequests += 1;
    if (feedRequests > 1) {
      await new Promise((resolve) => setTimeout(resolve, 800));
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        launches: UPCOMING_LAUNCHES,
        meta: FEED_META,
      }),
    });
  });

  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Orbital Dawn' }).first()
  ).toBeVisible();
  await expect.poll(() => feedRequests).toBe(1);
  await page.waitForTimeout(100);

  const refresh = page.locator('footer button');
  const source = page.getByRole('link', { name: /^Source.*new tab/i });
  const sourceFeeds = page.getByRole('navigation', {
    name: 'Launch data sources',
  });
  const spacexSource = sourceFeeds.getByRole('link', {
    name: /SpaceX source — available.*new tab/i,
    exact: true,
  });
  const launchLibrarySource = sourceFeeds.getByRole('link', {
    name: /Launch Library 2 source — available.*new tab/i,
    exact: true,
  });
  await expect(refresh).toHaveText('Refresh now');
  await refresh.focus();

  const placement = await Promise.all(
    [spacexSource, launchLibrarySource, refresh, source].map((control) =>
      control.evaluate((element) => {
        const bounds = element.getBoundingClientRect();
        const mobileNav = document.querySelector('nav.fixed.bottom-0');
        const navBounds = mobileNav?.getBoundingClientRect();
        const statusRail = document.querySelector(
          'aside[aria-label="Mission status"]'
        );
        const statusBounds = statusRail?.getBoundingClientRect();
        const visibleBottom = Math.min(
          window.innerHeight,
          navBounds && navBounds.height > 0
            ? navBounds.top
            : window.innerHeight,
          statusBounds && statusBounds.height > 0
            ? statusBounds.top
            : window.innerHeight
        );

        return {
          fullyVisible:
            bounds.top >= 0 &&
            bounds.bottom <= visibleBottom,
          height: bounds.height,
        };
      })
    )
  );

  expect(placement.every((control) => control.fullyVisible)).toBe(true);
  expect(placement.every((control) => control.height >= 44)).toBe(true);
  await spacexSource.focus();
  await expect(spacexSource).toBeFocused();
  await launchLibrarySource.focus();
  await expect(launchLibrarySource).toBeFocused();

  await refresh.press('Enter');
  await expect(refresh).toHaveText('Refreshing');
  await expect(refresh).toHaveAttribute('aria-disabled', 'true');
  await expect(refresh).toHaveAttribute('aria-busy', 'true');
  await expect(refresh).toBeFocused();
  await expect.poll(() => feedRequests).toBe(2);
  await refresh.press('Enter');
  expect(feedRequests).toBe(2);

  await expect(refresh).toHaveText('Refresh now');
  await expect(refresh).toHaveAttribute('aria-disabled', 'false');
  await expect(refresh).toHaveAttribute('aria-busy', 'false');
  await expect(refresh).toBeFocused();
  expect(await expectNoHorizontalOverflow(page)).toBe(true);
});

test('home schedule filters missions and opens a detail route', async ({ page }) => {
  if ((page.viewportSize()?.width ?? 0) >= 768) {
    await page.setViewportSize({ width: 1024, height: 900 });
  }
  await page.goto('/');

  await expect(
    page.getByRole('heading', { name: 'Orbital Dawn' }).first()
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Upcoming launches' })
  ).toBeVisible();

  await page.getByRole('button', { name: 'Filter' }).click();
  const filterPanel = page.locator('#launch-filters');
  for (const label of [
    'Search launches',
    'Provider',
    'Status',
    'Sort launches',
  ]) {
    await expect(filterPanel.getByText(label, { exact: true })).toBeVisible();
  }
  const provider = page.getByRole('combobox', { name: 'Provider' });
  await expect(provider.getByRole('option')).toHaveText([
    'All providers',
    'Demo Launch Alliance',
    'SpaceX',
  ]);
  const search = page.getByRole('searchbox', { name: 'Search launches' });
  const toolbarClear = page.getByRole('button', {
    name: 'Clear launch filters',
  });
  await search.focus();
  await page.keyboard.press('Tab');
  await expect(provider).toBeFocused();
  const providerPlacement = await provider.evaluate((element) => {
    const control = element.getBoundingClientRect();
    const mobileNav = document.querySelector('nav.fixed.bottom-0');
    const navBounds = mobileNav?.getBoundingClientRect();
    const visibleBottom =
      navBounds && navBounds.height > 0 ? navBounds.top : window.innerHeight;

    return {
      fullyVisible:
        control.top >= 0 &&
        control.bottom <= visibleBottom,
      height: control.height,
    };
  });
  expect(providerPlacement.fullyVisible).toBe(true);
  expect(providerPlacement.height).toBeGreaterThanOrEqual(44);

  await search.fill('   ');
  await expect(toolbarClear).toBeDisabled();
  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByRole('status', { name: 'Upcoming launch results' })
  ).toHaveText('2 missions');

  await provider.selectOption({ label: 'Demo Launch Alliance' });
  await expect(page).toHaveURL(/\/?provider=Demo\+Launch\+Alliance$/);
  await expect(
    page.getByRole('status', { name: 'Upcoming launch results' })
  ).toHaveText('1 mission');
  await expect(
    page.getByRole('heading', { name: 'Orbital Dawn' })
  ).toHaveCount(2);
  await expect(
    page.getByRole('heading', { name: 'Polaris Relay' })
  ).toHaveCount(0);

  await provider.selectOption('all');
  await search.fill('Polaris');
  await expect(page).toHaveURL(/\/?q=Polaris$/);
  await expect(
    page.getByRole('status', { name: 'Upcoming launch results' })
  ).toHaveText('1 mission');

  await expect(
    page.getByRole('heading', { name: 'Polaris Relay' })
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Orbital Dawn' })
  ).toHaveCount(1);

  const boundedSearch = 'x'.repeat(120);
  await search.fill(boundedSearch);
  await expect(search).toHaveValue(boundedSearch);
  await expect(search).toHaveAttribute('maxlength', '120');
  await search.press('End');
  await search.press('y');
  await expect(search).toHaveValue(boundedSearch);
  await expect(search).toBeFocused();
  await expect(page).toHaveURL(new RegExp(`\\?q=${boundedSearch}$`));

  await search.fill('Polaris');

  await expect(toolbarClear).toHaveText('Clear filters');
  await expect(toolbarClear).toHaveCSS('white-space', 'nowrap');
  expect((await toolbarClear.boundingBox())?.height).toBe(44);
  await toolbarClear.focus();
  await toolbarClear.press('Enter');
  await expect(search).toHaveValue('');
  await expect(search).toBeFocused();
  await expect(toolbarClear).toBeDisabled();
  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByRole('status', { name: 'Upcoming launch results' })
  ).toHaveText('2 missions');

  await search.fill('mission that does not exist');
  await expect(
    page.getByRole('heading', {
      name: 'No missions match these filters.',
    })
  ).toBeVisible();
  const clearFilters = page.getByRole('button', { name: 'Clear all filters' });
  await search.focus();
  for (let index = 0; index < 5; index += 1) {
    await page.keyboard.press('Tab');
  }
  await expect(clearFilters).toBeFocused();
  const clearPlacement = await clearFilters.evaluate((element) => {
    const control = element.getBoundingClientRect();
    const mobileNav = document.querySelector('nav.fixed.bottom-0');
    const navBounds = mobileNav?.getBoundingClientRect();
    const visibleBottom =
      navBounds && navBounds.height > 0 ? navBounds.top : window.innerHeight;

    return {
      fullyVisible:
        control.top >= 0 &&
        control.bottom <= visibleBottom,
      height: control.height,
    };
  });
  expect(clearPlacement.fullyVisible).toBe(true);
  expect(clearPlacement.height).toBeGreaterThanOrEqual(44);
  await clearFilters.press('Enter');
  await expect(search).toHaveValue('');
  await expect(search).toBeFocused();
  await expect(
    page.getByRole('status', { name: 'Upcoming launch results' })
  ).toHaveText('2 missions');

  await search.fill('Polaris');
  await page
    .getByRole('link', { name: /Polaris Relay/i })
    .click();

  await expect(page).toHaveURL(
    /\/launch\/spacex-demo-polaris\?from=home&schedule=q%3DPolaris$/,
  );
  await expect(
    page.getByRole('heading', { level: 1, name: 'Polaris Relay' })
  ).toBeVisible();
  expect(await expectNoHorizontalOverflow(page)).toBe(true);
});

test('home brand navigation clears same-route schedule context', async ({
  page,
}) => {
  await page.goto('/?q=Polaris');

  const resultStatus = page.getByRole('status', {
    name: 'Upcoming launch results',
  });
  await expect(resultStatus).toHaveText('1 mission');
  await expect(
    page.getByRole('searchbox', { name: 'Search launches' }),
  ).toHaveValue('Polaris');

  const homeLink = page.getByRole('link', { name: 'LaunchWatch home' });
  await homeLink.focus();
  await homeLink.press('Enter');

  await expect(page).toHaveURL(/\/$/);
  await expect(resultStatus).toHaveText('2 missions');
  await expect(
    page.getByRole('searchbox', { name: 'Search launches' }),
  ).toHaveCount(0);
  await expect(homeLink).toBeFocused();

  await page.goBack();
  await expect(page).toHaveURL(/\?q=Polaris$/);
  await expect(resultStatus).toHaveText('1 mission');
  await expect(
    page.getByRole('searchbox', { name: 'Search launches' }),
  ).toHaveValue('Polaris');

  await page.goForward();
  await expect(page).toHaveURL(/\/$/);
  await expect(resultStatus).toHaveText('2 missions');
  await expect(
    page.getByRole('searchbox', { name: 'Search launches' }),
  ).toHaveCount(0);
  expect(await expectNoHorizontalOverflow(page)).toBe(true);
});

test('home reveals a large mission queue in honest, touch-safe batches', async ({
  page,
}) => {
  const launches = Array.from({ length: 12 }, (_, index) => {
    const template =
      UPCOMING_LAUNCHES[index % UPCOMING_LAUNCHES.length];
    const sourceId = `schedule-mission-${index + 1}`;

    return {
      ...template,
      id: `${template.source}-${sourceId}`,
      sourceId,
      name: `Schedule Mission ${index + 1}`,
      dateUnix: UPCOMING_LAUNCHES[0].dateUnix + index,
    };
  });

  await page.route('**/api/launches?type=all', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ launches, meta: FEED_META }),
    })
  );
  await page.goto('/');

  const schedule = page.getByRole('region', { name: 'Upcoming launches' });
  const results = schedule.locator('#upcoming-launch-results article');
  const resultStatus = schedule.getByRole('status', {
    name: 'Upcoming launch results',
  });

  await expect(resultStatus).toHaveText('Showing 5 of 12 missions');
  await expect(results).toHaveCount(5);
  await expect(schedule.getByText('Schedule Mission 6')).toHaveCount(0);

  const loadFive = schedule.getByRole('button', { name: 'Load 5 more' });
  await loadFive.focus();
  await expect(loadFive).toBeFocused();
  expect((await loadFive.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  await loadFive.press('Enter');

  await expect(resultStatus).toHaveText('Showing 10 of 12 missions');
  await expect(results).toHaveCount(10);
  const loadTwo = schedule.getByRole('button', { name: 'Load 2 more' });
  await expect(loadTwo).toBeFocused();
  await loadTwo.press('Enter');

  await expect(resultStatus).toHaveText('12 missions');
  await expect(results).toHaveCount(12);
  const allLoaded = schedule.getByRole('button', {
    name: 'All 12 missions loaded',
  });
  await expect(allLoaded).toBeFocused();
  await expect(allLoaded).toHaveAttribute('aria-disabled', 'true');
  expect(await expectNoHorizontalOverflow(page)).toBe(true);
});

test('schedule detail return restores the revealed mission result', async ({
  page,
}) => {
  const launches = Array.from({ length: 12 }, (_, index) => {
    const template = UPCOMING_LAUNCHES[index % UPCOMING_LAUNCHES.length];
    const restoreTarget = index === 7;
    const source = restoreTarget ? 'll2' : template.source;
    const sourceId = restoreTarget
      ? 'demo-orbital-dawn'
      : `schedule-return-${index + 1}`;

    return {
      ...template,
      id: `${source}-${sourceId}`,
      source,
      sourceId,
      name: `Schedule Return Mission ${index + 1}`,
      dateUnix: UPCOMING_LAUNCHES[0].dateUnix + index,
    };
  });

  await page.route('**/api/launches?type=all', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ launches, meta: FEED_META }),
    })
  );
  await page.goto('/');

  const schedule = page.getByRole('region', { name: 'Upcoming launches' });
  await schedule.getByRole('button', { name: 'Load 5 more' }).click();
  const target = schedule.getByRole('link', {
    name: /Schedule Return Mission 8/,
  });
  await expect(target).toBeVisible();
  await target.click();

  await page.getByRole('link', { name: 'Back to launches' }).click();
  await expect(schedule.locator('#upcoming-launch-results article')).toHaveCount(10);
  await expect(target).toBeFocused();
  expect(await expectNoHorizontalOverflow(page)).toBe(true);
});

test('archive filters stay truthful when selected values leave the feed', async ({
  page,
}) => {
  const missingProvider = 'Retired Provider';
  const missingProviderLabel = `${missingProvider} — not in current feed`;

  await page.goto(`/?provider=${encodeURIComponent(missingProvider)}`);

  const scheduleProvider = page.getByRole('combobox', { name: 'Provider' });
  await expect(scheduleProvider).toHaveValue(missingProvider);
  await expect(
    scheduleProvider.getByRole('option', { name: missingProviderLabel })
  ).toHaveCount(1);
  await expect(
    page.getByRole('heading', { name: 'No missions match these filters.' })
  ).toBeVisible();
  expect(await expectNoHorizontalOverflow(page)).toBe(true);

  await page.goto(`/history?provider=${encodeURIComponent(missingProvider)}`);

  const archiveProvider = page.getByRole('combobox', { name: 'Provider' });
  await expect(archiveProvider).toHaveValue(missingProvider);
  await expect(
    archiveProvider.getByRole('option', { name: missingProviderLabel })
  ).toHaveCount(1);
  await expect(
    page.getByRole('heading', {
      name: 'No archived missions match these filters.',
    })
  ).toBeVisible();

  await page.goto('/history?year=1999');

  const archiveYear = page.getByRole('combobox', { name: 'Launch year' });
  await expect(archiveYear).toHaveValue('1999');
  await expect(
    archiveYear.getByRole('option', {
      name: '1999 — not in current feed',
    })
  ).toHaveCount(1);
  await expect(
    page.getByRole('status', { name: 'Archive results' })
  ).toHaveText('0 results');
  await expect(page).toHaveURL(/\/history\?year=1999$/);
  expect(await expectNoHorizontalOverflow(page)).toBe(true);
});

test('home schedule keeps long mission telemetry readable', async ({
  page,
}) => {
  const longMissionName =
    'Falcon 9 Block 5 | Transporter 18 (Dedicated SSO Rideshare)';
  const longProviderName =
    'China Aerospace Science and Technology Corporation';
  const longVehicleName = 'Firefly Alpha Block 2 with extended fairing';
  const longVehicleFamily = 'Firefly Alpha reusable launch vehicle';
  const longStatusName = 'Launch Window Under Review by Range Operations';
  const longSiteName = 'Satish Dhawan Space Centre Second Launch Pad';
  const displayedSiteName = 'Satish Dhawan Space Centre Second Pad';
  const longSiteLocality =
    "Wenchang Space Launch Site, People's Republic of China";
  const displayedSiteLocality = 'Wenchang Space Launch Site, China';

  if ((page.viewportSize()?.width ?? 0) >= 1024) {
    await page.setViewportSize({ width: 1440, height: 900 });
  }

  await page.route('**/api/launches?type=all', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        launches: [
          {
            ...UPCOMING_LAUNCHES[0],
            name: longMissionName,
            provider: longProviderName,
            rocket: longVehicleName,
            rocketFamily: longVehicleFamily,
            statusName: longStatusName,
            launchSite: longSiteName,
            location: {
              ...UPCOMING_LAUNCHES[0].location!,
              name: longSiteLocality,
            },
          },
        ],
        meta: FEED_META,
      }),
    })
  );

  await page.goto('/');

  const schedule = page.getByRole('region', { name: 'Upcoming launches' });
  const launchDay = schedule.getByText('Jul 28, 2035', { exact: true });
  const missionName = schedule.getByText(longMissionName, { exact: true });
  const providerName = schedule.getByText(longProviderName, { exact: true });
  const statusName = schedule.getByText(longStatusName, { exact: true });
  await expect(launchDay).toBeVisible();
  await expect(missionName).toBeVisible();
  await expect(providerName).toBeVisible();
  await expect(statusName).toBeVisible();

  const readableContent = [
    launchDay,
    missionName,
    providerName,
    statusName,
    schedule
      .getByText(longVehicleName, { exact: true })
      .filter({ visible: true }),
  ];
  if ((page.viewportSize()?.width ?? 0) >= 1024) {
    readableContent.push(
      schedule
        .getByText(longVehicleFamily, { exact: true })
        .filter({ visible: true }),
      schedule
        .getByText(displayedSiteName, { exact: true })
        .filter({ visible: true }),
      schedule
        .getByText(displayedSiteLocality, { exact: true })
        .filter({ visible: true })
    );
  } else {
    readableContent.push(
      schedule
        .getByText(`${displayedSiteName} · ${displayedSiteLocality}`, {
          exact: true,
        })
        .filter({ visible: true })
    );
    const scheduleRow = schedule.locator('article').first();
    await expect(
      scheduleRow.getByText('Vehicle', { exact: true }).filter({ visible: true })
    ).toBeVisible();
    await expect(
      scheduleRow.getByText('Site', { exact: true }).filter({ visible: true })
    ).toBeVisible();
  }

  for (const content of readableContent) {
    await expect(content).toBeVisible();
    const layout = await content.evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return {
        clientWidth: element.clientWidth,
        height: bounds.height,
        lineHeight: Number.parseFloat(style.lineHeight),
        scrollWidth: element.scrollWidth,
        textOverflow: style.textOverflow,
        whiteSpace: style.whiteSpace,
      };
    });

    expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth + 1);
    expect(layout.textOverflow).not.toBe('ellipsis');
    expect(layout.whiteSpace).toBe('normal');
    expect(layout.height).toBeGreaterThanOrEqual(layout.lineHeight);
  }

  const missionLink = schedule.getByRole('link', { name: longMissionName });
  await missionLink.focus();
  await expect(missionLink).toBeFocused();
  expect((await missionLink.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  expect(await expectNoHorizontalOverflow(page)).toBe(true);
});

test('home keeps facility context visible for numeric launch pads', async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  const numericPadLaunch = {
    ...UPCOMING_LAUNCHES[0],
    launchSite: '201',
    location: {
      lat: 19.618452,
      lng: 110.955356,
      name: "Wenchang Space Launch Site, People's Republic of China",
      countryCode: 'CN',
    },
  };

  await page.route('**/api/launches?type=all', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        launches: [numericPadLaunch],
        meta: FEED_META,
      }),
    })
  );

  await page.goto('/');

  const schedule = page.getByRole('region', { name: 'Upcoming launches' });
  const siteLabel =
    (page.viewportSize()?.width ?? 0) >= 1024
      ? schedule.getByText('Wenchang Space Launch Site, China', {
          exact: true,
        })
      : schedule.getByText('201 · Wenchang Space Launch Site, China', {
          exact: true,
        });
  await expect(siteLabel.filter({ visible: true })).toBeVisible();
  const missionLink = schedule.getByRole('link', {
    name: /Orbital Dawn/,
  });
  await missionLink.focus();
  await expect(missionLink).toBeFocused();
  expect((await missionLink.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  expect(await expectNoHorizontalOverflow(page)).toBe(true);
  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test('home distinguishes an empty provider schedule and offers recovery', async ({
  page,
}) => {
  let feedRequests = 0;
  await page.route('**/api/launches?type=all', async (route) => {
    feedRequests += 1;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        launches: feedRequests === 1 ? [] : UPCOMING_LAUNCHES,
        meta: FEED_META,
      }),
    });
  });

  await page.goto('/');

  await expect(
    page.getByRole('heading', {
      name: 'No upcoming missions are scheduled.',
    })
  ).toBeVisible();
  await expect(
    page.getByText(
      'Connected providers returned an empty schedule. Check again soon or refresh the feed.'
    )
  ).toBeVisible();
  await expect(
    page.getByRole('heading', {
      name: 'No missions match these filters.',
    })
  ).toHaveCount(0);

  await page
    .getByRole('button', { name: 'Refresh launch schedule' })
    .click();

  await expect(
    page.getByRole('heading', { name: 'Orbital Dawn' }).first()
  ).toBeVisible();
  await expect(
    page.getByRole('status', { name: 'Upcoming launch results' })
  ).toHaveText('2 missions');
  expect(await expectNoHorizontalOverflow(page)).toBe(true);
});

test('home schedule retry reports progress and restores keyboard focus', async ({
  page,
}) => {
  let feedRequests = 0;
  const releaseSuccessfulFeeds: Array<() => void> = [];
  await page.route('**/api/launches?type=all', async (route) => {
    feedRequests += 1;
    if (feedRequests % 2 === 1) {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Provider maintenance' }),
      });
      return;
    }

    await new Promise<void>((resolve) => {
      releaseSuccessfulFeeds.push(resolve);
    });
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        launches: UPCOMING_LAUNCHES,
        meta: FEED_META,
      }),
    });
  });

  await page.goto('/');

  const heroError = page
    .getByRole('heading', { name: 'We could not load the next mission.' })
    .locator('xpath=ancestor::section[1]');
  const listError = page
    .getByRole('heading', {
      name: 'The schedule is temporarily unavailable.',
    })
    .locator('xpath=ancestor::section[1]');
  const heroRetry = heroError.locator('button');
  const listRetry = listError.locator('button');
  await expect(heroRetry).toHaveAccessibleName('Retry schedule');
  await expect(listRetry).toHaveAccessibleName('Retry schedule');
  await expect(
    page.getByRole('link', { name: /SpaceX source — unavailable.*new tab/i })
  ).toContainText('unavailable');
  await expect(
    page.getByRole('link', {
      name: /Launch Library 2 source — unavailable.*new tab/i,
    })
  ).toContainText('unavailable');
  await heroRetry.focus();
  await heroRetry.press('Enter');

  for (const retry of [heroRetry, listRetry]) {
    await expect(retry).toHaveAccessibleName('Retrying schedule');
    await expect(retry).toHaveAttribute('aria-disabled', 'true');
    await expect(retry).toHaveAttribute('aria-busy', 'true');
  }
  await expect(heroRetry).toBeFocused();
  await expect.poll(() => feedRequests).toBe(2);
  expect(
    await heroRetry.evaluate((element) => element.getBoundingClientRect().height)
  ).toBeGreaterThanOrEqual(44);

  await heroRetry.press('Enter');
  expect(feedRequests).toBe(2);
  releaseSuccessfulFeeds.shift()?.();

  await expect(
    page.getByRole('heading', { name: 'Upcoming launches' })
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: /SpaceX source — available.*new tab/i })
  ).toContainText('available');
  await expect(
    page.getByRole('link', {
      name: /Launch Library 2 source — available.*new tab/i,
    })
  ).toContainText('available');
  await expect(
    page.getByRole('link', { name: 'Orbital Dawn', exact: true }).first()
  ).toBeFocused();
  expect(await expectNoHorizontalOverflow(page)).toBe(true);

  await page.reload();
  const restoredListError = page
    .getByRole('heading', {
      name: 'The schedule is temporarily unavailable.',
    })
    .locator('xpath=ancestor::section[1]');
  const restoredListRetry = restoredListError.locator('button');
  await restoredListRetry.focus();
  await restoredListRetry.press('Enter');
  await expect.poll(() => feedRequests).toBe(4);
  await expect(restoredListRetry).toHaveAccessibleName('Retrying schedule');
  await expect(restoredListRetry).toHaveAttribute('aria-disabled', 'true');
  await expect(restoredListRetry).toBeFocused();
  const retryPlacement = await restoredListRetry.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    const mobileNav = document.querySelector('nav.fixed.bottom-0');
    const navBounds = mobileNav?.getBoundingClientRect();
    const visibleBottom =
      navBounds && navBounds.height > 0 ? navBounds.top : window.innerHeight;

    return {
      fullyVisible: bounds.top >= 0 && bounds.bottom <= visibleBottom,
      height: bounds.height,
    };
  });
  expect(retryPlacement.fullyVisible).toBe(true);
  expect(retryPlacement.height).toBeGreaterThanOrEqual(44);

  await restoredListRetry.press('Enter');
  expect(feedRequests).toBe(4);
  releaseSuccessfulFeeds.shift()?.();

  await expect(
    page.getByRole('heading', { name: 'Upcoming launches' })
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Filter' })).toBeFocused();
  expect(await expectNoHorizontalOverflow(page)).toBe(true);
});

test('watch enriches the selected mission and switches the mission queue', async ({
  page,
}) => {
  await page.goto('/watch');

  await expect(
    page.getByText('This provider stream opens in a separate window.')
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: /Open provider stream.*new tab/i })
  ).toHaveAttribute(
    'href',
    'https://x.com/i/broadcasts/demo-orbital-dawn'
  );
  const scheduledCoverage = page.getByRole('region', {
    name: 'Mission coverage scheduled',
  });
  await expect(scheduledCoverage).toHaveClass(/signal-cold/);
  await expect(scheduledCoverage).not.toHaveClass(/signal-live/);
  await expect(
    scheduledCoverage.getByRole('link', { name: /Open provider stream.*new tab/i })
  ).toHaveClass(/action-button-secondary/);
  const scheduledSurface = scheduledCoverage.locator('.stream-surface');
  await expect(scheduledSurface).toHaveClass(/signal-cold/);
  const scheduledSurfaceColors = await scheduledSurface.evaluate((element) => {
    const styles = getComputedStyle(element);
    const probe = document.createElement('span');
    probe.style.color = styles.getPropertyValue('--console-magenta').trim();
    document.body.append(probe);
    const liveSignal = getComputedStyle(probe).color
      .match(/\d+/g)
      ?.slice(0, 3)
      .join(', ');
    probe.remove();
    return {
      background: styles.backgroundImage,
      liveSignal,
    };
  });
  expect(scheduledSurfaceColors.liveSignal).toBeTruthy();
  expect(scheduledSurfaceColors.background).not.toContain(
    scheduledSurfaceColors.liveSignal!
  );
  await expect(scheduledCoverage.locator('.video-signal-frame')).toHaveCount(0);
  await expect(
    page.locator('a[href="/watch?id=ll2-demo-orbital-dawn"]')
  ).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Briefing' })
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'No live stream right now' })
  ).toHaveCount(0);
  await expect(
    page.getByRole('heading', { level: 1, name: 'Watch room' })
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { level: 2, name: 'Orbital Dawn' })
  ).toBeVisible();
  await expect(page).toHaveTitle('Orbital Dawn | Watch | LaunchWatch');
  const watchTrajectory = page.getByRole('region', {
    name: 'Mission trajectory',
  });
  await expect(watchTrajectory).toHaveCount(1);
  await expect(watchTrajectory).toContainText('Orbital Dawn');
  await expect(
    page.getByRole('group', { name: 'Coverage signal' })
  ).toBeVisible();
  expect(await expectNoHorizontalOverflow(page)).toBe(true);

  const polarisQueueItem = page
    .getByRole('complementary', { name: 'Next up' })
    .getByRole('button', { name: /Polaris Relay/i });
  const selectedMission = page.locator('[data-watch-selected-mission]');
  await selectedMission
    .getByRole('button', { name: 'Calendar', exact: true })
    .click();
  await expect(
    page.getByRole('group', { name: 'Calendar options' })
  ).toBeVisible();
  await polarisQueueItem.focus();
  await expect(polarisQueueItem).toBeFocused();
  await polarisQueueItem.press('Enter');

  await expect(page).toHaveURL(/\/watch\?id=spacex-demo-polaris$/);
  await expect(
    page.getByRole('heading', { level: 2, name: 'Polaris Relay' })
  ).toBeVisible();
  await expect(page).toHaveTitle('Polaris Relay | Watch | LaunchWatch');
  await expect(
    page.getByRole('group', { name: 'Calendar options' })
  ).toHaveCount(0);
  await expect(
    page.locator('a[href="/watch?id=spacex-demo-polaris"]')
  ).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Load video for Polaris Relay' })
  ).toBeVisible();
  await expect(watchTrajectory).toContainText('Polaris Relay');
  await expect(polarisQueueItem).toBeFocused();
  expect(await expectNoHorizontalOverflow(page)).toBe(true);

  await page.goBack();
  await expect(page).toHaveURL(/\/watch$/);
  await expect(
    page.getByRole('heading', { level: 2, name: 'Orbital Dawn' })
  ).toBeVisible();
  await expect(page).toHaveTitle('Orbital Dawn | Watch | LaunchWatch');

  await page.goForward();
  await expect(page).toHaveURL(/\/watch\?id=spacex-demo-polaris$/);
  await expect(
    page.getByRole('heading', { level: 2, name: 'Polaris Relay' })
  ).toBeVisible();
  await expect(page).toHaveTitle('Polaris Relay | Watch | LaunchWatch');

  await page.goto('/history');
  await expect(page).toHaveTitle('Launch History | LaunchWatch');
});

test('watch reveals a pointer-selected mission on narrow layouts', async ({
  page,
}) => {
  await page.goto('/watch');

  const selectedMission = page.locator('[data-watch-selected-mission]');
  const polarisQueueItem = page
    .getByRole('complementary', { name: 'Next up' })
    .getByRole('button', { name: /Polaris Relay/i });
  await polarisQueueItem.scrollIntoViewIfNeeded();

  const initialScroll = await page.evaluate(() => window.scrollY);
  await polarisQueueItem.click();
  await expect(page).toHaveURL(/\/watch\?id=spacex-demo-polaris$/);
  await expect(
    page.getByRole('heading', { level: 2, name: 'Polaris Relay' })
  ).toBeVisible();

  if (test.info().project.name.startsWith('mobile')) {
    await expect(selectedMission).toBeInViewport();
    const geometry = await selectedMission.evaluate((element) => {
      const selectedBounds = element.getBoundingClientRect();
      const headerBounds = document.querySelector('header')?.getBoundingClientRect();
      return {
        headerBottom: headerBounds?.bottom ?? 0,
        selectedTop: selectedBounds.top,
        scrollY: window.scrollY,
      };
    });
    expect(geometry.scrollY).toBeLessThan(initialScroll);
    expect(geometry.selectedTop).toBeGreaterThanOrEqual(
      geometry.headerBottom - 1
    );
  } else {
    expect(await page.evaluate(() => window.scrollY)).toBe(initialScroll);
  }

  expect(await expectNoHorizontalOverflow(page)).toBe(true);
});

test('watch keeps long mission queues compact and keyboard-reachable', async ({
  page,
}) => {
  const longMissionName =
    'Falcon 9 Block 5 | BlueBird 11-13 (Block 2 #6-8)';
  const longProviderName =
    'China Aerospace Science and Technology Corporation';
  const queuedLaunches = Array.from({ length: 12 }, (_, index) => ({
    ...UPCOMING_LAUNCHES[0],
    id: `ll2-demo-queue-${index + 1}`,
    sourceId: `demo-queue-${index + 1}`,
    ll2Id: `demo-queue-${index + 1}`,
    name: index === 0 ? longMissionName : `Queue mission ${index + 1}`,
    missionName:
      index === 0 ? longMissionName : `Queue mission ${index + 1}`,
    provider: index === 0 ? longProviderName : UPCOMING_LAUNCHES[0].provider,
    date: new Date(
      Date.parse(UPCOMING_LAUNCHES[0].date) + index * 86_400_000
    ).toISOString(),
    dateUnix: UPCOMING_LAUNCHES[0].dateUnix + index * 86_400,
  }));

  await page.route('**/api/launches**', async (route) => {
    const url = new URL(route.request().url());

    if (url.pathname === '/api/launches') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          launches: queuedLaunches,
          meta: FEED_META,
          cached: false,
          source: 'api',
        }),
      });
      return;
    }

    const id = decodeURIComponent(url.pathname.replace('/api/launches/', ''));
    const launch = queuedLaunches.find((candidate) => candidate.id === id);
    await route.fulfill({
      status: launch ? 200 : 404,
      contentType: 'application/json',
      body: JSON.stringify(
        launch
          ? { launch, canonicalId: launch.id, meta: FEED_META }
          : { error: 'Launch not found' }
      ),
    });
  });

  await page.goto('/watch?id=ll2-demo-queue-12');

  const queue = page.getByRole('complementary', { name: 'Next up' });
  await expect(queue.getByText('9 next + selected · 12 total', { exact: true }))
    .toBeVisible();
  const queueGap = queue.getByRole('separator', {
    name: '2 missions omitted before selected mission 12 of 12',
  });
  await expect(queueGap).toContainText('2 missions omitted');
  await expect(queueGap).toContainText('Selected 12 of 12');
  const fullSchedule = queue.getByRole('link', {
    name: 'View all 12 missions',
  });
  await expect(fullSchedule).toHaveAttribute('href', '/');
  expect((await fullSchedule.boundingBox())?.height).toBeGreaterThanOrEqual(44);

  const queueViewport = queue.locator('[data-watch-queue-scroll]');
  const queueMetrics = await queueViewport.evaluate((element) => ({
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
    viewportWidth: window.innerWidth,
  }));
  expect(queueMetrics.scrollHeight).toBeGreaterThan(queueMetrics.clientHeight);
  if (queueMetrics.viewportWidth >= 1024) {
    expect(queueMetrics.clientHeight).toBeGreaterThan(600);
  } else {
    expect(queueMetrics.clientHeight).toBeLessThanOrEqual(334);
  }

  for (const identity of [longMissionName, longProviderName]) {
    const text = queue.getByText(identity, { exact: true });
    await expect(text).toBeVisible();
    const textMetrics = await text.evaluate((element) => {
      const styles = getComputedStyle(element);
      return {
        clientHeight: element.clientHeight,
        clientWidth: element.clientWidth,
        scrollHeight: element.scrollHeight,
        scrollWidth: element.scrollWidth,
        textOverflow: styles.textOverflow,
        whiteSpace: styles.whiteSpace,
      };
    });
    expect(textMetrics.scrollWidth).toBeLessThanOrEqual(
      textMetrics.clientWidth + 1
    );
    expect(textMetrics.scrollHeight).toBeLessThanOrEqual(
      textMetrics.clientHeight + 1
    );
    expect(textMetrics.textOverflow).not.toBe('ellipsis');
    expect(textMetrics.whiteSpace).not.toBe('nowrap');
  }

  const finalMission = queue.getByRole('button', {
    name: /Queue mission 12/i,
  });
  const firstMission = queue.getByRole('button').first();
  await expect(firstMission).toHaveAttribute('tabindex', '-1');
  await expect(finalMission).toHaveAttribute('tabindex', '0');
  expect(
    await queue
      .getByRole('button')
      .evaluateAll((buttons) =>
        buttons.filter((button) => button.tabIndex === 0).length
      )
  ).toBe(1);

  expect(
    await queueViewport.evaluate((element) => element.scrollTop)
  ).toBeGreaterThan(0);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);

  await expect(page).toHaveURL(/\/watch\?id=ll2-demo-queue-12$/);
  await expect(
    page.getByRole('heading', { level: 2, name: 'Queue mission 12' })
  ).toBeVisible();
  await expect(finalMission).toHaveAttribute('tabindex', '0');

  await finalMission.focus();
  await finalMission.press('ArrowDown');
  await expect(firstMission).toBeFocused();
  await expect(page).toHaveURL(/\/watch\?id=ll2-demo-queue-1$/);
  await expect(firstMission).toHaveAttribute('tabindex', '0');
  await expect(queueGap).toHaveCount(0);

  const lastChronologicalMission = queue.getByRole('button', {
    name: /Queue mission 10/i,
  });
  await firstMission.press('End');
  await expect(lastChronologicalMission).toBeFocused();
  await expect(page).toHaveURL(/\/watch\?id=ll2-demo-queue-10$/);
  await expect(lastChronologicalMission).toHaveAttribute('tabindex', '0');
  expect(await expectNoHorizontalOverflow(page)).toBe(true);
});

test('watch keeps verified streams primary and offers a rocket visual on demand', async ({
  page,
}) => {
  await page.goto('/watch?id=ll2-demo-orbital-dawn');

  await expect(
    page.getByRole('link', { name: /Open provider stream.*new tab/i })
  ).toBeVisible();
  await expect(page.locator('figure[data-visual-kind]')).toHaveCount(0);
  const showVisual = page.getByRole('button', {
    name: 'Show rocket reference for Orbital Dawn',
  });
  await expect(showVisual).toHaveAttribute('aria-expanded', 'false');
  await showVisual.focus();
  await showVisual.press('Enter');
  const hideVisual = page.getByRole('button', {
    name: 'Hide rocket reference for Orbital Dawn',
  });
  await expect(hideVisual).toBeFocused();
  await expect(hideVisual).toHaveAttribute('aria-expanded', 'true');
  expect(
    await hideVisual.evaluate(
      (element) => element.getBoundingClientRect().height
    )
  ).toBeGreaterThanOrEqual(44);
  await expect(
    page.locator('figure[data-visual-kind="vehicle"]')
  ).toHaveCount(1);
  await expect(
    page
      .locator('figure[data-visual-kind="vehicle"]')
      .getByRole('img', {
        name: 'Vehicle reference image of Astra Nova launch vehicle',
      })
  ).toHaveAttribute('loading', 'lazy');
  expect(await expectNoHorizontalOverflow(page)).toBe(true);

  await page.route(
    '**/api/launches/ll2-demo-orbital-dawn',
    (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          launch: {
            ...UPCOMING_LAUNCHES[0],
            livestream: null,
            livestreams: null,
          },
          canonicalId: UPCOMING_LAUNCHES[0].id,
          meta: FEED_META,
        }),
      })
  );
  await page.goto('/watch?id=ll2-demo-orbital-dawn');

  await expect(
    page.getByRole('link', { name: /Open provider stream.*new tab/i })
  ).toHaveCount(0);
  const visual = page.locator('figure[data-visual-kind="vehicle"]');
  await expect(visual).toHaveCount(1);
  const visualImage = visual.getByRole('img', {
    name: 'Vehicle reference image of Astra Nova launch vehicle',
  });
  await expect(visualImage).toBeVisible();
  await expect(visualImage).toHaveAttribute('loading', 'eager');
  await expect(visualImage).toHaveAttribute('fetchpriority', 'high');
  await expect(
    visual.getByText(
      'Credit: LaunchWatch fixture · via LaunchWatch fixture',
      { exact: true }
    )
  ).toBeVisible();

  const queue = page.getByRole('complementary', { name: 'Next up' });
  const hierarchy = await queue.evaluate((element, visualElement) => {
    const queueBounds = element.getBoundingClientRect();
    const visualBounds = visualElement?.getBoundingClientRect();

    return {
      queueBottom: queueBounds.bottom,
      queueLeft: queueBounds.left,
      queueRight: queueBounds.right,
      queueTop: queueBounds.top,
      visualLeft: visualBounds?.left ?? 0,
      visualRight: visualBounds?.right ?? 0,
      visualTop: visualBounds?.top ?? 0,
      viewportWidth: window.innerWidth,
    };
  }, await visual.elementHandle());

  if (hierarchy.viewportWidth >= 1024) {
    expect(
      Math.abs(hierarchy.queueLeft - hierarchy.visualLeft)
    ).toBeLessThanOrEqual(1);
    expect(
      Math.abs(hierarchy.queueRight - hierarchy.visualRight)
    ).toBeLessThanOrEqual(1);
    expect(hierarchy.queueBottom).toBeLessThanOrEqual(hierarchy.visualTop);
  } else {
    expect(hierarchy.queueBottom).toBeLessThanOrEqual(hierarchy.visualTop);
  }

  expect(await expectNoHorizontalOverflow(page)).toBe(true);
});

test('watch keeps an unavailable mission visual secondary and compact', async ({
  page,
}) => {
  const launch = {
    ...UPCOMING_LAUNCHES[0],
    image: null,
    livestream: null,
    livestreams: null,
    vehicleVisual: undefined,
  };

  await page.route('**/api/launches?type=all', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        launches: [launch, UPCOMING_LAUNCHES[1]],
        meta: FEED_META,
      }),
    })
  );
  await page.route('**/api/launches/ll2-demo-orbital-dawn', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        launch,
        canonicalId: launch.id,
        meta: FEED_META,
      }),
    })
  );

  await page.goto('/watch?id=ll2-demo-orbital-dawn');

  const disclosure = page.getByRole('button', {
    name: 'Show mission visual for Orbital Dawn',
  });
  const intelligence = page.getByRole('region', {
    name: 'Mission intelligence',
  });

  await expect(disclosure).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByLabel('Mission visual unavailable')).toHaveCount(0);
  expect((await disclosure.boundingBox())?.height).toBeGreaterThanOrEqual(44);

  const hierarchy = await disclosure.evaluate((element, intelElement) => {
    const disclosureBounds = element.getBoundingClientRect();
    const intelligenceBounds = intelElement?.getBoundingClientRect();
    return {
      disclosureBottom: disclosureBounds.bottom,
      disclosureHeight: disclosureBounds.height,
      intelligenceTop: intelligenceBounds?.top ?? Number.POSITIVE_INFINITY,
    };
  }, await intelligence.elementHandle());

  expect(hierarchy.disclosureHeight).toBeLessThan(120);
  expect(hierarchy.disclosureBottom).toBeLessThanOrEqual(
    hierarchy.intelligenceTop
  );

  await disclosure.focus();
  await disclosure.press('Enter');
  const hideDisclosure = page.getByRole('button', {
    name: 'Hide mission visual for Orbital Dawn',
  });
  await expect(hideDisclosure).toBeFocused();
  await expect(page.getByLabel('Mission visual unavailable')).toBeVisible();
  await expect(
    page.getByText('Provider image not supplied', { exact: true })
  ).toBeVisible();
  expect(await expectNoHorizontalOverflow(page)).toBe(true);
});

test('watch prioritizes coverage intelligence before trajectory telemetry', async ({
  page,
}) => {
  await page.goto('/watch');

  const intelligence = page.getByRole('heading', {
    level: 2,
    name: 'Mission intelligence',
  });
  const trajectory = page.getByRole('heading', {
    level: 2,
    name: 'Mission trajectory',
  });
  await expect(intelligence).toBeVisible();
  await expect(trajectory).toBeVisible();

  const order = await Promise.all(
    [intelligence, trajectory].map((heading) =>
      heading.evaluate(
        (element) =>
          element.closest('section')?.getBoundingClientRect().top ??
          element.getBoundingClientRect().top
      )
    )
  );
  expect(order[0]).toBeLessThan(order[1]);

  const streamLead = page.getByRole('link', {
    name: 'Search official coverage',
  });
  await streamLead.focus();
  await expect(streamLead).toBeFocused();
  expect((await streamLead.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  expect(await expectNoHorizontalOverflow(page)).toBe(true);
});

test('watch identifies provider synchronization before mission data arrives', async ({
  page,
}) => {
  let releaseFeed: (() => void) | undefined;
  const feedGate = new Promise<void>((resolve) => {
    releaseFeed = resolve;
  });

  await page.route('**/api/launches?type=all', async (route) => {
    await feedGate;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        launches: UPCOMING_LAUNCHES,
        meta: FEED_META,
      }),
    });
  });

  await page.goto('/watch');

  await expect(page).toHaveTitle('Watch Launches | LaunchWatch');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Watch room' }),
  ).toBeVisible();
  await expect(
    page.getByRole('status').filter({
      hasText: 'Synchronizing mission queue and coverage channels.',
    }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', {
      level: 2,
      name: 'Acquiring mission coverage',
    }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { level: 2, name: 'Mission queue' }),
  ).toBeVisible();
  await expect(page.getByLabel('Synchronizing watch room')).toHaveAttribute(
    'aria-busy',
    'true',
  );
  await expect(page.locator('[aria-busy="true"]:visible')).toHaveCount(3);
  expect(
    await page
      .locator('h1, h2, h3, h4, h5, h6')
      .first()
      .evaluate((element) => element.tagName),
  ).toBe('H1');
  expect(await expectNoHorizontalOverflow(page)).toBe(true);

  releaseFeed?.();
  await expect(
    page.getByRole('heading', { level: 2, name: 'Orbital Dawn' }),
  ).toBeVisible();
  await expect(page).toHaveTitle('Orbital Dawn | Watch | LaunchWatch');
  await expect(page.getByLabel('Synchronizing watch room')).toHaveCount(0);
});

test('watch preloads approaching trajectory and keeps an offscreen keyboard path', async ({
  page,
}) => {
  await page.route(
    '**/api/launches/ll2-demo-orbital-dawn',
    (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          launch: {
            ...UPCOMING_LAUNCHES[0],
            livestream: null,
            livestreams: null,
          },
          canonicalId: UPCOMING_LAUNCHES[0].id,
          meta: FEED_META,
        }),
      })
  );
  await page.goto('/watch');

  const pendingTrajectory = page.locator('[data-trajectory-pending="true"]');
  const trajectoryMap = page.locator('[data-trajectory-map]');
  const trajectoryState = page.locator(
    '[data-trajectory-pending="true"], [data-trajectory-map]'
  );
  const mobile = test.info().project.name.startsWith('mobile');
  await expect(trajectoryState).toHaveCount(1);
  await expect.poll(() =>
    trajectoryState.evaluate((element) => {
      const pending = element.hasAttribute('data-trajectory-pending');
      const minimumTop = window.innerHeight + (pending ? 600 : 0);
      return element.getBoundingClientRect().top > minimumTop;
    })
  ).toBe(true);

  if ((await trajectoryMap.count()) === 1) {
    expect(await expectNoHorizontalOverflow(page)).toBe(true);
    return;
  }

  if (!mobile) {
    expect((await pendingTrajectory.boundingBox())?.height).toBeGreaterThanOrEqual(
      800
    );
    await expect(
      pendingTrajectory.locator('[data-trajectory-placeholder="true"]')
    ).toBeVisible();
  }

  await trajectoryState.scrollIntoViewIfNeeded();
  await expect(trajectoryMap).toHaveCount(1);

  if (!mobile) {
    expect(await expectNoHorizontalOverflow(page)).toBe(true);
    return;
  }

  await page.evaluate(() => {
    window.history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);
  });
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await page.reload({ waitUntil: 'networkidle' });
  await expect(pendingTrajectory).toBeVisible();
  await expect(trajectoryMap).toHaveCount(0);

  const pendingBounds = await pendingTrajectory.boundingBox();
  expect(pendingBounds).not.toBeNull();
  expect(pendingBounds!.height).toBeLessThanOrEqual(380);
  await expect(
    pendingTrajectory.locator('[data-trajectory-placeholder="true"]')
  ).toBeHidden();

  const loadButton = page.getByRole('button', {
    name: 'Load mission trajectory',
  });
  await loadButton.focus();
  await expect(loadButton).toBeFocused();
  expect((await loadButton.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  await expect(pendingTrajectory).toBeVisible();

  await loadButton.press('Enter');
  await expect(trajectoryMap).toHaveCount(1);
  await expect(
    page.getByRole('region', { name: 'Mission trajectory' })
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: /^(Mission focus|Focus)$/ })
  ).toBeFocused();
  expect(await expectNoHorizontalOverflow(page)).toBe(true);
});

test('trajectory and signal motion settles for reduced-motion users', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/watch');
  const trajectoryPath = page.locator('.trajectory-path-ascent');
  await expect
    .poll(() =>
      page.evaluate(() => {
        const heading = [...document.querySelectorAll('h2')].find(
          (element) => element.textContent?.trim() === 'Mission trajectory'
        );
        if (!heading) return false;

        heading.scrollIntoView({ block: 'center' });
        return true;
      })
    )
    .toBe(true);
  await expect(trajectoryPath).toHaveCount(1);

  const motion = await page.evaluate(() => {
    const animationName = (selector: string): string | null => {
      const element = document.querySelector(selector);
      return element ? getComputedStyle(element).animationName : null;
    };

    return {
      ascent: animationName('.trajectory-path-ascent'),
      orbit: animationName('.trajectory-path-orbit'),
      beacon: animationName('.trajectory-site-beacon'),
    };
  });

  expect(motion).toEqual({
    ascent: 'none',
    orbit: 'none',
    beacon: 'none',
  });
});

test('watch schedule retry reports progress and restores keyboard focus', async ({
  page,
}) => {
  let feedRequests = 0;
  await page.route('**/api/launches?type=all', async (route) => {
    feedRequests += 1;
    if (feedRequests === 1) {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Provider maintenance' }),
      });
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 800));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        launches: UPCOMING_LAUNCHES,
        meta: FEED_META,
      }),
    });
  });

  await page.goto('/watch');
  await expect(
    page.getByRole('heading', {
      name: 'The watch schedule is unavailable.',
    })
  ).toBeVisible();

  const retry = page.getByRole('button', {
    name: /Retry(?:ing watch schedule)?/,
  });
  await retry.focus();
  await retry.press('Enter');

  await expect(retry).toHaveAccessibleName('Retrying watch schedule');
  await expect(retry).toHaveAttribute('aria-disabled', 'true');
  await expect(retry).toHaveAttribute('aria-busy', 'true');
  await expect(retry).toBeFocused();
  const placement = await retry.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    const mobileNav = document.querySelector('nav.fixed.bottom-0');
    const navBounds = mobileNav?.getBoundingClientRect();
    const visibleBottom =
      navBounds && navBounds.height > 0 ? navBounds.top : window.innerHeight;

    return {
      fullyVisible: bounds.top >= 0 && bounds.bottom <= visibleBottom,
      height: bounds.height,
    };
  });
  expect(placement.fullyVisible).toBe(true);
  expect(placement.height).toBeGreaterThanOrEqual(44);

  await retry.press('Enter');
  expect(feedRequests).toBe(2);

  const missionLink = page
    .getByRole('heading', { level: 2, name: 'Orbital Dawn' })
    .locator('xpath=ancestor::a[1]');
  await expect(missionLink).toBeFocused();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Watch room' })
  ).toBeVisible();
  expect(await expectNoHorizontalOverflow(page)).toBe(true);
});

test('watch marks retained live coverage unconfirmed until refresh recovers', async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  const liveLaunch = {
    ...UPCOMING_LAUNCHES[1],
    status: 'live' as const,
    statusName: 'Live',
    isLive: true,
    webcastLive: true,
  };
  let feedRequests = 0;
  let recoverFeed = false;

  await page.unroute('**/api/launches**');
  await page.route('**/api/launches**', async (route) => {
    const url = new URL(route.request().url());

    if (url.pathname === '/api/launches') {
      feedRequests += 1;
      if (feedRequests > 1 && !recoverFeed) {
        await route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Provider maintenance' }),
        });
        return;
      }

      if (recoverFeed) {
        await new Promise((resolve) => setTimeout(resolve, 600));
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          launches: [liveLaunch, UPCOMING_LAUNCHES[0]],
          meta: FEED_META,
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        launch:
          decodeURIComponent(url.pathname.replace('/api/launches/', '')) ===
          liveLaunch.id
            ? liveLaunch
            : UPCOMING_LAUNCHES[0],
        canonicalId: decodeURIComponent(
          url.pathname.replace('/api/launches/', ''),
        ),
        meta: FEED_META,
      }),
    });
  });

  await page.goto('/watch');
  await expect(
    page.getByRole('region', { name: 'Mission coverage live' }),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Refresh now' }).click();

  const retainedNotice = page.getByRole('status').filter({
    hasText:
      'Refresh failed. Showing the last-known mission schedule. Live coverage is unconfirmed until the feed recovers.',
  });
  await expect(retainedNotice).toBeVisible();
  const unconfirmedCoverage = page.getByRole('region', {
    name: 'Mission coverage status unconfirmed',
  });
  await expect(unconfirmedCoverage).toBeVisible();
  await expect(unconfirmedCoverage.locator('iframe')).toHaveCount(0);
  await expect(page.getByText('Schedule status unconfirmed')).toBeVisible();
  const masthead = page.locator('.route-masthead');
  await expect(masthead).toHaveCount(1);
  await expect(masthead).toHaveClass(/signal-warm/);
  await expect(masthead).not.toHaveClass(/signal-live/);
  await expect(page.getByText('LIVE', { exact: true })).toHaveCount(0);

  const retry = retainedNotice.locator('button');
  await expect(retry).toHaveAccessibleName('Retry feed');
  expect((await retry.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  recoverFeed = true;
  await retry.focus();
  await retry.press('Enter');
  await expect(retry).toBeFocused();
  await expect(retry).toHaveAccessibleName('Retrying feed');
  await expect(retry).toHaveAttribute('aria-busy', 'true');

  const missionLink = page
    .getByRole('heading', { level: 2, name: liveLaunch.name })
    .locator('xpath=ancestor::a[1]');
  await expect(missionLink).toBeFocused();
  await expect(retainedNotice).toHaveCount(0);
  await expect(
    page.getByRole('region', { name: 'Mission coverage live' }),
  ).toBeVisible();
  await expect(masthead).toHaveClass(/signal-live/);
  expect(await expectNoHorizontalOverflow(page)).toBe(true);
  expect(
    consoleErrors.filter(
      (message) =>
        message !==
        'Failed to load resource: the server responded with a status of 503 (Service Unavailable)',
    ),
  ).toEqual([]);
  expect(consoleErrors).toHaveLength(1);
  expect(pageErrors).toEqual([]);
});

test('watch archive navigation is touch-safe and keyboard-operable', async ({
  page,
}) => {
  await page.goto('/watch');

  const archiveLink = page.getByRole('link', {
    name: 'Browse launch archive',
  });
  await expect(archiveLink).toBeVisible();
  await archiveLink.focus();
  await expect(archiveLink).toBeFocused();
  const placement = await archiveLink.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    const mobileNav = document.querySelector('nav.fixed.bottom-0');
    const navBounds = mobileNav?.getBoundingClientRect();
    const visibleBottom =
      navBounds && navBounds.height > 0 ? navBounds.top : window.innerHeight;

    return {
      fullyVisible:
        bounds.top >= 0 &&
        bounds.left >= 0 &&
        bounds.right <= window.innerWidth &&
        bounds.bottom <= visibleBottom,
      height: bounds.height,
    };
  });
  expect(placement.height).toBeGreaterThanOrEqual(44);
  expect(placement.fullyVisible).toBe(true);

  await archiveLink.press('Enter');
  await expect(page).toHaveURL(/\/history$/);
  await expect(
    page.getByRole('heading', { level: 1, name: 'Launch archive' })
  ).toBeVisible();
  expect(await expectNoHorizontalOverflow(page)).toBe(true);
});

test('watch does not show intelligence from the previously selected mission', async ({
  page,
}) => {
  let resolvePolarisRequest: ((route: Route) => void) | undefined;
  const polarisRequest = new Promise<Route>((resolve) => {
    resolvePolarisRequest = resolve;
  });

  await page.route('**/api/launch-intel**', async (route) => {
    const id = new URL(route.request().url()).searchParams.get('id');
    if (id === 'spacex-demo-polaris') {
      resolvePolarisRequest?.(route);
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ...LAUNCH_INTEL,
        summary: {
          ...LAUNCH_INTEL.summary,
          rationale: 'Signals for Orbital Dawn.',
        },
      }),
    });
  });

  await page.goto('/watch');
  await expect(page.getByText('Signals for Orbital Dawn.')).toBeVisible();

  await page.getByRole('button', { name: /Polaris Relay/i }).click();
  const pendingRoute = await polarisRequest;

  await expect(
    page.getByRole('heading', { level: 2, name: 'Polaris Relay' }),
  ).toBeVisible();
  await expect(
    page.getByRole('region', { name: 'Mission intelligence' }),
  ).toBeVisible();
  await expect(page.getByText('Signal acquisition')).toBeVisible();
  await expect(
    page.getByRole('status').filter({
      hasText: 'Correlating verified public coverage for Polaris Relay.',
    }),
  ).toBeVisible();
  await expect(
    page.getByRole('region', { name: 'Mission intelligence' }),
  ).toHaveAttribute('aria-busy', 'true');
  await expect(page.getByText('Signals for Orbital Dawn.')).toHaveCount(0);

  await pendingRoute.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      ...LAUNCH_INTEL,
      summary: {
        ...LAUNCH_INTEL.summary,
        rationale: 'Signals for Polaris Relay.',
      },
    }),
  });

  await expect(page.getByText('Signals for Polaris Relay.')).toBeVisible();
  expect(await expectNoHorizontalOverflow(page)).toBe(true);
});

test('mission intelligence recovers from an incomplete successful response', async ({
  page,
}) => {
  let retryStarted = false;
  let incompleteRequestCount = 0;
  let recoveryRequestCount = 0;
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.route('**/api/launch-intel**', async (route) => {
    if (retryStarted) {
      recoveryRequestCount += 1;
    } else {
      incompleteRequestCount += 1;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(
        retryStarted
          ? LAUNCH_INTEL
          : { meta: { generatedAt: '2035-07-26T12:00:00.000Z' } },
      ),
    });
  });

  await page.goto('/watch');

  const intelligence = page.getByRole('region', {
    name: 'Mission intelligence',
  });
  await expect(intelligence.getByRole('alert')).toContainText(
    'Mission intelligence response was incomplete',
  );
  await expect(
    intelligence.getByRole('button', { name: 'Retry coverage' }),
  ).toBeVisible();
  expect(incompleteRequestCount).toBeGreaterThan(0);
  expect(pageErrors).toEqual([]);

  retryStarted = true;
  await intelligence.getByRole('button', { name: 'Retry coverage' }).click();

  await expect(
    intelligence.getByRole('group', { name: 'Coverage signal' }),
  ).toBeVisible();
  expect(recoveryRequestCount).toBe(1);
  expect(pageErrors).toEqual([]);
  expect(await expectNoHorizontalOverflow(page)).toBe(true);
});

test('mission intelligence recovers without losing keyboard context', async ({
  page,
}) => {
  let retryStarted = false;
  let retryRequestCount = 0;
  let resolveRetry: ((route: Route) => void) | undefined;
  const retryRequest = new Promise<Route>((resolve) => {
    resolveRetry = resolve;
  });

  await page.route('**/api/launch-intel**', async (route) => {
    if (!retryStarted) {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Coverage provider maintenance' }),
      });
      return;
    }

    retryRequestCount += 1;
    resolveRetry?.(route);
  });

  await page.goto('/watch');

  const retry = page.getByRole('button', { name: 'Retry coverage' });
  await expect(retry).toBeVisible();
  await expect(
    page.getByRole('alert').filter({ hasText: 'Coverage signals could not be checked' })
  ).toContainText('Coverage provider maintenance');
  await retry.focus();
  retryStarted = true;
  await retry.press('Enter');

  const pendingRoute = await retryRequest;
  const retrying = page.getByRole('button', { name: 'Retrying coverage…' });
  await expect(retrying).toBeFocused();
  await expect(retrying).toHaveAttribute('aria-disabled', 'true');
  await expect(retrying).toHaveAttribute('aria-busy', 'true');
  await retrying.press('Enter');
  expect(retryRequestCount).toBe(1);

  const target = await retrying.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    return {
      height: bounds.height,
      width: bounds.width,
    };
  });
  expect(target.height).toBeGreaterThanOrEqual(44);
  expect(target.width).toBeGreaterThanOrEqual(44);

  await pendingRoute.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(LAUNCH_INTEL),
  });

  const restored = page.getByRole('region', { name: 'Mission intelligence' });
  await expect(restored).toBeFocused();
  await expect(
    restored.getByRole('group', { name: 'Coverage signal' })
  ).toBeVisible();
  expect(await expectNoHorizontalOverflow(page)).toBe(true);
});

test('mission intelligence honors the server recovery window', async ({
  page,
}) => {
  let requestCount = 0;

  await page.route('**/api/launch-intel**', async (route) => {
    requestCount += 1;
    await route.fulfill({
      status: 429,
      headers: { 'Retry-After': '600' },
      contentType: 'application/json',
      body: JSON.stringify({
        error: 'Too many intelligence requests. Try again later.',
      }),
    });
  });

  await page.goto('/watch');

  const waiting = page.getByRole('button', { name: 'Retry in 10m' });
  await expect(waiting).toBeVisible();
  await expect(waiting).toHaveAttribute('aria-disabled', 'true');
  await expect.poll(() => requestCount).toBeGreaterThanOrEqual(1);
  await page.waitForTimeout(100);
  const requestCountBeforeAttempt = requestCount;
  await waiting.focus();
  await waiting.press('Enter');
  await page.waitForTimeout(100);
  expect(requestCount).toBe(requestCountBeforeAttempt);

  const target = await waiting.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    return { height: bounds.height, width: bounds.width };
  });
  expect(target.height).toBeGreaterThanOrEqual(44);
  expect(target.width).toBeGreaterThanOrEqual(44);
  expect(await expectNoHorizontalOverflow(page)).toBe(true);
});

test('mission intelligence keeps generic search separate from stream leads', async ({
  page,
}) => {
  const searchUrl =
    'https://www.youtube.com/results?search_query=Orbital+Dawn+launch+livestream';
  await page.route('**/api/launch-intel**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ...LAUNCH_INTEL,
        summary: {
          streamState: 'search',
          recommendedLabel: 'Search YouTube',
          recommendedUrl: searchUrl,
          rationale:
            'Search fallback because no YouTube Data API key is configured.',
          lastUpdated: '2035-07-26T12:00:00.000Z',
        },
        streamCandidates: [
          {
            id: 'search-fallback',
            title: 'YouTube search fallback',
            url: searchUrl,
            channelTitle: 'YouTube',
            source: 'search',
            confidence: 'low',
            liveStatus: 'unknown',
          },
        ],
      }),
    })
  );

  await page.goto('/watch');

  const intelligence = page.getByRole('region', {
    name: 'Mission intelligence',
  });
  const search = intelligence.getByRole('link', { name: /Search YouTube.*new tab/i });
  const signal = intelligence.getByRole('group', { name: 'Coverage signal' });

  await expect(search).toHaveAttribute('href', searchUrl);
  await expect(
    intelligence.getByText(
      'Automatic stream verification is unavailable. Use the mission-specific search to check current coverage.'
    )
  ).toBeVisible();
  await expect(intelligence.getByText(/API key|configured/i)).toHaveCount(0);
  await expect(intelligence.getByText('Search fallback only')).toBeVisible();
  await expect(
    signal.getByText('Stream leads').locator('..').getByRole('definition')
  ).toHaveText('0');
  await expect(intelligence.getByText('YouTube search fallback')).toHaveCount(0);
  await expect(
    intelligence.getByText(/No verified broadcast has been ranked yet/)
  ).toBeVisible();
  await search.focus();
  await expect(search).toBeFocused();
  expect((await search.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  expect(await expectNoHorizontalOverflow(page)).toBe(true);
});

test('mission intelligence keeps complete stream identities contained', async ({
  page,
}) => {
  const streamTitle =
    'Polaris Relay Mission Official Launch Coverage and Preflight Briefing';
  const channelTitle = 'International Orbital Communications Directorate';

  await page.route('**/api/launch-intel**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ...LAUNCH_INTEL,
        summary: {
          ...LAUNCH_INTEL.summary,
          streamState: 'upcoming',
          recommendedLabel: 'Open official coverage',
          recommendedUrl: 'https://www.youtube.com/watch?v=official-test',
        },
        streamCandidates: [
          {
            id: 'official-test',
            title: streamTitle,
            url: 'https://www.youtube.com/watch?v=official-test',
            channelTitle,
            source: 'youtube-api',
            confidence: 'high',
            liveStatus: 'upcoming',
          },
        ],
      }),
    })
  );

  await page.goto('/watch');

  const intelligence = page.getByRole('region', {
    name: 'Mission intelligence',
  });
  const title = intelligence.getByText(streamTitle, { exact: true });
  const channel = intelligence.getByText(
    `${channelTitle} · high confidence`,
    { exact: true }
  );
  const stream = title.locator('xpath=ancestor::a');

  await stream.scrollIntoViewIfNeeded();
  await stream.focus();
  await expect(stream).toBeFocused();

  const geometry = await intelligence.evaluate((region, values) => {
    const findExactText = (value: string): HTMLElement | undefined =>
      Array.from(region.querySelectorAll<HTMLElement>('span')).find(
        (element) => element.textContent === value
      );
    const titleElement = findExactText(values.streamTitle);
    const channelElement = findExactText(
      `${values.channelTitle} · high confidence`
    );
    const streamElement = titleElement?.closest('a');
    const regionBounds = region.getBoundingClientRect();
    const streamBounds = streamElement?.getBoundingClientRect();

    return {
      regionContained: region.scrollWidth <= region.clientWidth + 1,
      streamContained: Boolean(
        streamBounds &&
          streamBounds.left >= regionBounds.left - 1 &&
          streamBounds.right <= regionBounds.right + 1
      ),
      targetHeight: streamBounds?.height ?? 0,
      titleComplete: Boolean(
        titleElement &&
          titleElement.scrollWidth <= titleElement.clientWidth + 1 &&
          titleElement.scrollHeight <= titleElement.clientHeight + 1
      ),
      channelComplete: Boolean(
        channelElement &&
          channelElement.scrollWidth <= channelElement.clientWidth + 1 &&
          channelElement.scrollHeight <= channelElement.clientHeight + 1
      ),
      titleWrapped: Boolean(
        titleElement &&
          titleElement.clientHeight >
            Number.parseFloat(getComputedStyle(titleElement).lineHeight) * 1.5
      ),
    };
  }, { streamTitle, channelTitle });

  expect(geometry).toMatchObject({
    regionContained: true,
    streamContained: true,
    titleComplete: true,
    channelComplete: true,
    titleWrapped: true,
  });
  expect(geometry.targetHeight).toBeGreaterThanOrEqual(44);
  expect(await expectNoHorizontalOverflow(page)).toBe(true);
  await expect(title).toBeVisible();
  await expect(channel).toBeVisible();
});

test('mission intelligence reveals every ranked signal on demand', async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  const streamCandidates = Array.from({ length: 5 }, (_, index) => ({
    id: `ranked-stream-${index + 1}`,
    title: `Ranked mission stream ${index + 1}`,
    url: `https://www.youtube.com/watch?v=ranked-stream-${index + 1}`,
    channelTitle: `Official channel ${index + 1}`,
    source: 'youtube-api',
    confidence: 'high',
    liveStatus: 'upcoming',
  }));
  const socialItems = Array.from({ length: 6 }, (_, index) => ({
    id: `community-signal-${index + 1}`,
    platform: 'reddit',
    title: `Community mission signal ${index + 1}`,
    url: `https://www.reddit.com/r/space/comments/community-signal-${index + 1}`,
    publishedAt: '2035-07-26T12:00:00.000Z',
    author: `observer-${index + 1}`,
    community: 'r/space',
    note: null,
  }));

  await page.route('**/api/launch-intel**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ...LAUNCH_INTEL,
        streamCandidates,
        socialItems,
      }),
    })
  );

  await page.goto('/watch');

  const intelligence = page.getByRole('region', {
    name: 'Mission intelligence',
  });
  const lastStream = intelligence.getByRole('link', {
    name: /Ranked mission stream 5/,
  });
  const lastSocial = intelligence.getByRole('link', {
    name: /Community mission signal 6/,
  });
  const showStreams = intelligence.getByRole('button', {
    name: 'Show all 5 stream leads',
  });

  await expect(lastStream).toHaveCount(0);
  await expect(lastSocial).toHaveCount(0);
  await showStreams.scrollIntoViewIfNeeded();
  await showStreams.focus();
  await showStreams.press('Enter');
  const hideStreams = intelligence.getByRole('button', {
    name: 'Show fewer stream leads',
  });
  await expect(hideStreams).toBeFocused();
  await expect(hideStreams).toHaveAttribute('aria-expanded', 'true');
  await expect(lastStream).toBeVisible();
  expect((await hideStreams.boundingBox())?.height).toBeGreaterThanOrEqual(44);

  const showSocial = intelligence.getByRole('button', {
    name: 'Show all 6 community signals',
  });
  await showSocial.scrollIntoViewIfNeeded();
  await showSocial.focus();
  await showSocial.press('Enter');
  const hideSocial = intelligence.getByRole('button', {
    name: 'Show fewer community signals',
  });
  await expect(hideSocial).toBeFocused();
  await expect(lastSocial).toBeVisible();
  expect((await hideSocial.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  expect(await expectNoHorizontalOverflow(page)).toBe(true);

  await hideSocial.press('Enter');
  await expect(showSocial).toBeFocused();
  await expect(lastSocial).toHaveCount(0);
  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test('watch recovers failed detail enrichment without reloading the schedule', async ({
  page,
}) => {
  let detailRequests = 0;
  let recoveryEnabled = false;
  let releaseRetry: (() => void) | undefined;
  const retryGate = new Promise<void>((resolve) => {
    releaseRetry = resolve;
  });
  await page.route(
    '**/api/launches/ll2-demo-orbital-dawn',
    async (route) => {
      detailRequests += 1;
      if (!recoveryEnabled) {
        return route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Detailed provider data unavailable' }),
        });
      }

      await retryGate;
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          launch: {
            ...UPCOMING_LAUNCHES[0],
            livestream: 'https://x.com/i/broadcasts/recovered-orbital-dawn',
          },
          canonicalId: UPCOMING_LAUNCHES[0].id,
          meta: FEED_META,
        }),
      });
    }
  );
  await page.goto('/watch');

  await expect(
    page.getByRole('heading', { name: 'Stream status unavailable' })
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Watch room' })
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { level: 2, name: 'Orbital Dawn' })
  ).toBeVisible();
  const retry = page.getByRole('button', {
    name: /^Retry(?:ing)? mission details$/,
  });
  const initialDetailRequests = detailRequests;
  await retry.focus();
  await expect(retry).toBeFocused();
  recoveryEnabled = true;
  await retry.click();

  await expect(
    page.getByRole('heading', { name: 'Checking stream status' })
  ).toBeVisible();
  await expect(retry).toHaveAttribute('aria-disabled', 'true');
  await expect(retry).toHaveAttribute('aria-busy', 'true');
  releaseRetry?.();
  await expect(
    page.getByRole('link', { name: /Open provider stream.*new tab/i })
  ).toBeVisible();
  await expect(
    page.getByRole('region', { name: 'Mission coverage scheduled' })
  ).toBeFocused();
  expect(detailRequests).toBe(initialDetailRequests + 1);
  await expect(
    page.getByRole('heading', { name: 'No live stream right now' })
  ).toHaveCount(0);
  expect(await expectNoHorizontalOverflow(page)).toBe(true);
});

test('watch preserves the settled mission after incomplete detail enrichment', async ({
  page,
}) => {
  await page.route(
    '**/api/launches/ll2-demo-orbital-dawn',
    (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          launch: { id: 'll2-demo-orbital-dawn' },
          canonicalId: 'll2-demo-orbital-dawn',
        }),
      })
  );
  await page.goto('/watch');

  await expect(
    page.getByRole('heading', { name: 'Stream status unavailable' })
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { level: 2, name: 'Orbital Dawn' })
  ).toBeVisible();
  await expect(page).toHaveTitle('Orbital Dawn | Watch | LaunchWatch');
  await expect(
    page.getByText(
      'The mission schedule is available, but detailed provider coverage could not be checked. Search for current coverage or retry mission details.'
    )
  ).toBeVisible();
  await expect(page.getByText('Mission response was incomplete')).toHaveCount(0);
  expect(await expectNoHorizontalOverflow(page)).toBe(true);
});

test('watch offers a touch-safe recovery from an unavailable deep link', async ({
  page,
}) => {
  await page.goto('/watch?id=ll2-unavailable-mission');

  const recoveryAlert = page
    .getByRole('alert')
    .filter({ hasText: 'The requested mission could not be opened.' });
  const clearDeepLink = recoveryAlert.getByRole('button', {
    name: 'Clear deep link',
  });

  await expect(
    recoveryAlert.getByText(
      'The requested mission could not be opened. Showing Orbital Dawn from the current queue instead.'
    )
  ).toBeVisible();
  await clearDeepLink.focus();
  await expect(clearDeepLink).toBeFocused();

  const recoveryTarget = await clearDeepLink.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    return {
      height: bounds.height,
      visible:
        bounds.top >= 0 &&
        bounds.left >= 0 &&
        bounds.right <= window.innerWidth &&
        bounds.bottom <= window.innerHeight,
    };
  });

  expect(recoveryTarget.height).toBeGreaterThanOrEqual(44);
  expect(recoveryTarget.visible).toBe(true);
  await clearDeepLink.press('Enter');

  await expect(page).toHaveURL(/\/watch$/);
  await expect(recoveryAlert).toHaveCount(0);
  await expect(
    page.getByRole('heading', { level: 2, name: 'Orbital Dawn' })
  ).toBeVisible();
  expect(await expectNoHorizontalOverflow(page)).toBe(true);
});

test('watch labels stream-search and provider-channel fallbacks truthfully', async ({
  page,
}) => {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  await page.route('**/api/launches/*', async (route) => {
    const id = decodeURIComponent(
      new URL(route.request().url()).pathname.replace('/api/launches/', '')
    );
    const launch = UPCOMING_LAUNCHES.find((candidate) => candidate.id === id);

    if (!launch) {
      await route.fallback();
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        launch: {
          ...launch,
          livestream: null,
          livestreams: null,
        },
        canonicalId: launch.id,
        meta: FEED_META,
      }),
    });
  });

  await page.goto('/watch');

  const searchFallback = page.getByRole('link', {
    name: /Search for stream.*new tab/i,
    exact: true,
  });
  await expect(searchFallback).toBeVisible();
  await expect(searchFallback).toHaveAttribute(
    'href',
    'https://www.youtube.com/results?search_query=Astra+Nova+Orbital+Dawn+launch+livestream'
  );
  await searchFallback.focus();
  await expect(searchFallback).toBeFocused();
  expect((await searchFallback.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  await expect(
    page.getByText(
      'No verified stream is scheduled yet. Search for current mission coverage while provider details are being updated.'
    )
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: /Open provider channel.*new tab/i, exact: true })
  ).toHaveCount(0);

  await page.getByRole('button', { name: /Polaris Relay/i }).click();

  const providerFallback = page.getByRole('link', {
    name: /Open provider channel.*new tab/i,
    exact: true,
  });
  await expect(providerFallback).toBeVisible();
  await expect(providerFallback).toHaveAttribute(
    'href',
    'https://www.youtube.com/@SpaceX/streams'
  );
  await expect(
    page.getByText(
      'We are between launches. Follow the next mission or use the official provider channel while coverage is being scheduled.'
    )
  ).toBeVisible();
  expect(await expectNoHorizontalOverflow(page)).toBe(true);
  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

test('briefing calendar options stay visible and restore trigger focus', async ({
  page,
}) => {
  await page.addInitScript(() => {
    class MockNotification {
      static permission: NotificationPermission = 'default';

      static async requestPermission(): Promise<NotificationPermission> {
        MockNotification.permission = 'granted';
        return 'granted';
      }
    }
    Object.defineProperty(window, 'Notification', {
      configurable: true,
      value: MockNotification,
    });
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async () => {
          throw new DOMException('Clipboard permission denied');
        },
      },
    });
  });
  await page.goto('/');

  await page.getByRole('button', { name: 'Open briefing' }).click();
  const dialog = page.getByRole('dialog', { name: /Orbital Dawn/i });
  const backgroundRoot = page.locator('body > :has(#main-content)');
  await expect(backgroundRoot).toHaveCount(1);
  await expect(backgroundRoot).toHaveAttribute('aria-hidden', 'true');
  await expect(backgroundRoot).toHaveAttribute('inert', '');
  await expect(
    page.getByRole('button', { name: 'Open briefing' })
  ).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Close mission briefing' })
  ).toHaveCount(1);
  await expect(dialog.getByText('Target time', { exact: true })).toBeVisible();
  await expect(
    dialog.getByText('Jul 28, 2035, 14:30 UTC', { exact: true })
  ).toBeVisible();
  await expect(dialog.getByText('Launch window', { exact: true })).toBeVisible();
  await expect(
    dialog.getByText('Jul 28, 2035, 14:30–16:30 UTC', { exact: true })
  ).toBeVisible();
  const calendarTrigger = dialog.getByRole('button', {
    name: 'Add launch to calendar',
  });

  await calendarTrigger.click();
  const calendarOptions = dialog.getByRole('group', {
    name: 'Calendar options',
  });
  const firstOption = calendarOptions.getByRole('button', {
    name: 'Google Calendar',
  });
  await expect(calendarOptions).toBeVisible();
  await expect(firstOption).toBeFocused();

  const alerts = calendarOptions.getByRole('button', {
    name: 'Enable browser launch alerts',
  });
  await alerts.focus();
  await alerts.press('Enter');
  const enabledAlerts = calendarOptions.getByRole('button', {
    name: 'Alerts enabled while app is open',
  });
  await expect(enabledAlerts).toBeFocused();
  await expect(enabledAlerts).toHaveAttribute('aria-disabled', 'true');
  await expect(enabledAlerts).not.toHaveAttribute('disabled', '');
  expect((await enabledAlerts.boundingBox())?.height).toBeGreaterThanOrEqual(44);

  const placement = await calendarOptions.evaluate((element) => {
    const options = element.getBoundingClientRect();
    const trigger = element.parentElement
      ?.querySelector('button[aria-label="Add launch to calendar"]')
      ?.getBoundingClientRect();

    return {
      fullyVisible:
        options.top >= 0 &&
        options.left >= 0 &&
        options.right <= window.innerWidth &&
        options.bottom <= window.innerHeight,
      aboveTrigger: Boolean(trigger && options.bottom <= trigger.top),
    };
  });

  expect(placement).toEqual({
    fullyVisible: true,
    aboveTrigger: true,
  });

  await enabledAlerts.press('Escape');
  await expect(calendarOptions).toHaveCount(0);
  await expect(dialog).toBeVisible();
  await expect(calendarTrigger).toBeFocused();

  await calendarTrigger.press('Enter');
  const copy = dialog.getByRole('button', {
    name: 'Copy launch details',
  });
  await copy.focus();
  await copy.press('Enter');

  const failedCopy = dialog.getByRole('button', {
    name: 'Copy failed — try again',
  });
  await expect(failedCopy).toBeFocused();
  await expect(failedCopy).toHaveAttribute('aria-disabled', 'false');
  await expect(failedCopy).toHaveAttribute('aria-busy', 'false');
  await expect(
    dialog.getByText(
      'Could not copy launch details. Try again or use a calendar option.'
    )
  ).toBeAttached();
  expect((await failedCopy.boundingBox())?.height).toBeGreaterThanOrEqual(44);

  await failedCopy.press('Escape');
  await expect(calendarOptions).toHaveCount(0);
  await expect(dialog).toBeVisible();
  await expect(calendarTrigger).toBeFocused();
  await dialog
    .getByRole('button', { name: 'Close mission briefing' })
    .click();
  await expect(dialog).toHaveCount(0);
  await expect(backgroundRoot).not.toHaveAttribute('aria-hidden');
  await expect(backgroundRoot).not.toHaveAttribute('inert');
  await expect(
    page.getByRole('button', { name: 'Open briefing' })
  ).toBeFocused();
  expect(await expectNoHorizontalOverflow(page)).toBe(true);
});

test('history search reaches a completed mission detail', async ({ page }) => {
  await page.goto('/history');

  await expect(
    page.getByRole('heading', { level: 1, name: 'Launch archive' })
  ).toBeVisible();
  const search = page.getByRole('searchbox', { name: 'Search missions' });
  const clearFilters = page.getByRole('button', {
    name: 'Clear archive filters',
  });

  await expect(clearFilters).toHaveCount(0);
  await search.fill('no matching mission');
  await expect(page).toHaveURL(/\/history\?q=no\+matching\+mission$/);
  const archiveResults = page.getByRole('status', {
    name: 'Archive results',
  });
  await expect(archiveResults).toHaveText('0 results');
  await expect(clearFilters).toBeEnabled();
  await expect(clearFilters).toContainText('Clear filters');
  expect((await clearFilters.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  await clearFilters.press('Enter');
  await expect(search).toHaveValue('');
  await expect(search).toBeFocused();
  await expect(page).toHaveURL(/\/history$/);
  await expect(archiveResults).toHaveText('2 results');
  await expect(clearFilters).toHaveCount(0);

  await search.fill('Return');

  await expect(page).toHaveURL(/\/history\?q=Return$/);
  await expect(page.getByText('Demo Return Flight')).toBeVisible();
  await expect(archiveResults).toHaveText('1 result');
  await page.reload();
  await expect(
    page.getByRole('searchbox', { name: 'Search missions' })
  ).toHaveValue('Return');
  await expect(archiveResults).toHaveText('1 result');
  const missionDetail = page.getByRole('link', { name: 'View mission' });
  await expect(missionDetail).toHaveCount(1);
  await expect(missionDetail).toHaveAttribute(
    'href',
    '/launch/spacex-demo-return?from=history&history=q%3DReturn'
  );
  await page.getByRole('button', { name: /Demo Return Flight/i }).click();
  await expect(
    page.getByText(/completed crew demonstration mission/i)
  ).toBeVisible();

  await missionDetail.click();

  await expect(page).toHaveURL(
    /\/launch\/spacex-demo-return\?from=history&history=q%3DReturn$/
  );
  await expect(
    page.getByRole('heading', { level: 1, name: 'Demo Return Flight' })
  ).toBeVisible();
  const returnLink = page.getByRole('link', {
    name: 'Back to filtered archive',
  });
  await expect(returnLink).toHaveAttribute(
    'href',
    '/history?q=Return&focus=spacex-demo-return',
  );
  await returnLink.focus();
  await returnLink.press('Enter');

  await expect(page).toHaveURL(/\/history\?q=Return$/);
  await expect(
    page.getByRole('searchbox', { name: 'Search missions' })
  ).toHaveValue('Return');
  await expect(archiveResults).toHaveText('1 result');
  expect(await expectNoHorizontalOverflow(page)).toBe(true);
});

test('history navigation clears same-route archive context', async ({ page }) => {
  await page.goto('/history?q=Return');

  const search = page.getByRole('searchbox', { name: 'Search missions' });
  const archiveResults = page.getByRole('status', {
    name: 'Archive results',
  });
  await expect(search).toHaveValue('Return');
  await expect(archiveResults).toHaveText('1 result');

  const navigation = page
    .getByRole('navigation', { name: 'Primary navigation' })
    .filter({ visible: true });
  const historyLink = navigation.getByRole('link', { name: 'History' });
  await historyLink.focus();
  await historyLink.press('Enter');

  await expect(page).toHaveURL(/\/history$/);
  await expect(search).toHaveValue('');
  await expect(archiveResults).toHaveText('2 results');
  await expect(historyLink).toBeFocused();

  await page.goBack();
  await expect(page).toHaveURL(/\/history\?q=Return$/);
  await expect(search).toHaveValue('Return');
  await expect(archiveResults).toHaveText('1 result');

  await page.goForward();
  await expect(page).toHaveURL(/\/history$/);
  await expect(search).toHaveValue('');
  await expect(archiveResults).toHaveText('2 results');
  expect(await expectNoHorizontalOverflow(page)).toBe(true);
});

test('schedule and archive search across mission profile data', async ({
  page,
}) => {
  await page.goto('/');

  await page.getByRole('button', { name: 'Filter' }).click();
  const scheduleSearch = page.getByRole('searchbox', {
    name: 'Search launches',
  });
  await expect(scheduleSearch).toHaveAttribute(
    'placeholder',
    'Mission, profile, orbit, vehicle, site, or provider',
  );
  await scheduleSearch.fill('communications low earth');

  await expect(
    page.getByRole('status', { name: 'Upcoming launch results' }),
  ).toHaveText('1 mission');
  await expect(
    page.getByRole('region', { name: 'Upcoming launches' }).getByText(
      'Orbital Dawn',
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    page.getByRole('region', { name: 'Upcoming launches' }).getByText(
      'Polaris Relay',
      { exact: true },
    ),
  ).toHaveCount(0);
  expect(await expectNoHorizontalOverflow(page)).toBe(true);

  await page.goto('/history');
  const archiveSearch = page.getByRole('searchbox', {
    name: 'Search missions',
  });
  await expect(archiveSearch).toHaveAttribute(
    'placeholder',
    'Mission, profile, orbit, vehicle, or site',
  );
  await archiveSearch.fill('crew demonstration low earth');

  await expect(
    page.getByRole('status', { name: 'Archive results' }),
  ).toHaveText('1 result');
  await expect(page.getByText('Demo Return Flight')).toBeVisible();
  await expect(page.getByText('Pathfinder Qualification')).toHaveCount(0);
  expect(await expectNoHorizontalOverflow(page)).toBe(true);
});

test('history keeps secondary filters compact on mobile', async ({ page }) => {
  await page.goto('/history');

  const search = page.getByRole('searchbox', { name: 'Search missions' });
  const archiveCoverage = page.getByLabel(/Archive feed coverage:/);
  const filterToggle = page.getByRole('button', {
    name: 'Show archive filters',
  });
  const provider = page.locator('select[id$="-provider"]');
  const year = page.locator('select[id$="-year"]');
  const outcome = page.locator('select[id$="-outcome"]');
  const chronology = page.locator('select[id$="-sort"]');
  const searchLabel = page.locator(`label[for="${await search.getAttribute('id')}"]`);
  const providerLabel = page.locator(`label[for="${await provider.getAttribute('id')}"]`);
  const yearLabel = page.locator(`label[for="${await year.getAttribute('id')}"]`);
  const outcomeLabel = page.locator(`label[for="${await outcome.getAttribute('id')}"]`);
  const chronologyLabel = page.locator(`label[for="${await chronology.getAttribute('id')}"]`);
  const mobile = test.info().project.name.startsWith('mobile');

  await expect(searchLabel).toHaveText('Search missions');
  await expect(searchLabel).toBeVisible();
  await expect(archiveCoverage).toContainText('Feed window');
  await expect(archiveCoverage).toContainText('Nov 5, 2024');
  await expect(archiveCoverage).toContainText('Apr 14, 2025');
  await expect(archiveCoverage.locator('time')).toHaveCount(2);

  if (!mobile) {
    await expect(filterToggle).toBeHidden();
    await expect(provider).toBeVisible();
    await expect(provider).toHaveAccessibleName('Provider');
    await expect(year).toHaveAccessibleName('Launch year');
    await expect(outcome).toHaveAccessibleName('Outcome');
    await expect(chronology).toHaveAccessibleName('Chronology');
    await expect(providerLabel).toBeVisible();
    await expect(yearLabel).toBeVisible();
    await expect(outcomeLabel).toBeVisible();
    await expect(chronologyLabel).toBeVisible();
    return;
  }

  await expect(filterToggle).toBeVisible();
  await expect(filterToggle).toHaveAttribute('aria-expanded', 'false');
  await expect(provider).toBeHidden();

  const firstMission = page.locator('article').first();
  const firstMissionBounds = await firstMission.boundingBox();
  expect(firstMissionBounds).not.toBeNull();
  expect(firstMissionBounds!.y).toBeLessThan(page.viewportSize()!.height);
  const coverageBounds = await archiveCoverage.boundingBox();
  expect(coverageBounds).not.toBeNull();
  expect(coverageBounds!.x).toBeGreaterThanOrEqual(0);
  expect(coverageBounds!.x + coverageBounds!.width).toBeLessThanOrEqual(
    page.viewportSize()!.width
  );

  await filterToggle.focus();
  await filterToggle.press('Enter');
  const hideFilterToggle = page.getByRole('button', {
    name: 'Hide archive filters',
  });
  await expect(hideFilterToggle).toBeFocused();
  await expect(hideFilterToggle).toHaveAttribute('aria-expanded', 'true');
  await expect(provider).toBeVisible();
  await expect(provider).toHaveAccessibleName('Provider');
  await expect(year).toHaveAccessibleName('Launch year');
  await expect(outcome).toHaveAccessibleName('Outcome');
  await expect(chronology).toHaveAccessibleName('Chronology');
  await expect(providerLabel).toBeVisible();
  await expect(yearLabel).toBeVisible();
  await expect(outcomeLabel).toBeVisible();
  await expect(chronologyLabel).toBeVisible();
  expect((await hideFilterToggle.boundingBox())?.height).toBeGreaterThanOrEqual(44);

  await provider.selectOption({ label: 'SpaceX' });
  await expect(page).toHaveURL(/\/history\?provider=SpaceX$/);
  await expect(hideFilterToggle).toContainText('1');

  await chronology.selectOption({ label: 'Oldest first' });
  await expect(page).toHaveURL(
    /\/history\?provider=SpaceX&sort=date-asc$/,
  );
  await expect(hideFilterToggle).toHaveAccessibleName(
    'Hide archive filters, 2 active',
  );
  await expect(hideFilterToggle).toContainText('2');
  expect(await expectNoHorizontalOverflow(page)).toBe(true);
});

test('history chronology reverses the visible feed window and survives detail return', async ({
  page,
}) => {
  await page.goto('/history?sort=date-asc');

  const chronology = page.locator('select[id$="-sort"]');
  const rows = page.locator('article');
  await expect(chronology).toHaveValue('date-asc');
  await expect(rows.first()).toContainText('Pathfinder Qualification');
  await expect(rows.last()).toContainText('Demo Return Flight');

  const oldestMission = rows.first().getByRole('link', {
    name: 'View mission',
  });
  await expect(oldestMission).toHaveAttribute(
    'href',
    '/launch/ll2-demo-pathfinder?from=history&history=sort%3Ddate-asc',
  );
  await oldestMission.click();

  const returnLink = page.getByRole('link', {
    name: 'Back to filtered archive',
  });
  await expect(returnLink).toHaveAttribute(
    'href',
    '/history?sort=date-asc&focus=ll2-demo-pathfinder',
  );
  await returnLink.click();
  await expect(chronology).toHaveValue('date-asc');
  await expect(rows.first()).toContainText('Pathfinder Qualification');
  expect(await expectNoHorizontalOverflow(page)).toBe(true);
});

test('history identifies and isolates unconfirmed mission outcomes', async ({
  page,
}) => {
  const pendingLaunch = {
    ...HISTORICAL_LAUNCHES[0],
    id: 'll2-demo-outcome-pending',
    sourceId: 'demo-outcome-pending',
    source: 'll2' as const,
    ll2Id: 'demo-outcome-pending',
    name: 'Past Window Mission',
    status: 'upcoming' as const,
    statusName: 'Go for Launch',
  };
  await page.route('**/api/launches?type=history&limit=100', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        launches: [HISTORICAL_LAUNCHES[0], pendingLaunch],
        meta: FEED_META,
      }),
    }),
  );

  await page.goto('/history?outcome=pending');

  const outcome = page.locator('select[id$="-outcome"]');
  const pendingRow = page.locator('article').filter({
    hasText: 'Past Window Mission',
  });
  await expect(outcome).toHaveValue('pending');
  await expect(pendingRow).toBeVisible();
  await expect(pendingRow).toContainText('Outcome unconfirmed');
  await expect(pendingRow).not.toContainText('Go for Launch');
  await expect(
    page.locator('article').filter({ hasText: 'Demo Return Flight' }),
  ).toHaveCount(0);
  expect(await expectNoHorizontalOverflow(page)).toBe(true);
});

test('home schedule filters survive mission detail navigation', async ({
  page,
}) => {
  await page.goto('/');

  await page.getByRole('button', { name: 'Filter' }).click();
  const search = page.getByRole('searchbox', { name: 'Search launches' });
  await search.fill('Polaris');

  const scheduleResults = page.getByRole('status', {
    name: 'Upcoming launch results',
  });
  await expect(page).toHaveURL(/\/?q=Polaris$/);
  await expect(scheduleResults).toHaveText('1 mission');
  const hideFilters = page.getByRole('button', {
    name: 'Hide filters, 1 active',
  });
  await expect(hideFilters).toContainText('1');
  await hideFilters.click();
  const collapsedFilters = page.getByRole('button', {
    name: 'Filter, 1 active',
  });
  await expect(collapsedFilters).toContainText('1');
  expect(
    (await collapsedFilters.boundingBox())?.height
  ).toBeGreaterThanOrEqual(44);
  await collapsedFilters.click();
  await page.reload();
  await expect(page).toHaveURL(/\/?q=Polaris$/);
  await expect(search).toHaveValue('Polaris');
  await expect(scheduleResults).toHaveText('1 mission');
  await expect(
    page.getByRole('button', { name: 'Hide filters, 1 active' })
  ).toBeVisible();

  const featuredMissionDetail = page.getByRole('link', {
    name: 'Orbital Dawn',
    exact: true,
  }).first();
  await expect(featuredMissionDetail).toHaveAttribute(
    'href',
    '/launch/ll2-demo-orbital-dawn?from=home&schedule=q%3DPolaris',
  );
  await featuredMissionDetail.focus();
  await featuredMissionDetail.press('Enter');
  await expect(page).toHaveURL(
    /\/launch\/ll2-demo-orbital-dawn\?from=home&schedule=q%3DPolaris$/,
  );
  const featuredReturnLink = page.getByRole('link', {
    name: 'Back to filtered schedule',
  });
  await expect(featuredReturnLink).toHaveAttribute(
    'href',
    '/?q=Polaris&focus=ll2-demo-orbital-dawn',
  );
  await featuredReturnLink.press('Enter');
  await expect(page).toHaveURL(/\/?q=Polaris$/);
  await expect(search).toHaveValue('Polaris');
  await expect(scheduleResults).toHaveText('1 mission');

  const missionDetail = page
    .getByRole('link')
    .filter({ hasText: 'Polaris Relay' });
  await expect(missionDetail).toHaveAttribute(
    'href',
    '/launch/spacex-demo-polaris?from=home&schedule=q%3DPolaris',
  );

  await missionDetail.focus();
  await missionDetail.press('Enter');
  await expect(page).toHaveURL(
    /\/launch\/spacex-demo-polaris\?from=home&schedule=q%3DPolaris$/,
  );
  const returnLink = page.getByRole('link', {
    name: 'Back to filtered schedule',
  });
  await expect(returnLink).toHaveAttribute(
    'href',
    '/?q=Polaris&focus=spacex-demo-polaris',
  );
  expect((await returnLink.boundingBox())?.height).toBeGreaterThanOrEqual(44);

  await returnLink.focus();
  await returnLink.press('Enter');

  await expect(page).toHaveURL(/\/?q=Polaris$/);
  await expect(search).toHaveValue('Polaris');
  await expect(scheduleResults).toHaveText('1 mission');
  await expect(
    page.getByRole('button', { name: 'Hide filters, 1 active' })
  ).toBeVisible();
  await expect(missionDetail).toBeVisible();
  expect(await expectNoHorizontalOverflow(page)).toBe(true);
});

test('history keeps long mission telemetry readable', async ({
  page,
}) => {
  const longMissionName =
    'Vega-C | Solar wind Magnetosphere Ionosphere Link Explorer (SMILE)';
  const longProviderName =
    'China Aerospace Science and Technology Corporation';
  const longVehicleName = 'Soyuz 2.1b/Fregat-M with extended fairing';
  const longSiteName =
    'Rocket Lab Launch Complex 2 (Launch Area 0 C), Wallops Island';
  const displayedSiteName =
    'Rocket Lab LC-2 (Launch Area 0 C) · Wallops Island';

  if ((page.viewportSize()?.width ?? 0) >= 1024) {
    await page.setViewportSize({ width: 1440, height: 900 });
  }

  await page.route('**/api/launches?type=history&limit=100', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        launches: [
          {
            ...HISTORICAL_LAUNCHES[0],
            name: longMissionName,
            provider: longProviderName,
            rocket: longVehicleName,
            launchSite: longSiteName,
          },
        ],
        meta: FEED_META,
      }),
    })
  );

  await page.goto('/history');

  const archiveRow = page.locator('article').filter({ hasText: longMissionName });
  const missionName = archiveRow.getByText(longMissionName, { exact: true });
  const providerName = archiveRow.getByText(longProviderName, { exact: true });
  const vehicleNames = archiveRow.getByText(longVehicleName, { exact: true });
  const siteNames = archiveRow.getByText(displayedSiteName, { exact: true });
  await expect(missionName).toBeVisible();
  await expect(providerName).toBeVisible();
  await expect(vehicleNames).toHaveCount(2);
  await expect(siteNames).toHaveCount(2);

  for (const content of [missionName, providerName, vehicleNames, siteNames]) {
    const layouts = await content.evaluateAll((elements) =>
      elements
        .filter((element) => element.getClientRects().length > 0)
        .map((element) => {
          const bounds = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          return {
            clientWidth: element.clientWidth,
            height: bounds.height,
            lineHeight: Number.parseFloat(style.lineHeight),
            scrollWidth: element.scrollWidth,
            textOverflow: style.textOverflow,
            whiteSpace: style.whiteSpace,
          };
        })
    );

    expect(layouts).toHaveLength(1);
    expect(layouts[0].scrollWidth).toBeLessThanOrEqual(
      layouts[0].clientWidth + 1
    );
    expect(layouts[0].textOverflow).not.toBe('ellipsis');
    expect(layouts[0].whiteSpace).toBe('normal');
  }

  const disclosure = archiveRow.getByRole('button');
  await disclosure.focus();
  await expect(disclosure).toBeFocused();
  expect((await disclosure.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  expect(await expectNoHorizontalOverflow(page)).toBe(true);
});

test('history identifies provider synchronization before archive results arrive', async ({
  page,
}) => {
  let releaseHistory: () => void = () => undefined;
  const historyGate = new Promise<void>((resolve) => {
    releaseHistory = resolve;
  });
  await page.route('**/api/launches?type=history&limit=100', async (route) => {
    await historyGate;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        launches: HISTORICAL_LAUNCHES,
        meta: FEED_META,
      }),
    });
  });

  await page.goto('/history');

  const loadingRegion = page.getByRole('region', {
    name: 'Synchronizing launch archive',
  });
  await expect(loadingRegion).toBeVisible();
  await expect(loadingRegion).toHaveAttribute('aria-busy', 'true');
  await expect(loadingRegion).toHaveAttribute(
    'aria-describedby',
    /-loading-description$/
  );
  await expect(
    loadingRegion.getByText(
      'Retrieving completed missions from connected providers.',
      { exact: true }
    )
  ).toBeVisible();
  await expect(
    loadingRegion.getByText('Acquiring records', { exact: true })
  ).toBeVisible();
  const layout = await loadingRegion.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    return {
      width: bounds.width,
      viewportWidth: window.innerWidth,
    };
  });
  expect(layout.width).toBeLessThanOrEqual(layout.viewportWidth);
  expect(await expectNoHorizontalOverflow(page)).toBe(true);

  releaseHistory();
  await expect(
    page.getByRole('searchbox', { name: 'Search missions' })
  ).toBeVisible();
  await expect(loadingRegion).toHaveCount(0);
});

test('history loads licensed mission imagery only after archive expansion', async ({
  page,
}) => {
  await page.goto('/history');

  const visuals = page.locator('figure[data-visual-kind]');
  await expect(visuals).toHaveCount(0);
  await expect(
    page.getByRole('img', {
      name: 'Mission image for Demo Return Flight mission',
    })
  ).toHaveCount(0);

  const returnMission = page
    .locator('article')
    .filter({ hasText: 'Demo Return Flight' });
  const disclosure = returnMission.getByRole('button', {
    name: /Demo Return Flight/i,
  });
  await disclosure.focus();
  await disclosure.press('Enter');
  await expect(disclosure).toHaveAttribute('aria-expanded', 'true');

  const visual = returnMission.locator(
    'figure[data-visual-kind="mission"]'
  );
  await expect(visual).toHaveCount(1);
  await expect(
    visual.getByRole('img', {
      name: 'Mission image for Demo Return Flight mission',
    })
  ).toBeVisible();
  await expect(
    visual.getByText('Mission imagery', { exact: true })
  ).toBeVisible();
  await expect(
    visual.getByText(
      'Credit: LaunchWatch fixture · via LaunchWatch fixture',
      { exact: true }
    )
  ).toBeVisible();
  expect(await expectNoHorizontalOverflow(page)).toBe(true);
});

test('history reveals replay coverage from canonical mission details', async ({
  page,
}) => {
  const summaryLaunches = HISTORICAL_LAUNCHES.map((launch, index) =>
    index === 0
      ? { ...launch, livestream: null, livestreams: null }
      : launch
  );
  let releaseDetail: () => void = () => undefined;
  const detailGate = new Promise<void>((resolve) => {
    releaseDetail = resolve;
  });
  await page.route('**/api/launches?type=history&limit=100', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ launches: summaryLaunches, meta: FEED_META }),
    })
  );
  await page.route('**/api/launches/spacex-demo-return', async (route) => {
    await detailGate;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        launch: HISTORICAL_LAUNCHES[0],
        canonicalId: HISTORICAL_LAUNCHES[0].id,
        meta: FEED_META,
      }),
    });
  });

  await page.goto('/history');

  const mission = page
    .locator('article')
    .filter({ hasText: 'Demo Return Flight' });
  const disclosure = mission.getByRole('button', {
    name: /Demo Return Flight/i,
  });
  await disclosure.focus();
  await disclosure.press('Enter');

  const checking = mission.getByRole('button', {
    name: 'Checking replay coverage',
  });
  await expect(checking).toBeVisible();
  await expect(checking).toHaveAttribute('aria-disabled', 'true');
  await expect(checking).toHaveAttribute('aria-busy', 'true');
  expect((await checking.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  await expect(
    mission.getByRole('link', { name: 'Watch replay' })
  ).toHaveCount(0);

  releaseDetail();

  const replay = mission.getByRole('link', { name: 'Watch replay' });
  await expect(replay).toHaveAttribute(
    'href',
    '/watch?id=spacex-demo-return'
  );
  await replay.focus();
  await expect(replay).toBeFocused();
  expect((await replay.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  expect(await expectNoHorizontalOverflow(page)).toBe(true);
});

test('history retry reports progress and restores keyboard focus', async ({
  page,
}) => {
  let retryStarted = false;
  let retryRequests = 0;
  let releaseHistory: () => void = () => undefined;
  const historyGate = new Promise<void>((resolve) => {
    releaseHistory = resolve;
  });
  await page.unroute('**/api/launches**');
  await page.route('**/api/launches**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname !== '/api/launches') {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Launch not found' }),
      });
      return;
    }
    if (url.searchParams.get('type') !== 'history') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          launches: UPCOMING_LAUNCHES,
          meta: FEED_META,
        }),
      });
      return;
    }

    if (!retryStarted) {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Provider maintenance' }),
      });
      return;
    }

    retryRequests += 1;
    await historyGate;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        launches: HISTORICAL_LAUNCHES,
        meta: FEED_META,
      }),
    });
  });

  await page.goto('/history');
  await expect(
    page.getByRole('heading', {
      name: 'The archive could not be synchronized.',
    })
  ).toBeVisible();

  const retry = page.getByRole('button', {
    name: /Retry(?:ing)? archive/,
  });
  await retry.focus();
  retryStarted = true;
  await retry.press('Enter');
  await expect.poll(() => retryRequests).toBe(1);

  await expect(retry).toHaveText('Retrying archive');
  await expect(retry).toHaveAttribute('aria-disabled', 'true');
  await expect(retry).toHaveAttribute('aria-busy', 'true');
  await expect(retry).toBeFocused();
  expect(
    await retry.evaluate((element) => element.getBoundingClientRect().height)
  ).toBeGreaterThanOrEqual(44);

  await retry.press('Enter');
  expect(retryRequests).toBe(1);
  releaseHistory();

  const search = page.getByRole('searchbox', { name: 'Search missions' });
  await expect(search).toBeFocused();
  await expect(page.getByText('Demo Return Flight')).toBeVisible();
  const placement = await search.evaluate((element) => {
    const control = element.getBoundingClientRect();
    const mobileNav = document.querySelector('nav.fixed.bottom-0');
    const navBounds = mobileNav?.getBoundingClientRect();
    const visibleBottom =
      navBounds && navBounds.height > 0 ? navBounds.top : window.innerHeight;

    return {
      fullyVisible:
        control.top >= 0 &&
        control.bottom <= visibleBottom,
      height: control.height,
    };
  });
  expect(placement.fullyVisible).toBe(true);
  expect(placement.height).toBeGreaterThanOrEqual(44);
  expect(await expectNoHorizontalOverflow(page)).toBe(true);
});

test('history refresh retains settled records through failure and recovery', async ({
  page,
}) => {
  let refreshStarted = false;
  let refreshRequests = 0;
  let pendingRefresh: Route | null = null;
  await page.route('**/api/launches?type=history&limit=100', async (route) => {
    if (!refreshStarted) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          launches: HISTORICAL_LAUNCHES,
          meta: FEED_META,
        }),
      });
      return;
    }
    refreshRequests += 1;
    pendingRefresh = route;
  });

  await page.goto('/history');
  const mission = page.getByText('Demo Return Flight');
  await expect(mission).toBeVisible();

  const refresh = page.getByRole('button', {
    name: /Refresh(?:ing)? archive/,
  });
  await refresh.focus();
  refreshStarted = true;
  await refresh.press('Enter');
  await expect.poll(() => refreshRequests).toBe(1);

  await expect(refresh).toHaveText('Refreshing archive');
  await expect(refresh).toHaveAttribute('aria-disabled', 'true');
  await expect(refresh).toHaveAttribute('aria-busy', 'true');
  await expect(refresh).toBeFocused();
  await expect(
    page.getByRole('region', { name: 'Archived launch results' })
  ).toHaveAttribute('aria-busy', 'true');
  await expect(mission).toBeVisible();
  expect((await refresh.boundingBox())?.height).toBeGreaterThanOrEqual(44);

  expect(pendingRefresh).not.toBeNull();
  await pendingRefresh!.fulfill({
    status: 503,
    contentType: 'application/json',
    body: JSON.stringify({ error: 'Provider maintenance' }),
  });
  pendingRefresh = null;

  await expect(
    page.getByRole('alert').filter({ hasText: 'Archive refresh failed.' })
  ).toBeVisible();
  await expect(refresh).toHaveText('Refresh archive');
  await expect(refresh).toBeFocused();
  await expect(mission).toBeVisible();

  await refresh.press('Enter');
  await expect.poll(() => refreshRequests).toBe(2);
  await expect(refresh).toHaveText('Refreshing archive');
  await expect(refresh).toBeFocused();
  expect(pendingRefresh).not.toBeNull();
  await pendingRefresh!.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      launches: HISTORICAL_LAUNCHES,
      meta: FEED_META,
    }),
  });

  await expect(
    page.getByRole('alert').filter({ hasText: 'Archive refresh failed.' })
  ).toHaveCount(0);
  await expect(refresh).toHaveText('Refresh archive');
  await expect(refresh).toBeFocused();
  await expect(mission).toBeVisible();
  expect(await expectNoHorizontalOverflow(page)).toBe(true);
});

test('history rejects incomplete successful refreshes without erasing settled records', async ({
  page,
}) => {
  let incompleteResponseEnabled = false;
  await page.route('**/api/launches?type=history&limit=100', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(
        incompleteResponseEnabled
          ? { meta: FEED_META }
          : { launches: HISTORICAL_LAUNCHES, meta: FEED_META }
      ),
    })
  );

  await page.goto('/history');
  const mission = page.getByText('Demo Return Flight');
  await expect(mission).toBeVisible();

  const refresh = page.getByRole('button', { name: 'Refresh archive' });
  await refresh.focus();
  incompleteResponseEnabled = true;
  await refresh.press('Enter');

  await expect(
    page.getByRole('alert').filter({ hasText: 'Archive refresh failed.' })
  ).toBeVisible();
  await expect(mission).toBeVisible();
  await expect(
    page.getByRole('heading', {
      name: 'No archived missions are available.',
    })
  ).toHaveCount(0);
  await expect(refresh).toBeFocused();
  expect((await refresh.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  expect(await expectNoHorizontalOverflow(page)).toBe(true);
});

test('history rejects invalid successful refreshes without erasing settled records', async ({
  page,
}) => {
  let invalidResponseEnabled = false;
  await page.route('**/api/launches?type=history&limit=100', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        launches: invalidResponseEnabled
          ? [
              {
                ...HISTORICAL_LAUNCHES[0],
                id: 'demo-return',
                sourceId: 'demo-return',
              },
            ]
          : HISTORICAL_LAUNCHES,
        meta: FEED_META,
      }),
    })
  );

  await page.goto('/history');
  const mission = page.getByText('Demo Return Flight');
  await expect(mission).toBeVisible();

  const refresh = page.getByRole('button', { name: 'Refresh archive' });
  await refresh.focus();
  invalidResponseEnabled = true;
  await refresh.press('Enter');

  await expect(
    page.getByRole('alert').filter({ hasText: 'Archive refresh failed.' })
  ).toBeVisible();
  await expect(mission).toBeVisible();
  await expect(page.getByRole('link', { name: 'View mission' }).first()).toHaveAttribute(
    'href',
    '/launch/spacex-demo-return?from=history'
  );
  await expect(refresh).toBeFocused();
  expect((await refresh.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  expect(await expectNoHorizontalOverflow(page)).toBe(true);
});

test('history partial provider state keeps one recovery command', async ({
  page,
}) => {
  await page.route('**/api/launches?type=history&limit=100', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        launches: HISTORICAL_LAUNCHES,
        meta: { ...FEED_META, partial: true },
      }),
    })
  );

  await page.goto('/history');

  await expect(
    page.getByText(
      'Some archive results may be delayed while a provider recovers. Use Refresh archive to check for recovered records.'
    )
  ).toBeVisible();
  const refresh = page.getByRole('button', { name: 'Refresh archive' });
  await expect(refresh).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Retry' })).toHaveCount(0);
  expect((await refresh.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  await refresh.focus();
  await refresh.press('Tab');
  await expect(
    page.getByRole('button', { name: /Demo Return Flight/ })
  ).toBeFocused();
  expect(await expectNoHorizontalOverflow(page)).toBe(true);
});

test('history identifies the bounded 100-mission feed window', async ({
  page,
}) => {
  const launches = Array.from({ length: 100 }, (_, index) => {
    const launch = HISTORICAL_LAUNCHES[index % HISTORICAL_LAUNCHES.length];
    return {
      ...launch,
      id: `${launch.id}-window-${index}`,
      sourceId: `${launch.sourceId}-window-${index}`,
      name: `Archive Window Mission ${index + 1}`,
    };
  });
  await page.route('**/api/launches?type=history&limit=100', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ launches, meta: FEED_META }),
    })
  );

  await page.goto('/history');

  const coverage = page.getByLabel(
    /Archive feed coverage: latest 100 missions/
  );
  await expect(coverage).toBeVisible();
  await expect(coverage).toContainText('Latest 100 missions');
  await expect(coverage).toContainText('Nov 5, 2024');
  await expect(coverage).toContainText('Apr 14, 2025');
  await expect(coverage.locator('time')).toHaveCount(2);
  const placement = await coverage.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    return {
      left: bounds.left,
      right: bounds.right,
      viewportWidth: window.innerWidth,
    };
  });
  expect(placement.left).toBeGreaterThanOrEqual(0);
  expect(placement.right).toBeLessThanOrEqual(placement.viewportWidth);
  expect(await expectNoHorizontalOverflow(page)).toBe(true);
});

test('history pagination reports progress and keeps terminal focus visible', async ({
  page,
}) => {
  const launches = Array.from({ length: 21 }, (_, index) => {
    const launch = HISTORICAL_LAUNCHES[index % HISTORICAL_LAUNCHES.length];
    return {
      ...launch,
      id: `${launch.id}-${index}`,
      sourceId: `${launch.sourceId}-${index}`,
      name: `Archive Mission ${index + 1}`,
    };
  });
  await page.route('**/api/launches?type=history&limit=100', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        launches,
        meta: FEED_META,
      }),
    })
  );

  await page.goto('/history');

  const archiveResults = page.getByRole('status', {
    name: 'Archive results',
  });
  await expect(archiveResults).toHaveText(
    'Showing 10 of 21 results'
  );
  const loadMore = page.locator('button[aria-controls$="-results"]');
  await expect(loadMore).toHaveText('Load 10 more');
  await loadMore.focus();
  await loadMore.press('Enter');
  await expect(archiveResults).toHaveText(
    'Showing 20 of 21 results'
  );
  await expect(loadMore).toBeFocused();
  await expect
    .poll(() =>
      loadMore.evaluate((element) => {
        const control = element.getBoundingClientRect();
        const mobileNav = document.querySelector('nav.fixed.bottom-0');
        const navBounds = mobileNav?.getBoundingClientRect();
        const visibleBottom =
          navBounds && navBounds.height > 0 ? navBounds.top : window.innerHeight;
        return control.top >= 0 && control.bottom <= visibleBottom;
      })
    )
    .toBe(true);

  await loadMore.press('Enter');
  await expect(archiveResults).toHaveText('21 results');
  await expect(loadMore).toHaveText('All 21 missions loaded');
  await expect(loadMore).toHaveAttribute('aria-disabled', 'true');
  await expect(loadMore).toBeFocused();

  const placement = await loadMore.evaluate((element) => {
    const control = element.getBoundingClientRect();
    const mobileNav = document.querySelector('nav.fixed.bottom-0');
    const navBounds = mobileNav?.getBoundingClientRect();
    const visibleBottom =
      navBounds && navBounds.height > 0 ? navBounds.top : window.innerHeight;

    return {
      fullyVisible: control.top >= 0 && control.bottom <= visibleBottom,
      height: control.height,
    };
  });

  expect(placement.fullyVisible).toBe(true);
  expect(placement.height).toBeGreaterThanOrEqual(44);
  await loadMore.press('Enter');
  await expect(page.locator('article')).toHaveCount(21);
  await expect(loadMore).toBeFocused();
  expect(await expectNoHorizontalOverflow(page)).toBe(true);
});

test('archive detail return restores the revealed mission result', async ({
  page,
}) => {
  const launches = Array.from({ length: 21 }, (_, index) => {
    const template = HISTORICAL_LAUNCHES[index % HISTORICAL_LAUNCHES.length];
    const restoreTarget = index === 15;
    const source = restoreTarget ? 'spacex' : template.source;
    const sourceId = restoreTarget
      ? 'demo-return'
      : `archive-return-${index + 1}`;
    const dateUnix = HISTORICAL_LAUNCHES[0].dateUnix - index;

    return {
      ...template,
      id: `${source}-${sourceId}`,
      source,
      sourceId,
      name: `Archive Return Mission ${index + 1}`,
      dateUnix,
      date: new Date(dateUnix * 1000).toISOString(),
    };
  });
  await page.route('**/api/launches?type=history&limit=100', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ launches, meta: FEED_META }),
    })
  );

  await page.goto('/history');
  const archive = page.getByRole('region', {
    name: 'Archived launch results',
  });
  await archive.getByRole('button', { name: 'Load 10 more' }).click();
  const targetRow = archive.locator('article').filter({
    hasText: 'Archive Return Mission 16',
  });
  const target = targetRow.getByRole('link', { name: 'View mission' });
  await expect(target).toBeVisible();
  await target.click();

  await page.getByRole('link', { name: 'Back to history' }).click();
  await expect(archive.locator('article')).toHaveCount(20);
  await expect(target).toBeFocused();
  expect(await expectNoHorizontalOverflow(page)).toBe(true);
});

test('detail routes render malformed IDs as noindex and canonicalize legacy links', async ({
  page,
}) => {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  await page.goto('/launch/not-a-provider-id');

  await expect(
    page.getByRole('heading', { name: 'This mission path is off course.' })
  ).toBeVisible();
  await expect(
    page.getByText(/belong in the completed-flight archive/i)
  ).toBeVisible();
  const recovery = page.getByRole('navigation', {
    name: 'Mission recovery',
  });
  const scheduleLink = recovery.getByRole('link', {
    name: 'View upcoming launches',
  });
  const archiveLink = recovery.getByRole('link', {
    name: 'Search launch archive',
  });
  await expect(scheduleLink).toHaveAttribute('href', '/');
  await expect(archiveLink).toHaveAttribute('href', '/history');
  for (const link of [scheduleLink, archiveLink]) {
    await link.focus();
    await expect(link).toBeFocused();
    expect((await link.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  }
  expect(await expectNoHorizontalOverflow(page)).toBe(true);
  await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute(
    'content',
    /noindex/
  );

  await page.goto('/launch/past-demo-return');

  await expect(page).toHaveURL(/\/launch\/spacex-demo-return$/);
  await expect(
    page.getByRole('heading', { level: 1, name: 'Demo Return Flight' })
  ).toBeVisible();
  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

test('mission descriptions preserve provider paragraphs and list structure', async ({
  page,
}) => {
  await page.goto('/launch/ll2-demo-orbital-dawn');

  const description = page.locator('[data-mission-description]').first();
  await expect(description.locator('p')).toHaveCount(2);
  await expect(description.getByText('Mission objectives:')).toBeVisible();
  await expect(description.getByRole('list')).toBeVisible();
  await expect(description.getByRole('listitem')).toHaveText([
    'Deploy the relay payload',
    'Validate the communications link',
  ]);
  expect(await expectNoHorizontalOverflow(page)).toBe(true);

  await page.getByRole('button', { name: 'Open briefing' }).click();
  const briefing = page.getByRole('dialog', { name: 'Orbital Dawn' });
  const briefingDescription = briefing.locator('[data-mission-description]');
  await expect(briefingDescription.locator('p')).toHaveCount(2);
  await expect(briefingDescription.getByRole('listitem')).toHaveCount(2);
});

test('mission sharing copies canonical links from watch and completed details', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (value: string) => {
          (
            window as Window & { __launchWatchSharedUrl?: string }
          ).__launchWatchSharedUrl = value;
        },
      },
    });
  });

  await page.goto('/watch');
  const compactShare = page.getByRole('button', { name: 'Share', exact: true });
  await compactShare.focus();
  await compactShare.press('Enter');
  const watchCopied = page.getByRole('button', { name: 'Link copied' });
  await expect(watchCopied).toBeFocused();
  expect((await watchCopied.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as Window & { __launchWatchSharedUrl?: string })
            .__launchWatchSharedUrl
      )
    )
    .toBe(`${new URL(page.url()).origin}/launch/ll2-demo-orbital-dawn`);

  await page.goto('/launch/spacex-demo-return?from=history');
  const detailShare = page.getByRole('button', { name: 'Share mission' });
  await detailShare.focus();
  await detailShare.press('Enter');
  await expect(
    page.getByRole('button', { name: 'Link copied' })
  ).toBeFocused();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as Window & { __launchWatchSharedUrl?: string })
            .__launchWatchSharedUrl
      )
    )
    .toBe(`${new URL(page.url()).origin}/launch/spacex-demo-return`);
  expect(await expectNoHorizontalOverflow(page)).toBe(true);
});

test('mission sharing exposes the canonical link when browser sharing is blocked', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: async () => {
        throw new DOMException('Share permission denied');
      },
    });
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async () => {
          throw new DOMException('Clipboard permission denied');
        },
      },
    });
  });

  await page.goto('/watch?id=ll2-demo-orbital-dawn');
  const share = page.getByRole('button', { name: 'Share', exact: true });
  await share.focus();
  await share.press('Enter');

  await expect(
    page.getByRole('button', { name: 'Retry share' })
  ).toBeFocused();
  const recoveryStatus = page.getByText(
    'Automatic sharing is unavailable. Select and copy the canonical link below.',
    { exact: true }
  );
  await expect(recoveryStatus).toHaveAttribute('role', 'status');
  const manualLink = page.getByRole('textbox', {
    name: 'Canonical mission link',
  });
  const recovery = page.locator('[data-share-recovery="true"]');
  const canonicalUrl = `${new URL(page.url()).origin}/launch/ll2-demo-orbital-dawn`;
  await expect(manualLink).toHaveValue(canonicalUrl);
  await manualLink.click();
  await expect(manualLink).toBeFocused();
  await expect
    .poll(() =>
      manualLink.evaluate((input) =>
        input instanceof HTMLInputElement
          ? input.value.slice(
              input.selectionStart ?? 0,
              input.selectionEnd ?? 0
            )
          : ''
      )
    )
    .toBe(canonicalUrl);
  expect((await manualLink.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  const [recoveryBounds, commandBounds, missionBounds] = await Promise.all([
    recovery.boundingBox(),
    page.locator('.compact-launch-actions').boundingBox(),
    page.getByRole('heading', { level: 2, name: 'Orbital Dawn' }).boundingBox(),
  ]);
  expect(recoveryBounds).not.toBeNull();
  expect(commandBounds).not.toBeNull();
  expect(missionBounds).not.toBeNull();
  const commandRailOverlapsMissionHeading = !(
    commandBounds!.x >= missionBounds!.x + missionBounds!.width ||
    commandBounds!.x + commandBounds!.width <= missionBounds!.x ||
    commandBounds!.y >= missionBounds!.y + missionBounds!.height ||
    commandBounds!.y + commandBounds!.height <= missionBounds!.y
  );
  expect(commandRailOverlapsMissionHeading).toBe(false);
  expect(await expectNoHorizontalOverflow(page)).toBe(true);
});

test('upcoming detail keeps mission commands in a touch-safe mobile console', async ({
  page,
}) => {
  test.skip(
    !test.info().project.name.startsWith('mobile'),
    'Mobile detail command layout'
  );

  await page.goto('/launch/ll2-demo-orbital-dawn');

  const findStream = page.getByRole('link', {
    name: /Find stream.*new tab/i,
    exact: true,
  });
  const briefing = page.getByRole('button', {
    name: 'Open briefing',
    exact: true,
  });
  const calendar = page.getByRole('button', {
    name: 'Add to calendar',
    exact: true,
  });
  const share = page.getByRole('button', {
    name: 'Share mission',
    exact: true,
  });
  const commands = [findStream, briefing, calendar, share];

  const bounds = await Promise.all(
    commands.map(async (command) => {
      await expect(command).toBeVisible();
      const box = await command.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.height).toBeGreaterThanOrEqual(44);
      return box!;
    })
  );

  expect(Math.abs(bounds[0].y - bounds[1].y)).toBeLessThan(2);
  expect(Math.abs(bounds[2].y - bounds[3].y)).toBeLessThan(2);
  expect(bounds[2].y).toBeGreaterThan(bounds[0].y + bounds[0].height - 2);
  expect(
    Math.max(...bounds.map((box) => box.width)) -
      Math.min(...bounds.map((box) => box.width))
  ).toBeLessThan(2);

  await calendar.focus();
  await calendar.press('Enter');
  const menu = page.getByRole('group', { name: 'Calendar options' });
  await expect(menu).toBeVisible();
  await expect(
    menu.getByRole('button', { name: 'Google Calendar' })
  ).toBeFocused();

  const placement = await menu.evaluate((element) => {
    const options = element.getBoundingClientRect();
    const trigger = element.parentElement
      ?.querySelector('button')
      ?.getBoundingClientRect();
    const mobileNav = Array.from(
      document.querySelectorAll('nav[aria-label="Primary navigation"]')
    )
      .map((navigation) => navigation.getBoundingClientRect())
      .find((bounds) => bounds.height > 0);

    return {
      insideViewport:
        options.top >= 0 &&
        options.left >= 0 &&
        options.right <= window.innerWidth,
      aboveTrigger: Boolean(trigger && options.bottom <= trigger.top),
      aboveNavigation: Boolean(
        !mobileNav || options.bottom <= mobileNav.top
      ),
    };
  });

  expect(placement).toEqual({
    insideViewport: true,
    aboveTrigger: true,
    aboveNavigation: true,
  });
  await page.keyboard.press('Escape');
  await expect(calendar).toBeFocused();
  expect(await expectNoHorizontalOverflow(page)).toBe(true);
});

test('watch exposes a labeled mobile mission command rail', async ({ page }) => {
  test.skip(
    !test.info().project.name.startsWith('mobile'),
    'Mobile command layout'
  );

  await page.goto('/watch');

  const briefing = page.getByRole('button', { name: 'Briefing', exact: true });
  const calendar = page.getByRole('button', { name: 'Calendar', exact: true });
  const share = page.getByRole('button', { name: 'Share', exact: true });
  const commands = [briefing, calendar, share];

  for (const command of commands) {
    await expect(command).toBeVisible();
    expect((await command.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  }

  const bounds = await Promise.all(commands.map((command) => command.boundingBox()));
  expect(bounds.every(Boolean)).toBe(true);
  expect(
    Math.max(...bounds.map((box) => box!.y)) -
      Math.min(...bounds.map((box) => box!.y))
  ).toBeLessThan(2);

  await calendar.focus();
  await calendar.press('Enter');
  const menu = page.getByRole('group', { name: 'Calendar options' });
  await expect(menu).toBeVisible();
  const menuBounds = await menu.boundingBox();
  expect(menuBounds).not.toBeNull();
  expect(menuBounds!.x).toBeGreaterThanOrEqual(0);
  expect(menuBounds!.x + menuBounds!.width).toBeLessThanOrEqual(
    page.viewportSize()?.width ?? 0
  );
  const mobileNavBounds = await page
    .locator('nav[aria-label="Primary navigation"]:visible')
    .boundingBox();
  expect(mobileNavBounds).not.toBeNull();
  expect(menuBounds!.y + menuBounds!.height).toBeLessThanOrEqual(
    mobileNavBounds!.y
  );
  await page.keyboard.press('Escape');
  await expect(calendar).toBeFocused();
  expect(await expectNoHorizontalOverflow(page)).toBe(true);
});

test('watch keeps a pending calendar explanation inside the mobile viewport', async ({
  page,
}) => {
  test.skip(
    !test.info().project.name.startsWith('mobile'),
    'Mobile pending calendar placement'
  );

  const estimatedLaunch = {
    ...UPCOMING_LAUNCHES[0],
    datePrecision: {
      name: 'Hour',
      abbrev: 'HR',
      description: 'The T-0 is accurate to the hour.',
    },
  };
  await page.route('**/api/launches?type=all', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        launches: [estimatedLaunch, UPCOMING_LAUNCHES[1]],
        meta: FEED_META,
      }),
    })
  );
  await page.route('**/api/launches/ll2-demo-orbital-dawn', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        launch: estimatedLaunch,
        canonicalId: estimatedLaunch.id,
        meta: FEED_META,
      }),
    })
  );

  await page.goto('/watch');

  const calendar = page.getByRole('button', { name: 'Calendar', exact: true });
  await calendar.focus();
  const pendingExplanation = page.locator(
    '[data-calendar-pending-tooltip="true"]'
  );
  await expect(calendar).toHaveAttribute('aria-disabled', 'true');
  await expect(pendingExplanation).toBeVisible();
  const pendingBounds = await pendingExplanation.boundingBox();
  expect(pendingBounds).not.toBeNull();
  expect(pendingBounds!.x).toBeGreaterThanOrEqual(0);
  expect(pendingBounds!.x + pendingBounds!.width).toBeLessThanOrEqual(
    page.viewportSize()?.width ?? 0
  );
  expect(await expectNoHorizontalOverflow(page)).toBe(true);

  await calendar.press('Enter');
  const menu = page.getByRole('group', { name: 'Calendar options' });
  await expect(menu).toHaveCount(0);
  expect(await expectNoHorizontalOverflow(page)).toBe(true);
});

test('detail defers intelligence acquisition until the panel approaches the viewport', async ({
  page,
}) => {
  let intelligenceRequests = 0;

  await page.route('**/api/launch-intel**', async (route) => {
    intelligenceRequests += 1;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(LAUNCH_INTEL),
    });
  });

  for (const detail of [
    {
      path: '/launch/ll2-demo-orbital-dawn',
      mission: 'Orbital Dawn',
    },
    {
      path: '/launch/spacex-demo-return',
      mission: 'Demo Return Flight',
    },
  ]) {
    const requestBaseline = intelligenceRequests;
    await page.goto(detail.path);
    await expect(
      page.getByRole('heading', { level: 1, name: detail.mission })
    ).toBeVisible();
    await page.waitForTimeout(250);
    expect(intelligenceRequests).toBe(requestBaseline);

    const standby = page.locator('[data-intelligence-standby="true"]');
    await expect(standby).toHaveAccessibleName('Mission intelligence');
    await expect(standby).toContainText('Acquisition on standby');
    const standbyPosition = await standby.evaluate((element) => ({
      top: element.getBoundingClientRect().top,
      viewportHeight: window.innerHeight,
    }));
    expect(standbyPosition.top).toBeGreaterThan(standbyPosition.viewportHeight);

    await standby.scrollIntoViewIfNeeded();
    await expect.poll(() => intelligenceRequests).toBe(requestBaseline + 1);
    await expect(
      page
        .getByRole('region', { name: 'Mission intelligence' })
        .getByRole('link', { name: 'Search official coverage' })
    ).toBeVisible();
    expect(intelligenceRequests).toBe(requestBaseline + 1);
    expect(await expectNoHorizontalOverflow(page)).toBe(true);
  }
});

test('narrow mission telemetry keeps every countdown label readable', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto('/launch/ll2-demo-orbital-dawn');

  const telemetry = page.getByRole('region', {
    name: 'Mission telemetry',
  });
  await expect(telemetry).toBeVisible();

  const countdownLayout = await telemetry.locator('time').evaluate((element) => ({
    display: (() => {
      const display = element.querySelector<HTMLElement>('.countdown-display');
      return {
        clientWidth: display?.clientWidth ?? 0,
        scrollWidth: display?.scrollWidth ?? 0,
      };
    })(),
    units: [
      ...element.querySelectorAll<HTMLElement>('.countdown-unit'),
    ].map((unit) => ({
      clientWidth: unit.clientWidth,
      scrollWidth: unit.scrollWidth,
    })),
  }));

  expect(countdownLayout.display.scrollWidth).toBeLessThanOrEqual(
    countdownLayout.display.clientWidth + 1
  );
  expect(
    countdownLayout.units.every(
      (unit) => unit.scrollWidth <= unit.clientWidth + 1
    )
  ).toBe(true);
  expect(await expectNoHorizontalOverflow(page)).toBe(true);
});

test('upcoming and historical details place one trajectory before mission support', async ({
  page,
}) => {
  const assertDetailTrajectory = async ({
    path,
    mission,
    hasTimeline,
    telemetryFirst,
    visualAlt,
  }: {
    path: string;
    mission: string;
    hasTimeline: boolean;
    telemetryFirst: boolean;
    visualAlt?: string;
  }): Promise<void> => {
    if (
      telemetryFirst &&
      !test.info().project.name.startsWith('mobile')
    ) {
      await page.setViewportSize({ width: 1024, height: 900 });
    }
    await page.goto(path);

    if (
      telemetryFirst &&
      !test.info().project.name.startsWith('mobile')
    ) {
      await page.addStyleTag({
        content: 'body { width: calc(100% - 8px); }',
      });
    }

    await expect(
      page.getByRole('heading', { level: 1, name: mission })
    ).toBeVisible();

    const trajectory = page.getByRole('region', {
      name: 'Mission trajectory',
    });
    await expect(trajectory).toHaveCount(1);
    await expect(trajectory).toBeVisible();
    const visual = page.locator('figure[data-visual-kind]');
    const unavailableVisual = page.getByLabel('Mission visual unavailable');
    const expectedVisual = visualAlt
      ? visual.getByRole('img', { name: visualAlt })
      : unavailableVisual;
    const telemetry = page.getByRole('region', {
      name: 'Mission telemetry',
    });
    await expect(telemetry).toHaveCount(1);
    await expect(telemetry).toBeVisible();

    if (visualAlt) {
      await expect(visual).toHaveCount(1);
      await expect(expectedVisual).toBeVisible();
      await expect(unavailableVisual).toHaveCount(0);
    } else {
      await expect(visual).toHaveCount(0);
      await expect(unavailableVisual).toHaveCount(1);
      await expect(unavailableVisual).toHaveAttribute(
        'data-visual-status',
        'missing'
      );
      await expect(
        unavailableVisual.getByText('Provider image not supplied', {
          exact: true,
        })
      ).toBeVisible();
      await expect(
        unavailableVisual.getByText('Source actions unavailable', {
          exact: true,
        })
      ).toBeVisible();
      await expect(
        unavailableVisual.locator('.mission-visual-placeholder-action')
      ).toHaveCount(0);
      const unavailableLayout = await unavailableVisual.evaluate((element) => {
        const caption = element.querySelector('.mission-visual-caption');
        return {
          cardHeight: element.getBoundingClientRect().height,
          captionHeight: caption?.getBoundingClientRect().height ?? 0,
        };
      });
      expect(unavailableLayout.captionHeight).toBeLessThan(120);
      expect(unavailableLayout.cardHeight).toBeLessThan(390);
    }
    if (telemetryFirst) {
      const countdown = telemetry.locator('time');
      await expect(countdown).toHaveCount(1);
      await expect(countdown.locator('.countdown-prefix')).toHaveText('≈T−');
      const countdownBounds = await countdown.boundingBox();
      expect(countdownBounds).not.toBeNull();
      expect(countdownBounds!.y).toBeLessThan(
        page.viewportSize()?.height ?? 0
      );
      const countdownLayout = await countdown.evaluate((element) => {
        const telemetry = element.closest<HTMLElement>(
          'section[aria-label="Mission telemetry"]'
        );
        const display = element.querySelector<HTMLElement>('.countdown-display');
        const units = [
          ...element.querySelectorAll<HTMLElement>('.countdown-unit'),
        ];

        return {
          displayRight: display?.getBoundingClientRect().right ?? 0,
          telemetryRight: telemetry?.getBoundingClientRect().right ?? 0,
          units: units.map((unit) => ({
            clientWidth: unit.clientWidth,
            scrollWidth: unit.scrollWidth,
          })),
        };
      });
      expect(countdownLayout.displayRight).toBeLessThanOrEqual(
        countdownLayout.telemetryRight + 1
      );
      expect(
        countdownLayout.units.every(
          (unit) => unit.scrollWidth <= unit.clientWidth + 1
        )
      ).toBe(true);
    }
    await expect(
      trajectory.locator('[data-trajectory-map]')
    ).toHaveCount(1);
    await expect(
      page.getByRole('region', { name: 'Mission intelligence' })
    ).toBeVisible();
    await page
      .getByRole('region', { name: 'Mission intelligence' })
      .scrollIntoViewIfNeeded();
    const intelligenceSearches = page
      .getByLabel('Mission intelligence searches')
      .getByRole('link');
    await expect(intelligenceSearches).toHaveCount(3);
    const searchTargets = await intelligenceSearches.evaluateAll((links) =>
      links.map((link) => {
        const bounds = link.getBoundingClientRect();
        return {
          height: bounds.height,
          width: bounds.width,
        };
      })
    );
    expect(searchTargets.every((target) => target.height >= 44)).toBe(true);
    expect(searchTargets.every((target) => target.width >= 44)).toBe(true);
    const finalSearch = intelligenceSearches.last();
    await finalSearch.focus();
    await expect(finalSearch).toBeFocused();
    if (hasTimeline) {
      const timeline = page.getByRole('region', { name: 'Launch timeline' });
      const timelineEvents = timeline.getByRole('list');

      await expect(timeline).toBeVisible();
      await expect(timelineEvents).toHaveAttribute('tabindex', '0');
      await expect(timelineEvents).toHaveAttribute(
        'aria-describedby',
        'launch-timeline-instructions launch-timeline-position'
      );
      const timelinePosition = timeline.getByRole('status', {
        name: 'Timeline position',
      });
      await expect(timelinePosition).toHaveText(/Events 1–\d+ of 10/);
      const initialTimelinePosition = await timelinePosition.textContent();

      const previousEvent = timeline.getByRole('button', {
        name: 'Previous timeline event',
      });
      const nextEvent = timeline.getByRole('button', {
        name: 'Next timeline event',
      });
      await expect(previousEvent).not.toHaveAttribute('disabled');
      await expect(previousEvent).toHaveAttribute('aria-disabled', 'true');
      await expect(previousEvent).toHaveAttribute('tabindex', '-1');
      await expect(nextEvent).not.toHaveAttribute('disabled');
      await expect(nextEvent).toHaveAttribute('aria-disabled', 'false');
      await expect(nextEvent).not.toHaveAttribute('tabindex');
      for (const control of [previousEvent, nextEvent]) {
        const bounds = await control.boundingBox();
        expect(bounds).not.toBeNull();
        expect(bounds!.height).toBeGreaterThanOrEqual(44);
        expect(bounds!.width).toBeGreaterThanOrEqual(44);
      }

      await nextEvent.focus();
      await nextEvent.press('Enter');
      await expect
        .poll(() => timelineEvents.evaluate((element) => element.scrollLeft))
        .toBeGreaterThan(0);
      await expect(previousEvent).not.toHaveAttribute('disabled');
      await expect(previousEvent).not.toHaveAttribute('tabindex');
      await expect(nextEvent).toBeFocused();
      await expect(timelinePosition).not.toHaveText(
        initialTimelinePosition ?? ''
      );

      await page.emulateMedia({ reducedMotion: 'reduce' });
      const timelineScrollWidth = await timelineEvents.evaluate((element) => ({
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
      }));
      const remainingSteps = Math.ceil(
        (timelineScrollWidth.scrollWidth -
          timelineScrollWidth.clientWidth -
          (await timelineEvents.evaluate((element) => element.scrollLeft))) /
          176
      );
      for (let step = 0; step < remainingSteps; step += 1) {
        await nextEvent.press('Enter');
      }
      await expect(nextEvent).toHaveAttribute('aria-disabled', 'true');
      await expect(nextEvent).toHaveAttribute('tabindex', '-1');
      await expect(nextEvent).toBeFocused();
      await expect(timelinePosition).toHaveText(/Events \d+–10 of 10/);
      const terminalScrollLeft = await timelineEvents.evaluate(
        (element) => element.scrollLeft
      );
      await nextEvent.press('Enter');
      await expect(nextEvent).toBeFocused();
      await expect
        .poll(() => timelineEvents.evaluate((element) => element.scrollLeft))
        .toBe(terminalScrollLeft);

      await timelineEvents.focus();
      await expect(timelineEvents).toBeFocused();
      await timelineEvents.press('ArrowRight');
      await expect
        .poll(() =>
          timelineEvents.evaluate((element) => element.scrollLeft)
        )
        .toBeGreaterThan(0);
      await expect(
        timeline.getByText('T−02:35:00', { exact: true })
      ).toBeVisible();
      await expect(timeline).not.toContainText('-P0D');

      await page.getByRole('button', { name: 'Open briefing' }).click();
      const briefing = page.getByRole('dialog', { name: mission });
      await expect(
        briefing.getByText('T−02:35:00', { exact: true })
      ).toBeVisible();
      await expect(briefing).not.toContainText('-P0D');
      const briefingTimeline = briefing.getByRole('region', {
        name: 'Launch timeline',
      });
      await expect(briefingTimeline.getByRole('listitem')).toHaveCount(8);
      await expect(
        briefingTimeline.getByText('Payload deployment', { exact: true })
      ).toHaveCount(0);
      const revealTimeline = briefingTimeline.getByRole('button', {
        name: 'Show all 10 timeline events',
      });
      await revealTimeline.focus();
      await expect(revealTimeline).toBeFocused();
      expect((await revealTimeline.boundingBox())?.height).toBeGreaterThanOrEqual(
        44
      );
      await revealTimeline.press('Enter');
      await expect(briefingTimeline.getByRole('listitem')).toHaveCount(10);
      await expect(
        briefingTimeline.getByText('Payload deployment', { exact: true })
      ).toBeVisible();
      await expect(
        briefingTimeline.getByRole('button', {
          name: 'Show first 8 timeline events',
        })
      ).toHaveAttribute('aria-expanded', 'true');
      expect(await expectNoHorizontalOverflow(page)).toBe(true);
      await briefing
        .getByRole('button', { name: 'Close mission briefing' })
        .click();
      await expect(briefing).toHaveCount(0);
    }

    const order = await page.evaluate(() => {
      const mapSection = document.querySelector(
        'section[aria-labelledby$="-mission-trajectory-title"]'
      );
      const timelineSection = document.querySelector(
        'section[aria-labelledby="launch-timeline-title"]'
      );
      const intelSection = document.querySelector(
        'section[aria-labelledby="mission-intelligence-title"]'
      );
      const visualElement = document.querySelector(
        'figure[data-visual-kind], [aria-label="Mission visual unavailable"]'
      );
      const telemetrySection = document.querySelector(
        'section[aria-label="Mission telemetry"]'
      );
      const appearsBefore = (
        first: Element | null,
        second: Element | null
      ): boolean | null =>
        first && second
          ? Boolean(
              first.compareDocumentPosition(second) &
                Node.DOCUMENT_POSITION_FOLLOWING
            )
          : null;

      return {
        telemetryBeforeVisual: appearsBefore(telemetrySection, visualElement),
        visualBeforeMap: appearsBefore(visualElement, mapSection),
        mapBeforeTimeline: appearsBefore(mapSection, timelineSection),
        mapBeforeIntel: appearsBefore(mapSection, intelSection),
      };
    });

    expect(order.telemetryBeforeVisual).toBe(telemetryFirst);
    expect(order.visualBeforeMap).toBe(true);
    expect(order.mapBeforeIntel).toBe(true);
    expect(order.mapBeforeTimeline).toBe(hasTimeline ? true : null);
    expect(await expectNoHorizontalOverflow(page)).toBe(true);
  };

  await assertDetailTrajectory({
    path: '/launch/ll2-demo-hour-estimate',
    mission: 'Orbital Dawn',
    hasTimeline: true,
    telemetryFirst: true,
    visualAlt: 'Vehicle reference image of Astra Nova launch vehicle',
  });
  await assertDetailTrajectory({
    path: '/launch/spacex-demo-return',
    mission: 'Demo Return Flight',
    hasTimeline: false,
    telemetryFirst: false,
  });
});

test('mission details replace provider description placeholders with an honest pending state', async ({
  page,
}) => {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  await page.goto('/launch/ll2-demo-pending-briefing');

  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Pending Briefing Mission',
    })
  ).toBeVisible();
  const pendingDescription = page
    .locator('#main-content')
    .getByText('Mission description pending from the provider.', {
      exact: true,
    });
  await expect(pendingDescription).toBeVisible();
  await expect(page.getByText('Details TBD.', { exact: true })).toHaveCount(0);
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    'content',
    'Pending Briefing Mission launch details, schedule, provider coverage, and mission intelligence.'
  );

  const openBriefing = page.getByRole('button', { name: 'Open briefing' });
  await openBriefing.focus();
  await openBriefing.press('Enter');
  const briefing = page.getByRole('dialog', {
    name: 'Pending Briefing Mission',
  });
  await expect(
    briefing.getByRole('button', { name: 'Close mission briefing' })
  ).toBeFocused();
  await expect(
    briefing.getByText(
      'The provider has not supplied a full mission description.',
      { exact: true }
    )
  ).toBeVisible();
  await expect(briefing.getByText('Details TBD.', { exact: true })).toHaveCount(0);
  expect(await expectNoHorizontalOverflow(page)).toBe(true);
  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

test('mission trajectory keeps modeled phases in frame and restores focus', async ({
  page,
}) => {
  await page.goto('/');

  const mapDisclosure = page.locator(
    'button[aria-controls="mobile-mission-map"]:visible'
  );
  const expandButton = page.getByRole('button', {
    name: /illustrative trajectory map/i,
  });

  if ((page.viewportSize()?.width ?? 0) < 1024) {
    await expect(mapDisclosure).toBeVisible();
    await expect(mapDisclosure).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('[data-trajectory-map]')).toHaveCount(0);
    await expect(
      page.getByRole('region', { name: 'Mission trajectory' })
    ).toHaveCount(0);

    const disclosureTop = await mapDisclosure.boundingBox();
    const scheduleTop = await page
      .getByRole('region', { name: 'Upcoming launches' })
      .boundingBox();
    expect(disclosureTop).not.toBeNull();
    expect(scheduleTop).not.toBeNull();
    expect(scheduleTop!.y).toBeLessThan(disclosureTop!.y);

    await mapDisclosure.click();
    await expect(mapDisclosure).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('[data-trajectory-map]')).toHaveCount(1);
    const expandedDisclosureTop = await mapDisclosure.boundingBox();
    const mapTop = await page
      .getByRole('region', { name: 'Mission trajectory' })
      .boundingBox();
    expect(expandedDisclosureTop).not.toBeNull();
    expect(mapTop).not.toBeNull();
    expect(expandedDisclosureTop!.y).toBeLessThan(mapTop!.y);
    await expect(page.locator('[aria-label$=" UTC"]').first()).toBeVisible();
  } else {
    await expect(page.locator('[data-trajectory-map]')).toHaveCount(1);
  }

  await expect(expandButton).toBeVisible();
  await expect(
    page
      .locator('p:visible')
      .filter({ hasText: /not vehicle telemetry or a planned flight path/i })
      .first()
  ).toBeVisible();
  await expect(
    page.getByRole('list', { name: 'Trajectory model legend' })
  ).toBeVisible();

  const map = page.locator('[data-trajectory-map]:visible').first();
  const overlaysInFrame = await map.evaluate((element) => {
    const svg = element as SVGSVGElement;
    const viewBox = svg.viewBox.baseVal;
    const overlays = [
      ...svg.querySelectorAll<SVGGraphicsElement>(
        '[data-trajectory-phase], [data-trajectory-label], [data-trajectory-marker]'
      ),
    ].filter((overlay) => getComputedStyle(overlay).display !== 'none');
    const svgBounds = svg.getBoundingClientRect();
    const legend = svg.parentElement?.querySelector<HTMLElement>(
      '[aria-label="Trajectory model legend"]'
    );
    const legendBounds = legend?.getBoundingClientRect();

    return {
      overlays: overlays.map((overlay) => {
        const box = overlay.getBBox();
        const inset = overlay.hasAttribute('data-trajectory-phase') ? 10 : 2;
        return {
          id:
            overlay.getAttribute('data-trajectory-phase') ||
            overlay.getAttribute('data-trajectory-label') ||
            overlay.getAttribute('data-trajectory-marker'),
          contained:
            box.x - inset >= viewBox.x &&
            box.y - inset >= viewBox.y &&
            box.x + box.width + inset <= viewBox.x + viewBox.width &&
            box.y + box.height + inset <= viewBox.y + viewBox.height,
        };
      }),
      legendContained:
        !legendBounds ||
        (legendBounds.left >= svgBounds.left &&
          legendBounds.top >= svgBounds.top &&
          legendBounds.right <= svgBounds.right &&
          legendBounds.bottom <= svgBounds.bottom),
    };
  });

  expect(overlaysInFrame.overlays).toEqual(
    expect.arrayContaining([
      {
        id: 'ascent-model',
        contained: true,
      },
      {
        id: 'target-orbit-model',
        contained: true,
      },
      {
        id: 'reported-launch-site',
        contained: true,
      },
    ])
  );
  expect(
    overlaysInFrame.overlays.every((overlay) => overlay.contained)
  ).toBe(true);
  expect(overlaysInFrame.legendContained).toBe(true);
  expect(await expectNoHorizontalOverflow(page)).toBe(true);

  await expandButton.click();
  const dialog = page.getByRole('dialog', { name: /Orbital Dawn/i });
  const closeButton = dialog.getByRole('button', {
    name: 'Close full trajectory map',
  });

  await expect(dialog).toBeVisible();
  await expect(closeButton).toBeFocused();
  await expect(closeButton).toHaveCSS('width', '44px');

  const zoomIn = dialog.getByRole('button', { name: 'Zoom map in' });
  await zoomIn.focus();
  await zoomIn.press('Enter');
  await zoomIn.press('Enter');
  await expect(zoomIn).toBeFocused();
  await expect(zoomIn).toHaveAttribute('aria-disabled', 'true');
  await expect(zoomIn).not.toHaveAttribute('disabled', '');
  await expect(dialog.getByRole('status')).toHaveText(
    'Map zoom level 3 of 3.'
  );
  await zoomIn.press('Enter');
  await expect(zoomIn).toBeFocused();

  await closeButton.click();
  await expect(expandButton).toBeFocused();
});

test('expanded trajectory keeps long mission context readable', async ({
  page,
}) => {
  const missionName =
    'Falcon 9 Block 5 | BlueBird 11-13 (Block 2 #6-8)';
  const launch = {
    ...UPCOMING_LAUNCHES[0],
    name: missionName,
    missionName,
  };

  await page.route('**/api/launches?type=all', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        launches: [launch, UPCOMING_LAUNCHES[1]],
        meta: FEED_META,
      }),
    })
  );
  await page.route('**/api/launches/ll2-demo-orbital-dawn', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        launch,
        canonicalId: launch.id,
        meta: FEED_META,
      }),
    })
  );

  await page.goto('/');
  if ((page.viewportSize()?.width ?? 0) < 1024) {
    await page
      .locator('button[aria-controls="mobile-mission-map"]:visible')
      .click();
  }

  await page
    .getByRole('button', { name: 'Enlarge illustrative trajectory map' })
    .click();
  const dialog = page.getByRole('dialog', { name: missionName });
  const title = dialog.getByRole('heading', { name: missionName });
  const closeButton = dialog.getByRole('button', {
    name: 'Close full trajectory map',
  });

  await expect(dialog).toBeVisible();
  await expect(title).toBeVisible();
  await expect(closeButton).toBeFocused();
  const geometry = await title.evaluate((element) => {
    const styles = getComputedStyle(element);
    const bounds = element.getBoundingClientRect();
    return {
      bottom: bounds.bottom,
      clientWidth: element.clientWidth,
      lineHeight: Number.parseFloat(styles.lineHeight),
      overflow: styles.overflow,
      scrollWidth: element.scrollWidth,
      textOverflow: styles.textOverflow,
      top: bounds.top,
      whiteSpace: styles.whiteSpace,
    };
  });
  const closeBounds = await closeButton.boundingBox();

  expect(geometry.textOverflow).not.toBe('ellipsis');
  expect(geometry.whiteSpace).toBe('normal');
  expect(geometry.overflow).not.toBe('hidden');
  expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth + 1);
  if ((page.viewportSize()?.width ?? 0) < 1024) {
    expect(geometry.bottom - geometry.top).toBeGreaterThan(
      geometry.lineHeight * 1.5
    );
  }
  expect(closeBounds).not.toBeNull();
  expect(closeBounds!.x + closeBounds!.width).toBeLessThanOrEqual(
    page.viewportSize()?.width ?? 0
  );
  expect(await expectNoHorizontalOverflow(page)).toBe(true);
});

test('archive stays usable at the desktop-tablet boundary', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 900 });
  await page.goto('/history');

  await expect(
    page.getByRole('heading', { level: 1, name: 'Launch archive' })
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'View mission' }).first()).toBeVisible();
  const firstRow = page.locator('article').first();
  for (const label of ['Date (UTC)', 'Vehicle', 'Site', 'Outcome']) {
    await expect(firstRow.getByText(label, { exact: true })).toBeVisible();
  }
  expect(await expectNoHorizontalOverflow(page)).toBe(true);
});
