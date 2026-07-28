import { expect, test } from '@playwright/test';
import {
  expectNoHorizontalOverflow,
  installApiFixtures,
} from './support/api-fixtures';

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

test('home schedule filters missions and opens a detail route', async ({ page }) => {
  await page.goto('/');

  await expect(
    page.getByRole('heading', { name: 'Orbital Dawn' }).first()
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Upcoming launches' })
  ).toBeVisible();

  await page.getByRole('button', { name: 'Filter' }).click();
  await page
    .getByRole('searchbox', { name: 'Search launches' })
    .fill('Polaris');

  await expect(
    page.getByRole('heading', { name: 'Polaris Relay' })
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Orbital Dawn' })
  ).toHaveCount(1);

  await page
    .getByRole('link', { name: /Polaris Relay/i })
    .click();

  await expect(page).toHaveURL(/\/launch\/spacex-demo-polaris$/);
  await expect(
    page.getByRole('heading', { level: 1, name: 'Polaris Relay' })
  ).toBeVisible();
  expect(await expectNoHorizontalOverflow(page)).toBe(true);
});

test('watch provides a useful standby state and switches the mission queue', async ({
  page,
}) => {
  await page.goto('/watch');

  await expect(
    page.getByRole('heading', { name: 'No live stream right now' })
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Orbital Dawn' })
  ).toBeVisible();
  expect(await expectNoHorizontalOverflow(page)).toBe(true);

  await page.getByRole('button', { name: /Polaris Relay/i }).click();

  await expect(page).toHaveURL(/\/watch\?id=spacex-demo-polaris$/);
  await expect(
    page.getByRole('heading', { level: 1, name: 'Polaris Relay' })
  ).toBeVisible();
  expect(await expectNoHorizontalOverflow(page)).toBe(true);
});

test('history search reaches a completed mission detail', async ({ page }) => {
  await page.goto('/history');

  await expect(
    page.getByRole('heading', { level: 1, name: 'Launch archive' })
  ).toBeVisible();
  await page
    .getByRole('searchbox', { name: 'Search missions' })
    .fill('Return');

  await expect(page.getByText('Demo Return Flight')).toBeVisible();
  await expect(page.getByText('1 result')).toBeVisible();
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
    if ((await mapDisclosure.getAttribute('aria-expanded')) !== 'true') {
      await mapDisclosure.click();
    }

    const mapTop = await page
      .getByRole('region', { name: 'Mission trajectory' })
      .boundingBox();
    const scheduleTop = await page
      .getByRole('region', { name: 'Upcoming launches' })
      .boundingBox();
    expect(mapTop).not.toBeNull();
    expect(scheduleTop).not.toBeNull();
    expect(mapTop!.y).toBeLessThan(scheduleTop!.y);
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
    ];
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
