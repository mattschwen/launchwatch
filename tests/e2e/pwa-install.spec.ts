import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import {
  expectNoHorizontalOverflow,
  installApiFixtures,
} from './support/api-fixtures';

test.beforeEach(async ({ page }) => {
  await installApiFixtures(page);
});

async function offerInstall(
  page: Page,
  outcome: 'accepted' | 'dismissed' = 'dismissed',
): Promise<boolean> {
  return page.evaluate((choice) => {
    const installPrompt = new Event('beforeinstallprompt', {
      cancelable: true,
    });
    Object.defineProperties(installPrompt, {
      prompt: {
        value: () => Promise.resolve(),
      },
      userChoice: {
        value: Promise.resolve({ outcome: choice, platform: 'web' }),
      },
    });
    window.dispatchEvent(installPrompt);
    return installPrompt.defaultPrevented;
  }, outcome);
}

test('eligible browsers expose a contained keyboard-operable install action', async ({
  page,
}) => {
  await page.goto('/');
  await expect(
    page.getByRole('button', { name: 'Refresh launch schedule' }),
  ).toBeVisible();

  expect(await offerInstall(page)).toBe(true);

  const install = page.getByRole('button', { name: 'Install LaunchWatch' });
  await expect(install).toBeVisible();
  expect((await install.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  await install.focus();
  await expect(install).toBeFocused();
  await install.press('Enter');

  await expect(install).toHaveCount(0);
  expect(await expectNoHorizontalOverflow(page)).toBe(true);
});

test('@a11y eligible install action has no serious WCAG A/AA violations', async ({
  page,
}) => {
  await page.goto('/');
  await expect(
    page.getByRole('button', { name: 'Refresh launch schedule' }),
  ).toBeVisible();
  expect(await offerInstall(page, 'accepted')).toBe(true);
  await expect(
    page.getByRole('button', { name: 'Install LaunchWatch' }),
  ).toBeVisible();

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  const blocking = results.violations.filter(
    (violation) =>
      violation.impact === 'serious' || violation.impact === 'critical',
  );

  expect(
    blocking,
    blocking
      .map(
        (violation) =>
          `${violation.id}: ${violation.help} (${violation.nodes.length} nodes)`,
      )
      .join('\n'),
  ).toEqual([]);
});
