import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { installApiFixtures } from './support/api-fixtures';

const routes = [
  { path: '/', heading: 'Orbital Dawn' },
  { path: '/watch', heading: 'Orbital Dawn' },
  { path: '/history', heading: 'Launch archive' },
  {
    path: '/launch/spacex-demo-return',
    heading: 'Demo Return Flight',
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
