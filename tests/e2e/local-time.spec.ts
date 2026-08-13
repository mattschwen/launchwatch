import { expect, test } from '@playwright/test';

async function expectContainedPage(page: import('@playwright/test').Page) {
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)
  ).toBe(true);
}

test.describe('confirmed launch local time', () => {
  test.use({ timezoneId: 'America/Denver' });

  test('keeps UTC authoritative and adds local context to primary mission surfaces', async ({
    page,
  }) => {
    const browserErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') browserErrors.push(message.text());
    });
    page.on('pageerror', (error) => browserErrors.push(error.message));

    await page.goto('/');
    const featured = page.locator(
      'section[aria-labelledby="featured-launch-title"]'
    );
    const featuredLocalTime = featured
      .getByText('Your time', { exact: true })
      .locator('..')
      .locator('time');

    await expect(featured.getByText('12:00 UTC', { exact: true })).toBeVisible();
    await expect(featuredLocalTime).toHaveAttribute(
      'datetime',
      /^\d{4}-\d{2}-\d{2}T12:00:00\.000Z$/
    );
    const expectedLocalTime = await featuredLocalTime.evaluate((element) =>
      new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short',
      }).format(new Date((element as HTMLTimeElement).dateTime))
    );
    const featuredSiteTime = featured
      .getByText('Site time', { exact: true })
      .locator('..')
      .locator('time');
    const viewport = page.viewportSize();
    const compactHero = Boolean(
      viewport && viewport.width <= 430 && viewport.height <= 760,
    );
    if (compactHero) {
      await expect(featuredSiteTime).toBeHidden();
    } else {
      const expectedSiteTime = await featuredSiteTime.evaluate((element) =>
        new Intl.DateTimeFormat('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          timeZone: 'America/New_York',
          timeZoneName: 'short',
        }).format(new Date((element as HTMLTimeElement).dateTime))
      );
      await expect(featuredSiteTime).toHaveText(expectedSiteTime);
    }
    await expect(featuredLocalTime).toHaveText(expectedLocalTime);
    const featuredWindow = featured.locator('[data-launch-window]');
    await expect(featuredWindow.getByText('Your window')).toBeVisible();
    await expect(
      featuredWindow.locator('[data-local-launch-window]')
    ).toContainText('6:00 AM–8:00 AM MDT');
    await expect(
      featuredWindow.getByRole('note', {
        name: 'Your window 6:00 AM–8:00 AM MDT',
      })
    ).toBeVisible();
    const showSiteWindow = featuredWindow.getByRole('button', {
      name: 'Show launch site window 8:00 AM–10:00 AM EDT',
    });
    await showSiteWindow.focus();
    await showSiteWindow.press('Enter');
    const showViewerWindow = featuredWindow.getByRole('button', {
      name: 'Show your window 6:00 AM–8:00 AM MDT',
    });
    await expect(showViewerWindow).toBeFocused();
    await expect(
      featuredWindow.getByRole('note', {
        name: 'Site window 8:00 AM–10:00 AM EDT',
      })
    ).toBeVisible();
    await showViewerWindow.press('Enter');

    const schedule = page.locator('#upcoming-launch-results');
    const firstMissionRow = schedule.locator('article').first();
    await expect(
      firstMissionRow.getByText('Your time', { exact: true })
    ).toBeVisible();
    await expect(
      firstMissionRow.getByText('Site time', { exact: true })
    ).toBeVisible();
    await expect(
      firstMissionRow.locator('.local-launch-time time')
    ).toHaveText(expectedLocalTime);
    await expectContainedPage(page);

    await featured.getByRole('button', { name: 'Open briefing' }).click();
    const briefing = page.getByRole('dialog');
    const briefingLocalTime = briefing.locator('.local-launch-time');
    await expect(
      briefingLocalTime.getByText('Your time', { exact: true })
    ).toBeVisible();
    await expect(
      briefing.getByText('Site time', { exact: true })
    ).toBeVisible();
    await expect(
      briefingLocalTime.getByText(expectedLocalTime, { exact: true })
    ).toBeVisible();
    await briefing.getByRole('button', { name: 'Close mission briefing' }).click();

    await page.goto('/watch');
    const selectedMission = page.locator('[data-watch-selected-mission]');
    await expect(
      selectedMission.getByText('Your time', { exact: true })
    ).toBeVisible();
    await expect(
      selectedMission.getByText('Site time', { exact: true })
    ).toBeVisible();
    await expect(
      selectedMission.locator('[data-local-launch-window]')
    ).toContainText('6:00 AM–8:00 AM MDT');
    await expectContainedPage(page);

    await page.goto('/launch/ll2-demo-orbital-dawn');
    const missionPanel = page.locator('main section').first();
    await expect(
      missionPanel.getByText('Your time', { exact: true })
    ).toBeVisible();
    await expect(
      missionPanel.getByText('Site time', { exact: true })
    ).toBeVisible();
    await expect(
      missionPanel.getByText(expectedLocalTime, { exact: true })
    ).toBeVisible();
    await expect(
      missionPanel.locator('[data-local-launch-window]')
    ).toContainText('6:00 AM–8:00 AM MDT');
    const timeline = page.getByRole('region', { name: 'Launch timeline' });
    const timelineClocks = timeline.locator('[data-timeline-clock]');
    await expect(
      timeline.getByText('Mission clock // derived from provider T-0', {
        exact: true,
      })
    ).toBeVisible();
    await expect(timelineClocks).toHaveCount(10);
    const firstTimelineClock = timelineClocks.first();
    const firstTimelineUtc = firstTimelineClock.locator('time');
    await expect(firstTimelineUtc).toHaveText('09:25 UTC');
    const expectedLocalEventTime = await firstTimelineUtc.evaluate((element) =>
      new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short',
      }).format(new Date((element as HTMLTimeElement).dateTime))
    );
    await expect(firstTimelineClock).toContainText(expectedLocalEventTime);

    await page.getByRole('button', { name: 'Open briefing' }).click();
    const detailBriefing = page.getByRole('dialog', { name: 'Orbital Dawn' });
    const briefingTimeline = detailBriefing.getByRole('region', {
      name: 'Launch timeline',
    });
    await expect(
      briefingTimeline.locator('[data-timeline-clock]')
    ).toHaveCount(8);
    await expect(briefingTimeline).toContainText(expectedLocalEventTime);
    await expectContainedPage(page);
    expect(browserErrors).toEqual([]);
  });
});

