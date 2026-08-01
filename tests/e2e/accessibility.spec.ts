import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { installApiFixtures } from './support/api-fixtures';
import {
  FEED_META,
  LAUNCH_INTEL,
  UPCOMING_LAUNCHES,
} from '../fixtures/launches';

const routes = [
  { path: '/', heading: 'Orbital Dawn', pageHeading: 'Orbital Dawn' },
  { path: '/watch', heading: 'Orbital Dawn', pageHeading: 'Watch room' },
  {
    path: '/watch?id=ll2-unavailable-mission',
    heading: 'Orbital Dawn',
    pageHeading: 'Watch room',
  },
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

test('@a11y home mission visual disclosure has no serious WCAG A/AA violations', async ({
  page,
}) => {
  await page.goto('/');
  await page
    .getByRole('button', { name: 'Show mission visual for Orbital Dawn' })
    .click();
  await expect(
    page.locator('figure[data-visual-kind="vehicle"]')
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

test('@a11y history synchronization has no serious WCAG A/AA violations', async ({
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
      body: JSON.stringify({ launches: [], meta: FEED_META }),
    });
  });

  await page.goto('/history');
  await expect(
    page.getByRole('region', { name: 'Synchronizing launch archive' })
  ).toHaveAttribute('aria-busy', 'true');

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  const blocking = results.violations.filter(
    (violation) =>
      violation.impact === 'serious' || violation.impact === 'critical'
  );

  releaseHistory();
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

test('@a11y mission briefing calendar has no serious WCAG A/AA violations', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Open briefing' }).click();

  const dialog = page.getByRole('dialog', { name: 'Orbital Dawn' });
  const backgroundRoot = page.locator('body > :has(#main-content)');
  await expect(backgroundRoot).toHaveAttribute('aria-hidden', 'true');
  await expect(backgroundRoot).toHaveAttribute('inert', '');
  await expect(
    page.getByRole('button', { name: 'Close mission briefing' })
  ).toHaveCount(1);
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

test('@a11y search-only mission intelligence has no serious WCAG A/AA violations', async ({
  page,
}) => {
  await page.route('**/api/launch-intel**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ...LAUNCH_INTEL,
        summary: {
          streamState: 'search',
          recommendedLabel: 'Search YouTube',
          recommendedUrl:
            'https://www.youtube.com/results?search_query=Orbital+Dawn',
          rationale: 'No verified stream is currently available.',
          lastUpdated: '2035-07-26T12:00:00.000Z',
        },
        streamCandidates: [
          {
            id: 'search-fallback',
            title: 'YouTube search fallback',
            url: 'https://www.youtube.com/results?search_query=Orbital+Dawn',
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
  await expect(
    page
      .getByRole('region', { name: 'Mission intelligence' })
      .getByRole('link', { name: 'Search YouTube' })
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

test('@a11y coarse launch estimate has no serious WCAG A/AA violations', async ({
  page,
}) => {
  const estimatedLaunch = {
    ...UPCOMING_LAUNCHES[0],
    date: '2035-08-31T00:00:00.000Z',
    dateUnix: 2072131200,
    datePrecision: { name: 'Month', abbrev: 'M' },
    status: 'tbd' as const,
    statusName: 'To Be Determined',
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
  await expect(page.getByText('Target estimate')).toBeVisible();
  await page.getByRole('button', { name: 'Open briefing' }).click();
  await expect(
    page.getByRole('button', {
      name: 'Calendar export pending a confirmed launch time',
    })
  ).toBeDisabled();

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
