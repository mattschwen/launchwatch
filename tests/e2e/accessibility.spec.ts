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
  {
    path: '/launch/ll2-unavailable-mission',
    heading: 'This mission path is off course.',
    pageHeading: 'This mission path is off course.',
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

    if (route.path === '/history') {
      await expect(
        page.getByRole('link', {
          name: 'View mission Demo Return Flight',
        }),
      ).toBeVisible();
      await expect(
        page.getByRole('link', {
          name: 'View mission Pathfinder Qualification',
        }),
      ).toBeVisible();
      await expect(
        page.getByRole('link', { name: 'View mission', exact: true }),
      ).toHaveCount(0);
    }

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

test('@a11y forced colors keeps current and selected controls visible', async ({
  page,
}) => {
  await page.emulateMedia({ forcedColors: 'active' });
  await page.goto('/watch?id=ll2-demo-orbital-dawn');

  const currentRoute = page
    .locator('nav[aria-label="Primary navigation"]:visible')
    .locator('[aria-current="page"]');
  const selectedMission = page
    .getByRole('complementary', { name: 'Mission queue' })
    .getByRole('button', { name: /Orbital Dawn/i });

  await expect(currentRoute).toHaveCSS('outline-style', 'solid');
  await expect(selectedMission).toHaveCSS('outline-style', 'solid');
  await expect(currentRoute).toHaveCSS('outline-width', '2px');
  await expect(selectedMission).toHaveCSS('outline-width', '2px');
});

test('@a11y retained offline schedule has no serious WCAG A/AA violations', async ({
  context,
  page,
}) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Orbital Dawn' }),
  ).toBeVisible();

  await context.setOffline(true);
  await expect(
    page.getByRole('status', { name: 'Launch feed status: Feed offline' }),
  ).toBeVisible();
  await expect(
    page
      .getByRole('region', { name: 'Upcoming launches' })
      .getByRole('button', { name: 'Refresh when online' }),
  ).toHaveAttribute('aria-disabled', 'true');

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(
    results.violations.filter(
      (violation) =>
        violation.impact === 'serious' || violation.impact === 'critical',
    ),
  ).toEqual([]);

  await context.setOffline(false);
});

test('@a11y increased contrast strengthens telemetry and selected surfaces', async ({
  page,
}) => {
  const readTheme = (): Promise<{
    textSecondary: string;
    textMuted: string;
    borderSubtle: string;
    borderStrong: string;
    surfaceAccent: string;
    selectedBackground: string;
  }> =>
    page.evaluate(() => {
      const rootStyle = getComputedStyle(document.documentElement);
      const selectedMission = document.querySelector<HTMLElement>(
        '[aria-pressed="true"]',
      );
      const resolveColor = (value: string): string => {
        const probe = document.createElement('span');
        probe.style.color = value;
        document.body.append(probe);
        const color = getComputedStyle(probe).color;
        probe.remove();
        return color;
      };

      return {
        textSecondary: resolveColor(
          rootStyle.getPropertyValue('--text-secondary'),
        ),
        textMuted: resolveColor(rootStyle.getPropertyValue('--text-muted')),
        borderSubtle: resolveColor(
          rootStyle.getPropertyValue('--border-subtle'),
        ),
        borderStrong: resolveColor(
          rootStyle.getPropertyValue('--border-strong'),
        ),
        surfaceAccent: resolveColor(
          rootStyle.getPropertyValue('--surface-accent'),
        ),
        selectedBackground: selectedMission
          ? getComputedStyle(selectedMission).backgroundColor
          : '',
      };
    });

  await page.emulateMedia({ contrast: 'no-preference' });
  await page.goto('/watch?id=ll2-demo-orbital-dawn');
  await expect(
    page
      .getByRole('complementary', { name: 'Mission queue' })
      .getByRole('button', { name: /Orbital Dawn/i }),
  ).toHaveAttribute('aria-pressed', 'true');
  const defaultTheme = await readTheme();

  await page.emulateMedia({ contrast: 'more' });
  const expectedIncreasedContrastTheme = {
    textSecondary: 'rgb(228, 233, 242)',
    textMuted: 'rgb(193, 204, 219)',
    borderSubtle: 'rgba(218, 228, 244, 0.34)',
    borderStrong: 'rgba(232, 239, 252, 0.58)',
    surfaceAccent: 'rgba(99, 246, 178, 0.16)',
    selectedBackground: 'rgba(99, 246, 178, 0.16)',
  };

  await expect.poll(readTheme).toEqual(expectedIncreasedContrastTheme);
  const increasedContrastTheme = await readTheme();
  expect(increasedContrastTheme).not.toEqual(defaultTheme);

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(
    results.violations.filter(
      (violation) =>
        violation.impact === 'serious' || violation.impact === 'critical',
    ),
  ).toEqual([]);
});

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

