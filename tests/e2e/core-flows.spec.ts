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

test('home shows one truthful licensed visual with touch-safe attribution actions', async ({
  page,
}) => {
  await page.goto('/');

  const primaryAction = page.getByRole('link', {
    name: 'Find stream',
    exact: true,
  });
  const briefingAction = page.getByRole('button', {
    name: 'Open briefing',
    exact: true,
  });
  const visuals = page.locator('figure[data-visual-kind]');
  await expect(visuals).toHaveCount(1);

  const visual = visuals.first();
  const hierarchy = await primaryAction.evaluate((element) => {
    const visual = element
      .closest('section')
      ?.querySelector('figure[data-visual-kind]');
    const actionBounds = element.getBoundingClientRect();
    const visualBounds = visual?.getBoundingClientRect();

    return {
      actionBottom: actionBounds.bottom,
      actionTop: actionBounds.top,
      visualTop: visualBounds?.top ?? 0,
      viewportHeight: window.innerHeight,
    };
  });
  expect(hierarchy.actionTop).toBeLessThan(hierarchy.visualTop);
  expect(hierarchy.actionBottom).toBeLessThanOrEqual(
    hierarchy.viewportHeight
  );
  await expect(briefingAction).toBeInViewport();
  expect(
    await briefingAction.evaluate((element) => {
      const visual = element
        .closest('section')
        ?.querySelector('figure[data-visual-kind]');
      return (
        (visual?.getBoundingClientRect().top ?? 0) -
        element.getBoundingClientRect().bottom
      );
    })
  ).toBeGreaterThanOrEqual(16);
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
  const source = page.getByRole('link', { name: 'Source', exact: true });
  const sourceFeeds = page.getByRole('navigation', {
    name: 'Launch data sources',
  });
  const spacexSource = sourceFeeds.getByRole('link', {
    name: 'SpaceX',
    exact: true,
  });
  const launchLibrarySource = sourceFeeds.getByRole('link', {
    name: 'Launch Library 2',
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

test('watch keeps verified streams primary and offers a rocket visual on demand', async ({
  page,
}) => {
  await page.goto('/watch?id=ll2-demo-orbital-dawn');

  await expect(
    page.getByRole('link', { name: 'Open provider stream' })
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
    page.getByRole('link', { name: 'Open provider stream' })
  ).toHaveCount(0);
  const visual = page.locator('figure[data-visual-kind="vehicle"]');
  await expect(visual).toHaveCount(1);
  await expect(
    visual.getByRole('img', {
      name: 'Vehicle reference image of Astra Nova launch vehicle',
    })
  ).toBeVisible();
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
      queueTop: queueBounds.top,
      visualLeft: visualBounds?.left ?? 0,
      visualRight: visualBounds?.right ?? 0,
      visualTop: visualBounds?.top ?? 0,
      viewportWidth: window.innerWidth,
    };
  }, await visual.elementHandle());

  if (hierarchy.viewportWidth >= 1024) {
    expect(hierarchy.queueLeft).toBeGreaterThanOrEqual(hierarchy.visualRight);
    expect(hierarchy.queueTop).toBeLessThan(hierarchy.visualTop);
  } else {
    expect(hierarchy.queueBottom).toBeLessThanOrEqual(hierarchy.visualTop);
  }

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

test('watch defers offscreen trajectory with a keyboard load path', async ({
  page,
}) => {
  await page.goto('/watch');

  const pendingTrajectory = page.locator('[data-trajectory-pending="true"]');
  await expect(pendingTrajectory).toBeVisible();
  await expect(page.locator('[data-trajectory-map]')).toHaveCount(0);

  const initialPlacement = await pendingTrajectory.evaluate((element) => ({
    top: element.getBoundingClientRect().top,
    viewportHeight: window.innerHeight,
  }));
  expect(initialPlacement.top).toBeGreaterThan(
    initialPlacement.viewportHeight + 600
  );

  await pendingTrajectory.scrollIntoViewIfNeeded();
  await expect(page.locator('[data-trajectory-map]')).toHaveCount(1);

  await page.reload({ waitUntil: 'networkidle' });
  await expect(pendingTrajectory).toBeVisible();
  await expect(page.locator('[data-trajectory-map]')).toHaveCount(0);

  const loadButton = page.getByRole('button', {
    name: 'Load mission trajectory',
  });
  await loadButton.focus();
  await expect(loadButton).toBeFocused();
  await expect(pendingTrajectory).toBeVisible();

  await loadButton.press('Enter');
  await expect(page.locator('[data-trajectory-map]')).toHaveCount(1);
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
  await page.goto('/watch');
  const loadButton = page.getByRole('button', {
    name: 'Load mission trajectory',
  });
  await loadButton.focus();
  await loadButton.press('Enter');
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

test('history retry reports progress and restores keyboard focus', async ({
  page,
}) => {
  let historyRequests = 0;
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

    historyRequests += 1;
    if (historyRequests === 1) {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Provider maintenance' }),
      });
      return;
    }

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
  await retry.press('Enter');
  await expect.poll(() => historyRequests).toBe(2);

  await expect(retry).toHaveText('Retrying archive');
  await expect(retry).toHaveAttribute('aria-disabled', 'true');
  await expect(retry).toHaveAttribute('aria-busy', 'true');
  await expect(retry).toBeFocused();
  expect(
    await retry.evaluate((element) => element.getBoundingClientRect().height)
  ).toBeGreaterThanOrEqual(44);

  await retry.press('Enter');
  expect(historyRequests).toBe(2);
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
    visualAlt,
  }: {
    path: string;
    mission: string;
    hasTimeline: boolean;
    visualAlt?: string;
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
    const visual = page.locator('figure[data-visual-kind]');
    const unavailableVisual = page.getByLabel('Mission visual unavailable');
    const expectedVisual = visualAlt
      ? visual.getByRole('img', { name: visualAlt })
      : unavailableVisual;

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
      const visualElement = document.querySelector(
        'figure[data-visual-kind], [aria-label="Mission visual unavailable"]'
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
        visualBeforeMap: appearsBefore(visualElement, mapSection),
        mapBeforeTimeline: appearsBefore(mapSection, timelineSection),
        mapBeforeIntel: appearsBefore(mapSection, intelSection),
      };
    });

    expect(order.visualBeforeMap).toBe(true);
    expect(order.mapBeforeIntel).toBe(true);
    expect(order.mapBeforeTimeline).toBe(hasTimeline ? true : null);
    expect(await expectNoHorizontalOverflow(page)).toBe(true);
  };

  await assertDetailTrajectory({
    path: '/launch/ll2-demo-orbital-dawn',
    mission: 'Orbital Dawn',
    hasTimeline: true,
    visualAlt: 'Vehicle reference image of Astra Nova launch vehicle',
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
