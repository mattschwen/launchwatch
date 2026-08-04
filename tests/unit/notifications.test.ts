import { afterEach, describe, expect, it, vi } from 'vitest';
import { checkAndNotify } from '@/lib/notifications';
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

  it('still alerts when a coarse-date mission is already live', async () => {
    const showNotification = installGrantedNotifications();

    await checkAndNotify([
      {
        ...UPCOMING_LAUNCHES[0],
        status: 'live',
        isLive: true,
        datePrecision: { name: 'Month', abbrev: 'M' },
      },
    ]);

    expect(showNotification).toHaveBeenCalledOnce();
    expect(showNotification).toHaveBeenCalledWith(
      '🚀 Orbital Dawn',
      expect.objectContaining({
        body:
          'Live now\nAstra Nova from Space Launch Complex 40, Cape Canaveral Space Force Station',
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
          body: `Launching in ${timingLabel}\nAstra Nova from Space Launch Complex 40, Cape Canaveral Space Force Station`,
        }),
      );
    },
  );
});
