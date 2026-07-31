import { afterEach, describe, expect, it, vi } from 'vitest';
import { checkAndNotify } from '@/lib/notifications';
import { UPCOMING_LAUNCHES } from '../fixtures/launches';

const originalNotification = window.Notification;
const originalServiceWorker = Object.getOwnPropertyDescriptor(
  navigator,
  'serviceWorker'
);

afterEach(() => {
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

    await checkAndNotify([
      {
        ...UPCOMING_LAUNCHES[0],
        status: 'live',
        isLive: true,
        datePrecision: { name: 'Month', abbrev: 'M' },
      },
    ]);

    expect(showNotification).toHaveBeenCalledOnce();
    expect(localStorage.getItem('notified-live-ll2-demo-orbital-dawn')).toBe(
      'true'
    );
  });
});
