import { expect, test } from '@playwright/test';
import {
  expectNoHorizontalOverflow,
  installApiFixtures,
} from './support/api-fixtures';

test.beforeEach(async ({ page }) => {
  await installApiFixtures(page);
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

test('mission map keeps its expanded controls and zoom state in frame', async ({
  page,
}) => {
  await page.goto('/');

  const mapDisclosure = page.getByRole('button', { name: /Mission map/i });
  const expandButton = page.getByRole('button', { name: 'Expand map' });
  await expect(mapDisclosure.or(expandButton).first()).toBeVisible();

  if (await mapDisclosure.isVisible()) {
    await mapDisclosure.click();
  }

  await expect(expandButton).toBeVisible();
  await expandButton.click();

  const dialog = page.getByRole('dialog', { name: 'Expanded mission map' });
  const controls = page.getByRole('group', { name: 'Map view controls' });
  const map = page.getByTestId('telemetry-map');

  await expect(dialog).toBeVisible();
  await expect(controls).toBeVisible();
  await expect(map).toBeVisible();

  const controlLayout = await controls.evaluate((element) => {
    const container = element.getBoundingClientRect();
    const buttons = [...element.querySelectorAll('button')].map((button) =>
      button.getBoundingClientRect()
    );

    return {
      contained: buttons.every(
        (button) =>
          button.left >= container.left - 1 &&
          button.right <= container.right + 1
      ),
      touchSized: buttons.every(
        (button) => button.width >= 44 && button.height >= 44
      ),
      noInternalOverflow: element.scrollWidth <= element.clientWidth + 1,
    };
  });

  expect(controlLayout).toEqual({
    contained: true,
    touchSized: true,
    noInternalOverflow: true,
  });
  expect(await expectNoHorizontalOverflow(page)).toBe(true);

  await page.getByRole('button', { name: 'Zoom in' }).click();
  await expect(map.getByText(/manual track/i)).toBeVisible();

  await page.getByRole('button', { name: 'Close map' }).click();
  await expect(expandButton).toBeFocused();
});