test('@a11y enriched archive replay has no serious WCAG A/AA violations', async ({
  page,
}) => {
  const historicalLaunch = {
    ...UPCOMING_LAUNCHES[0],
    id: 'll2-demo-history-replay',
    sourceId: 'demo-history-replay',
    date: '2035-07-20T14:30:00.000Z',
    dateUnix: 2068554600,
    status: 'success' as const,
    statusName: 'Launch Successful',
    isLive: false,
    webcastLive: false,
    livestream: null,
    livestreams: null,
  };
  await page.route('**/api/launches?type=history&limit=100', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ launches: [historicalLaunch], meta: FEED_META }),
    })
  );
  await page.route('**/api/launches/ll2-demo-history-replay', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        launch: {
          ...historicalLaunch,
          livestream: 'https://www.youtube.com/watch?v=archive-replay',
          livestreams: [
            {
              url: 'https://www.youtube.com/watch?v=archive-replay',
              title: 'Official archive replay',
              isLive: false,
            },
          ],
        },
        canonicalId: historicalLaunch.id,
        meta: FEED_META,
      }),
    })
  );

  await page.goto('/history');
  await page
    .getByRole('button', { name: /Orbital Dawn/i })
    .click();
  await expect(
    page.getByRole('link', { name: 'Watch replay' })
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

test('@a11y archive replay failure has no serious WCAG A/AA violations', async ({
  page,
}) => {
  const historicalLaunch = {
    ...UPCOMING_LAUNCHES[0],
    id: 'll2-demo-history-replay-failure',
    sourceId: 'demo-history-replay-failure',
    date: '2035-07-20T14:30:00.000Z',
    dateUnix: 2068554600,
    status: 'success' as const,
    statusName: 'Launch Successful',
    isLive: false,
    webcastLive: false,
    livestream: null,
    livestreams: null,
  };
  await page.route('**/api/launches?type=history&limit=100', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ launches: [historicalLaunch], meta: FEED_META }),
    })
  );
  await page.route(
    '**/api/launches/ll2-demo-history-replay-failure',
    (route) =>
      route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Replay provider maintenance' }),
      })
  );

  await page.goto('/history');
  await page.getByRole('button', { name: /Orbital Dawn/i }).click();
  await expect(
    page.getByRole('status', { name: 'Replay check failed' })
  ).toContainText('Replay provider maintenance');

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
          rationale:
            'Search fallback because no YouTube Data API key is configured.',
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
      .getByRole('link', { name: /Search YouTube.*new tab/i })
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

test('@a11y AI-assisted official social signal has no serious WCAG A/AA violations', async ({
  page,
}) => {
  await page.route('**/api/launch-intel**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ...LAUNCH_INTEL,
        socialItems: [
          {
            id: 'official-spacex-update',
            platform: 'x',
            title:
              'Polaris Relay launch preparations continue ahead of the confirmed Florida target window.',
            url: 'https://x.com/SpaceX/status/1234567890',
            publishedAt: '2035-07-26T10:00:00.000Z',
            author: 'SpaceX',
            community: '@SpaceX',
            note: 'LaunchWatch AI-assisted summary of an official SpaceX post.',
          },
        ],
      }),
    })
  );

  await page.goto('/watch');
  const intelligence = page.getByRole('region', {
    name: 'Mission intelligence',
  });
  await expect(intelligence.getByText('Official @SpaceX')).toBeVisible();
  await expect(
    intelligence.getByText(
      'LaunchWatch AI-assisted summary of an official SpaceX post.'
    )
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

test('@a11y blocked mission sharing has no serious WCAG A/AA violations', async ({
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
  await page.getByRole('button', { name: 'Share', exact: true }).click();
  await expect(
    page.getByRole('textbox', { name: 'Canonical mission link' })
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

test('@a11y watch estimate countdown has valid time semantics', async ({
  page,
}) => {
  const estimatedLaunch = {
    ...UPCOMING_LAUNCHES[0],
    datePrecision: { name: 'Minute', abbrev: 'MIN' },
    livestream: null,
    livestreams: null,
  };
  await page.route('**/api/launches?type=all', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        launches: [estimatedLaunch, ...UPCOMING_LAUNCHES.slice(1)],
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

  await page.goto('/watch?id=ll2-demo-orbital-dawn');
  const coverageCountdown = page
    .getByRole('region', { name: /Mission coverage/ })
    .locator('time');
  await expect(coverageCountdown).toContainText('≈T−');

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
