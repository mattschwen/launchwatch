import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  areLaunchAlertsEnabled,
  checkAndNotify,
  setLaunchAlertsEnabled,
} from '@/lib/notifications';
import { UPCOMING_LAUNCHES } from '../fixtures/launches';

const originalNotification = window.Notification;
const originalServiceWorker = Object.getOwnPropertyDescriptor(
  navigator,
  'serviceWorker'
);

afterEach(() => {
  vi.useRealTimers();
  Object.defineProperty(window, 'Notification', {
    configurable: true,
    value: originalNotification,
  });
  if (originalServiceWorker) {
    Object.defineProperty(navigator, 'serviceWorker', originalServiceWorker);
  } else {
    Reflect.deleteProperty(navigator, 'serviceWorker');
  }
  localStorage.clear();
  vi.restoreAllMocks();
});

function installGrantedNotifications(): ReturnType<typeof vi.fn> {
  const notification = vi.fn();
  Object.defineProperty(notification, 'permission', {
    configurable: true,
    value: 'granted',
  });
  Object.defineProperty(window, 'Notification', {
    configurable: true,
    value: notification,
  });

  const showNotification = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: {
      getRegistration: vi.fn().mockResolvedValue({ showNotification }),
    },
  });

  return showNotification;
}

describe('launch notification precision', () => {
  it('pauses and resumes all launch checks without changing browser permission', async () => {
    const showNotification = installGrantedNotifications();
    const launch = {
      ...UPCOMING_LAUNCHES[0],
      date: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      datePrecision: { name: 'Minute', abbrev: 'MIN' },
    };

    setLaunchAlertsEnabled(false);
    expect(areLaunchAlertsEnabled()).toBe(false);
    await checkAndNotify([launch]);
    expect(showNotification).not.toHaveBeenCalled();

    setLaunchAlertsEnabled(true);
    expect(areLaunchAlertsEnabled()).toBe(true);
    await checkAndNotify([launch]);
    expect(showNotification).toHaveBeenCalledOnce();
  });

  it('falls back to an in-page alert when service-worker delivery fails', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-05T12:00:00.000Z'));
    const notification = vi.fn();
    Object.defineProperty(notification, 'permission', {
      configurable: true,
      value: 'granted',
    });
    Object.defineProperty(window, 'Notification', {
      configurable: true,
      value: notification,
    });

    const showNotification = vi
      .fn()
      .mockRejectedValue(new Error('Service worker unavailable'));
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        getRegistration: vi.fn().mockResolvedValue({ showNotification }),
      },
    });
    const launch = {
      ...UPCOMING_LAUNCHES[0],
      date: '2026-08-05T12:30:00.000Z',
      dateUnix: 1_775_392_200,
      datePrecision: { name: 'Minute', abbrev: 'MIN' },
    };

    await checkAndNotify([launch]);

    expect(showNotification).toHaveBeenCalledOnce();
    expect(notification).toHaveBeenCalledOnce();
    expect(notification).toHaveBeenCalledWith(
      '🚀 Orbital Dawn',
      expect.objectContaining({
        body:
          'Launching in 30 minutes\nAstra Nova from SLC-40 · Cape Canaveral',
      }),
    );
    expect(localStorage.getItem('notified-1h-ll2-demo-orbital-dawn')).toBe(
      String(Math.floor(new Date(launch.date).getTime() / 60_000)),
    );
  });

  it('does not alert on a coarse provider placeholder date', async () => {
    const notification = vi.fn();
    Object.defineProperty(notification, 'permission', {
      configurable: true,
      value: 'granted',
    });
    Object.defineProperty(window, 'Notification', {
      configurable: true,
      value: notification,
    });

    await checkAndNotify([
      {
        ...UPCOMING_LAUNCHES[0],
        date: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        datePrecision: { name: 'Month', abbrev: 'M' },
      },
    ]);

    expect(notification).not.toHaveBeenCalled();
    expect(Object.keys(localStorage)).toHaveLength(0);
  });

  it('labels a live prelaunch broadcast as coverage instead of liftoff', async () => {
    const showNotification = installGrantedNotifications();

    await checkAndNotify([
      {
        ...UPCOMING_LAUNCHES[0],
        status: 'live',
        isLive: true,
        webcastLive: true,
        statusName: 'Go for Launch',
        datePrecision: { name: 'Month', abbrev: 'M' },
      },
    ]);

    expect(showNotification).toHaveBeenCalledOnce();
    expect(showNotification).toHaveBeenCalledWith(
      '🚀 Orbital Dawn',
      expect.objectContaining({
        body:
          'Coverage is live\nAstra Nova from SLC-40 · Cape Canaveral',
      }),
    );
    expect(localStorage.getItem('notified-live-ll2-demo-orbital-dawn')).toBe(
      'true'
    );
  });

  it.each([
    [30_000, 'less than a minute'],
    [60_000, '1 minute'],
    [2 * 60_000, '2 minutes'],
  ])(
    'uses honest, grammatical timing for a launch %i milliseconds away',
    async (leadTime, timingLabel) => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-08-04T12:00:00.000Z'));
      const showNotification = installGrantedNotifications();

      await checkAndNotify([
        {
          ...UPCOMING_LAUNCHES[0],
          date: new Date(Date.now() + leadTime).toISOString(),
          datePrecision: { name: 'Minute', abbrev: 'MIN' },
        },
      ]);

      expect(showNotification).toHaveBeenCalledWith(
        '🚀 Orbital Dawn',
        expect.objectContaining({
          body: `Launching in ${timingLabel}\nAstra Nova from SLC-40 · Cape Canaveral`,
        }),
      );
    },
  );

  it('re-arms a launch threshold after the provider retargets the mission', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-05T12:00:00.000Z'));
    const showNotification = installGrantedNotifications();
    const firstTarget = {
      ...UPCOMING_LAUNCHES[0],
      date: '2026-08-05T12:30:00.000Z',
      datePrecision: { name: 'Minute', abbrev: 'MIN' },
    };

    await checkAndNotify([firstTarget]);
    await checkAndNotify([firstTarget]);

    expect(showNotification).toHaveBeenCalledOnce();

    vi.setSystemTime(new Date('2026-08-05T13:30:00.000Z'));
    const retargetedLaunch = {
      ...firstTarget,
      date: '2026-08-05T14:00:00.000Z',
    };

    await checkAndNotify([retargetedLaunch]);
    await checkAndNotify([retargetedLaunch]);

    expect(showNotification).toHaveBeenCalledTimes(2);
    expect(showNotification).toHaveBeenLastCalledWith(
      '🚀 Orbital Dawn',
      expect.objectContaining({
        body:
          'Launching in 30 minutes\nAstra Nova from SLC-40 · Cape Canaveral',
      }),
    );
  });

  it('migrates a legacy alert flag without replaying the current target', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-05T12:00:00.000Z'));
    const showNotification = installGrantedNotifications();
    const notificationKey =
      'notified-1h-ll2-demo-orbital-dawn';
    localStorage.setItem(notificationKey, 'true');
    const currentTarget = {
      ...UPCOMING_LAUNCHES[0],
      date: '2026-08-05T12:30:00.000Z',
      datePrecision: { name: 'Minute', abbrev: 'MIN' },
    };

    await checkAndNotify([currentTarget]);

    expect(showNotification).not.toHaveBeenCalled();
    expect(localStorage.getItem(notificationKey)).not.toBe('true');

    vi.setSystemTime(new Date('2026-08-05T13:30:00.000Z'));
    await checkAndNotify([
      {
        ...currentTarget,
        date: '2026-08-05T14:00:00.000Z',
      },
    ]);

    expect(showNotification).toHaveBeenCalledOnce();
  });
});