test.describe('UTC launch time', () => {
  test.use({ timezoneId: 'UTC' });

  test('does not repeat an identical local time', async ({ page }) => {
    await page.goto('/');
    const featured = page.locator(
      'section[aria-labelledby="featured-launch-title"]'
    );

    await expect(featured.getByText('12:00 UTC', { exact: true })).toBeVisible();
    await expect(
      featured.getByText('Your time', { exact: true })
    ).toHaveCount(0);
    const viewport = page.viewportSize();
    const featuredSiteTime = featured.getByText('Site time', { exact: true });
    if (viewport && viewport.width <= 430 && viewport.height <= 760) {
      await expect(featuredSiteTime).toBeHidden();
    } else {
      await expect(featuredSiteTime).toBeVisible();
    }
    await expect(
      featured.locator('[data-local-launch-window]')
    ).toHaveCount(0);
    await expect(
      page
        .locator('#upcoming-launch-results')
        .getByText('Your time', { exact: true })
    ).toHaveCount(0);

    await page.goto('/launch/ll2-demo-orbital-dawn');
    const timeline = page.getByRole('region', { name: 'Launch timeline' });
    await expect(timeline.locator('[data-timeline-clock]')).toHaveCount(10);
    await expect(timeline.getByText('09:25 UTC', { exact: true })).toBeVisible();
    await expect(
      timeline.getByText('Your time', { exact: true })
    ).toHaveCount(0);
  });
});
