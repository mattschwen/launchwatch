import { expect, test, type Route } from '@playwright/test';
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

test('brand wordmark stays legible and tappable in the header', async ({ page }) => {
  await page.goto('/');

  const homeLink = page.getByRole('link', { name: 'LaunchWatch home' });
  await expect(homeLink).toBeVisible();

  const metrics = await homeLink.evaluate((element) => {
    const linkBox = element.getBoundingClientRect();
    const wordmark = element.querySelector('span');

    return {
      imageCount: element.querySelectorAll('img').length,
      linkHeight: linkBox.height,
      wordmark: wordmark?.textContent?.trim(),
      wordmarkSize: wordmark
        ? Number.parseFloat(getComputedStyle(wordmark).fontSize)
        : 0,
    };
  });

  expect(metrics.imageCount).toBe(0);
  expect(metrics.linkHeight).toBeGreaterThanOrEqual(44);
  expect(metrics.wordmark).toBe('LaunchWatch');
  expect(metrics.wordmarkSize).toBeGreaterThanOrEqual(20);
  await expect(page.locator('link[rel~="icon"][href="/favicon.ico"]')).toHaveCount(
    1
  );
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
    await link.focus();
    await expect(link).toBeFocused();
    expect(
      await link.evaluate((element) => element.getBoundingClientRect().height)
    ).toBeGreaterThanOrEqual(44);
  }

  expect(await expectNoHorizontalOverflow(page)).toBe(true);
});

test('featured mission telemetry stays legible in the split layout', async ({
  page,
}) => {
  await page.route('**/api/launches?type=all', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        launches: [
          {
            ...UPCOMING_LAUNCHES[0],
            rocket: 'Long March 6A',
            launchSite:
              "Taiyuan Satellite Launch Center, People's Republic of China",
            missionType: null,
            orbit: null,
          },
          ...UPCOMING_LAUNCHES.slice(1),
        ],
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
    };
  });

  expect(layout.columns).toBe(2);
  expect(layout.narrowestCell).toBeGreaterThanOrEqual(
    (page.viewportSize()?.width ?? 0) >= 1024 ? 220 : 120
  );
  await expect(
    telemetry.getByText('Long March 6A', { exact: true })
  ).toBeVisible();
  expect(await expectNoHorizontalOverflow(page)).toBe(true);
});

