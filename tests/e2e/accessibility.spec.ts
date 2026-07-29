import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { installApiFixtures } from './support/api-fixtures';

const routes = [
  { path: '/', heading: 'Orbital Dawn', pageHeading: 'Orbital Dawn' },
  { path: '/watch', heading: 'Orbital Dawn', pageHeading: 'Watch room' },
  { path: '/history', heading: 'Launch archive', pageHeading: 'Launch archive' },
  {
    path: '/launch/spacex-demo-return',
    heading: 'Demo Return Flight',
    pageHeading: 'Demo Return Flight',
  },
  {
    path: '/launch/ll2-demo-orbital-dawn',
    heading: 'Orbital Dawn',
    pageHeading: 'Orbital Dawn',
  },
];

test.beforeEach(async ({ page }) => {
  await installApiFixtures(page);
});

for (const route of routes) {
  test(`@a11y ${route.path} has no serious WCAG A/AA violations`, async ({
    page,
  }) => {
    await page.goto(route.path);
    await expect(
      page.getByRole('heading', { name: route.heading }).first()
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { level: 1, name: route.pageHeading })
    ).toHaveCount(1);
    expect(
      await page
        .locator('h1, h2, h3, h4, h5, h6')
        .first()
        .evaluate((element) => element.tagName)
    ).toBe('H1');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    const blocking = results.violations.filter(
      (violation) =>
        violation.impact === 'serious' || violation.impact === 'critical'
    );

    expect(
      blocking,
      blocking
        .map(
          (violation) =>
            `${violation.id}: ${violation.help} (${violation.nodes.length} nodes)`
        )
        .join('\n')
    ).toEqual([]);
  });
}

test('@a11y mission briefing calendar has no serious WCAG A/AA violations', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Open briefing' }).click();

  const dialog = page.getByRole('dialog', { name: 'Orbital Dawn' });
  await dialog
    .getByRole('button', { name: 'Add launch to calendar' })
    .click();
  await expect(
    dialog.getByRole('group', { name: 'Calendar options' })
  ).toBeVisible();

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  const blocking = results.violations.filter(
    (violation) =>
      violation.impact === 'serious' || violation.impact === 'critical'
  );

  expect(
    blocking,
    blocking
      .map(
        (violation) =>
          `${violation.id}: ${violation.help} (${violation.nodes.length} nodes)`
      )
      .join('\n')
  ).toEqual([]);
});