test('footer actions clear mobile navigation and preserve refresh focus', async ({
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
  const source = page.getByRole('link', { name: 'Source' });
  await expect(refresh).toHaveText('Refresh now');
  await refresh.focus();

  const placement = await Promise.all(
    [refresh, source].map((control) =>
      control.evaluate((element) => {
        const bounds = element.getBoundingClientRect();
        const mobileNav = document.querySelector('nav.fixed.bottom-0');
        const navBounds = mobileNav?.getBoundingClientRect();
        const visibleBottom =
          navBounds && navBounds.height > 0 ? navBounds.top : window.innerHeight;

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
  await page.goto('/');

  await expect(
    page.getByRole('heading', { name: 'Orbital Dawn' }).first()
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Upcoming launches' })
  ).toBeVisible();

  await page.getByRole('button', { name: 'Filter' }).click();
  const provider = page.getByRole('combobox', { name: 'Provider' });
  await expect(provider.getByRole('option')).toHaveText([
    'All providers',
    'Demo Launch Alliance',
    'SpaceX',
  ]);
  const search = page.getByRole('searchbox', { name: 'Search launches' });
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
  await provider.selectOption({ label: 'Demo Launch Alliance' });
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
  await expect(
    page.getByRole('status', { name: 'Upcoming launch results' })
  ).toHaveText('1 mission');

  await expect(
    page.getByRole('heading', { name: 'Polaris Relay' })
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Orbital Dawn' })
  ).toHaveCount(1);

  const toolbarClear = page.getByRole('button', {
    name: 'Clear launch filters',
  });
  await toolbarClear.focus();
  await toolbarClear.press('Enter');
  await expect(search).toHaveValue('');
  await expect(search).toBeFocused();
  await expect(toolbarClear).toBeDisabled();
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

  await expect(page).toHaveURL(/\/launch\/spacex-demo-polaris$/);
  await expect(
    page.getByRole('heading', { level: 1, name: 'Polaris Relay' })
  ).toBeVisible();
  expect(await expectNoHorizontalOverflow(page)).toBe(true);
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
  await heroRetry.focus();
  await heroRetry.press('Enter');

  for (const retry of [heroRetry, listRetry]) {
    await expect(retry).toHaveAccessibleName('Retrying schedule');
    await expect(retry).toHaveAttribute('aria-disabled', 'true');
    await expect(retry).toHaveAttribute('aria-busy', 'true');
  }
  await expect(heroRetry).toBeFocused();
  expect(
    await heroRetry.evaluate((element) => element.getBoundingClientRect().height)
  ).toBeGreaterThanOrEqual(44);

  await heroRetry.press('Enter');
  expect(feedRequests).toBe(2);

  await expect(
    page.getByRole('heading', { name: 'Upcoming launches' })
  ).toBeVisible();
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
    page.getByRole('link', { name: 'Open provider stream' })
  ).toHaveAttribute(
    'href',
    'https://x.com/i/broadcasts/demo-orbital-dawn'
  );
  await expect(
    page.getByRole('heading', { name: 'No live stream right now' })
  ).toHaveCount(0);
  await expect(
    page.getByRole('heading', { level: 1, name: 'Watch room' })
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { level: 2, name: 'Orbital Dawn' })
  ).toBeVisible();
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
  await polarisQueueItem.focus();
  await expect(polarisQueueItem).toBeFocused();
  await polarisQueueItem.press('Enter');

  await expect(page).toHaveURL(/\/watch\?id=spacex-demo-polaris$/);
  await expect(
    page.getByRole('heading', { level: 2, name: 'Polaris Relay' })
  ).toBeVisible();
  await expect(watchTrajectory).toContainText('Polaris Relay');
  await expect(polarisQueueItem).toBeFocused();
  expect(await expectNoHorizontalOverflow(page)).toBe(true);
});

test('trajectory and signal motion settles for reduced-motion users', async ({
  page,
}) => {
  await page.goto('/watch');
  await expect(page.locator('.trajectory-path-ascent')).toHaveCount(1);

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
    page.getByRole('region', { name: 'Loading mission intelligence' }),
  ).toBeVisible();
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

test('watch keeps the schedule usable when detail enrichment fails', async ({
  page,
}) => {
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

  await expect(
    page.getByRole('heading', { name: 'Stream status unavailable' })
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Watch room' })
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { level: 2, name: 'Orbital Dawn' })
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'No live stream right now' })
  ).toHaveCount(0);
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
    name: 'Search for stream',
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
    page.getByRole('link', { name: 'Open provider channel', exact: true })
  ).toHaveCount(0);

  await page.getByRole('button', { name: /Polaris Relay/i }).click();

  const providerFallback = page.getByRole('link', {
    name: 'Open provider channel',
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

  await firstOption.press('Escape');
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

  await expect(clearFilters).toBeDisabled();
  await search.fill('no matching mission');
  await expect(page.getByRole('status')).toHaveText('0 results');
  await expect(clearFilters).toBeEnabled();
  await clearFilters.press('Enter');
  await expect(search).toHaveValue('');
  await expect(search).toBeFocused();
  await expect(page.getByRole('status')).toHaveText('2 results');
  await expect(clearFilters).toBeDisabled();

  await search.fill('Return');

  await expect(page.getByText('Demo Return Flight')).toBeVisible();
  await expect(page.getByRole('status')).toHaveText('1 result');
  await page.getByRole('button', { name: /Demo Return Flight/i }).click();
  await expect(
    page.getByText(/completed crew demonstration mission/i)
  ).toBeVisible();

  await page
    .getByRole('link', { name: 'View mission' })
    .first()
    .click();

  await expect(page).toHaveURL(/\/launch\/spacex-demo-return$/);
  await expect(
    page.getByRole('heading', { level: 1, name: 'Demo Return Flight' })
  ).toBeVisible();
  expect(await expectNoHorizontalOverflow(page)).toBe(true);
});

test('history retry reports progress and restores keyboard focus', async ({
  page,
}) => {
  let historyRequests = 0;
  await page.route('**/api/launches?type=history&limit=100', async (route) => {
    historyRequests += 1;
    if (historyRequests === 1) {
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
  await retry.press('Enter');

  await expect(retry).toHaveText('Retrying archive');
  await expect(retry).toHaveAttribute('aria-disabled', 'true');
  await expect(retry).toHaveAttribute('aria-busy', 'true');
  await expect(retry).toBeFocused();
  expect(
    await retry.evaluate((element) => element.getBoundingClientRect().height)
  ).toBeGreaterThanOrEqual(44);

  await retry.press('Enter');
  expect(historyRequests).toBe(2);

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

test('history pagination reports progress and keeps terminal focus visible', async ({
  page,
}) => {
  const launches = Array.from({ length: 41 }, (_, index) => {
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

  await expect(page.getByRole('status')).toHaveText(
    'Showing 20 of 41 results'
  );
  const loadMore = page.locator('button[aria-controls$="-results"]');
  await expect(loadMore).toHaveText('Load 20 more');
  await loadMore.focus();
  await loadMore.press('Enter');
  await expect(page.getByRole('status')).toHaveText(
    'Showing 40 of 41 results'
  );
  await expect(loadMore).toBeFocused();

  await loadMore.press('Enter');
  await expect(page.getByRole('status')).toHaveText('41 results');
  await expect(loadMore).toHaveText('All 41 missions loaded');
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
  await expect(page.locator('article')).toHaveCount(41);
  await expect(loadMore).toBeFocused();
  expect(await expectNoHorizontalOverflow(page)).toBe(true);
});

test('detail routes render malformed IDs as noindex and canonicalize legacy links', async ({
  page,
}) => {
  await page.goto('/launch/not-a-provider-id');

  await expect(
    page.getByRole('heading', { name: 'This mission path is off course.' })
  ).toBeVisible();
  await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute(
    'content',
    /noindex/
  );

  await page.goto('/launch/past-demo-return');

  await expect(page).toHaveURL(/\/launch\/spacex-demo-return$/);
  await expect(
    page.getByRole('heading', { level: 1, name: 'Demo Return Flight' })
  ).toBeVisible();
});

test('upcoming and historical details place one trajectory before mission support', async ({
  page,
}) => {
  const assertDetailTrajectory = async ({
    path,
    mission,
    hasTimeline,
  }: {
    path: string;
    mission: string;
    hasTimeline: boolean;
  }): Promise<void> => {
    await page.goto(path);

    await expect(
      page.getByRole('heading', { level: 1, name: mission })
    ).toBeVisible();

    const trajectory = page.getByRole('region', {
      name: 'Mission trajectory',
    });
    await expect(trajectory).toHaveCount(1);
    await expect(trajectory).toBeVisible();
    await expect(
      trajectory.locator('[data-trajectory-map]')
    ).toHaveCount(1);
    await expect(
      page.getByRole('region', { name: 'Mission intelligence' })
    ).toBeVisible();
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
        'launch-timeline-instructions'
      );

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
        mapBeforeTimeline: appearsBefore(mapSection, timelineSection),
        mapBeforeIntel: appearsBefore(mapSection, intelSection),
      };
    });

    expect(order.mapBeforeIntel).toBe(true);
    expect(order.mapBeforeTimeline).toBe(hasTimeline ? true : null);
    expect(await expectNoHorizontalOverflow(page)).toBe(true);
  };

  await assertDetailTrajectory({
    path: '/launch/ll2-demo-orbital-dawn',
    mission: 'Orbital Dawn',
    hasTimeline: true,
  });
  await assertDetailTrajectory({
    path: '/launch/spacex-demo-return',
    mission: 'Demo Return Flight',
    hasTimeline: false,
  });
});

test('mission trajectory keeps modeled phases in frame and restores focus', async ({
  page,
}) => {
  await page.goto('/');

  const mapDisclosure = page.locator(
    'button[aria-controls="mobile-mission-map"]'
  );
  const expandButton = page.getByRole('button', {
    name: /illustrative trajectory map/i,
  });

  if ((page.viewportSize()?.width ?? 0) < 1024) {
    await expect(mapDisclosure).toBeVisible();
    await expect(mapDisclosure).toHaveAttribute('aria-expanded', 'false');
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
    const expandedDisclosureTop = await mapDisclosure.boundingBox();
    const mapTop = await page
      .getByRole('region', { name: 'Mission trajectory' })
      .boundingBox();
    expect(expandedDisclosureTop).not.toBeNull();
    expect(mapTop).not.toBeNull();
    expect(expandedDisclosureTop!.y).toBeLessThan(mapTop!.y);
    await expect(page.locator('[aria-label$=" UTC"]').first()).toBeVisible();
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
