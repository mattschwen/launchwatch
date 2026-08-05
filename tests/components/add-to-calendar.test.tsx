import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AddToCalendar from '@/components/AddToCalendar';
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
  vi.restoreAllMocks();
});

describe('AddToCalendar', () => {
  it('keeps calendar export focusable and explained while the provider reports only a coarse date', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <AddToCalendar
        launch={{
          ...UPCOMING_LAUNCHES[0],
          status: 'tbd',
          datePrecision: { name: 'Month', abbrev: 'M' },
        }}
      />
    );

    const calendar = screen.getByRole('button', { name: 'Calendar pending' });
    expect(calendar).not.toBeDisabled();
    expect(calendar).toHaveAttribute('aria-disabled', 'true');
    expect(calendar).toHaveAccessibleDescription(
      'Month estimate. Calendar export and browser alerts become available after the provider confirms the launch time.'
    );

    await user.tab();
    expect(calendar).toHaveFocus();
    expect(
      container.querySelector('[data-calendar-pending-tooltip="true"]')
    ).toHaveClass('right-0');
    expect(
      container.querySelector('[data-calendar-pending-tooltip="true"]')
    ).toHaveTextContent(
      'Month estimateCalendar export and browser alerts become available after the provider confirms the launch time.'
    );

    await user.keyboard('{Enter}');
    expect(
      screen.queryByRole('group', { name: 'Calendar options' })
    ).not.toBeInTheDocument();
  });

  it('centers a pending explanation over a compact command', () => {
    const { container } = render(
      <AddToCalendar
        launch={{
          ...UPCOMING_LAUNCHES[0],
          datePrecision: { name: 'Hour', abbrev: 'HR' },
        }}
        variant="compact"
        menuPlacement="top"
        menuAlign="right"
      />
    );

    expect(
      container.querySelector('[data-calendar-pending-tooltip="true"]')
    ).toHaveClass('left-1/2', '-translate-x-1/2');
  });

  it('centers ready calendar options over an icon command', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(393);
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      bottom: 835,
      height: 44,
      left: 175.5,
      right: 219.5,
      top: 791,
      width: 44,
      x: 175.5,
      y: 791,
      toJSON: () => ({}),
    });
    const { container } = render(
      <AddToCalendar
        launch={UPCOMING_LAUNCHES[0]}
        variant="icon"
        menuPlacement="top"
        menuAlign="right"
      />
    );

    await user.click(
      screen.getByRole('button', { name: 'Add launch to calendar' })
    );

    expect(
      container.querySelector('[aria-label="Calendar options"]')
    ).toHaveClass('left-1/2', '-translate-x-1/2');
  });

  it('makes browser launch alerts reachable with honest permission states', async () => {
    const user = userEvent.setup();
    let resolvePermission: ((value: NotificationPermission) => void) | undefined;
    const requestPermission = vi.fn(
      () =>
        new Promise<NotificationPermission>((resolve) => {
          resolvePermission = resolve;
        })
    );
    Object.defineProperty(window, 'Notification', {
      configurable: true,
      value: {
        permission: 'default',
        requestPermission,
      },
    });

    render(<AddToCalendar launch={UPCOMING_LAUNCHES[0]} />);

    await user.click(
      screen.getByRole('button', { name: 'Add to calendar' })
    );
    const alerts = await screen.findByRole('button', {
      name: 'Enable browser launch alerts',
    });
    alerts.focus();
    await user.keyboard('{Enter}{Enter}');

    expect(alerts).toHaveFocus();
    expect(alerts).toHaveAttribute('aria-busy', 'true');
    expect(alerts).toHaveAttribute('aria-disabled', 'true');
    expect(requestPermission).toHaveBeenCalledOnce();

    resolvePermission?.('granted');

    expect(
      await screen.findByRole('button', {
        name: 'Alerts enabled while app is open',
      })
    ).toHaveFocus();
    expect(alerts).not.toBeDisabled();
    expect(alerts).toHaveAttribute('aria-busy', 'false');
    expect(alerts).toHaveAttribute('aria-disabled', 'true');
    expect(
      screen.getByText(
        'Browser launch alerts enabled while LaunchWatch is open.'
      )
    ).toBeInTheDocument();
  });

  it('checks the selected mission immediately after alerts are enabled', async () => {
    const user = userEvent.setup();
    let permission: NotificationPermission = 'default';
    const notification = vi.fn();
    Object.defineProperty(notification, 'permission', {
      configurable: true,
      get: () => permission,
    });
    Object.defineProperty(notification, 'requestPermission', {
      configurable: true,
      value: vi.fn().mockImplementation(async () => {
        permission = 'granted';
        return permission;
      }),
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

    render(
      <AddToCalendar
        launch={{
          ...UPCOMING_LAUNCHES[0],
          date: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
          datePrecision: { name: 'Minute', abbrev: 'MIN' },
        }}
      />
    );

    await user.click(
      screen.getByRole('button', { name: 'Add to calendar' })
    );
    await user.click(
      screen.getByRole('button', { name: 'Enable browser launch alerts' })
    );

    expect(
      await screen.findByRole('button', {
        name: 'Alerts enabled while app is open',
      })
    ).toBeVisible();
    expect(showNotification).toHaveBeenCalledOnce();
    expect(showNotification).toHaveBeenCalledWith(
      '🚀 Orbital Dawn',
      expect.objectContaining({
        body: expect.stringMatching(/^Launching in [45] minutes\n/),
      })
    );
  });

  it('reports a failed alert prompt and supports a denied retry', async () => {
    const user = userEvent.setup();
    const requestPermission = vi
      .fn()
      .mockRejectedValueOnce(new DOMException('Permission prompt failed'))
      .mockResolvedValueOnce('denied');
    Object.defineProperty(window, 'Notification', {
      configurable: true,
      value: {
        permission: 'default',
        requestPermission,
      },
    });

    render(<AddToCalendar launch={UPCOMING_LAUNCHES[0]} />);

    await user.click(
      screen.getByRole('button', { name: 'Add to calendar' })
    );
    const alerts = screen.getByRole('button', {
      name: 'Enable browser launch alerts',
    });
    alerts.focus();
    await user.keyboard('{Enter}');

    const retry = await screen.findByRole('button', {
      name: 'Could not enable alerts — retry',
    });
    expect(retry).toHaveFocus();
    expect(retry).toHaveAttribute('aria-disabled', 'false');
    expect(
      screen.getByText('Could not request browser launch alerts. Try again.')
    ).toBeInTheDocument();

    await user.keyboard('{Enter}');

    const blocked = await screen.findByRole('button', {
      name: 'Alerts blocked in browser settings',
    });
    expect(blocked).toHaveFocus();
    expect(blocked).not.toBeDisabled();
    expect(blocked).toHaveAttribute('aria-disabled', 'true');
    expect(requestPermission).toHaveBeenCalledTimes(2);
    expect(
      screen.getByText(
        'Browser launch alerts are blocked. Change notification permission in your browser settings to enable them.'
      )
    ).toBeInTheDocument();
  });

  it('reports a denied clipboard write and supports a focused retry', async () => {
    const user = userEvent.setup();
    const writeText = vi
      .fn()
      .mockRejectedValueOnce(new DOMException('Permission denied'))
      .mockResolvedValueOnce(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    render(<AddToCalendar launch={UPCOMING_LAUNCHES[0]} />);

    await user.click(
      screen.getByRole('button', { name: 'Add to calendar' })
    );
    const copy = screen.getByRole('button', {
      name: 'Copy launch details',
    });
    await user.click(copy);

    expect(
      await screen.findByRole('button', { name: 'Copy failed — try again' })
    ).toHaveFocus();
    expect(copy).not.toBeDisabled();
    expect(copy).toHaveAttribute('aria-disabled', 'false');
    expect(copy).toHaveAttribute('aria-busy', 'false');
    expect(
      screen.getByText(
        'Could not copy launch details. Try again or use a calendar option.'
      )
    ).toBeInTheDocument();

    await user.click(copy);

    expect(
      await screen.findByRole('button', { name: 'Details copied' })
    ).toHaveFocus();
    expect(writeText).toHaveBeenCalledTimes(2);
    expect(
      screen.getByText('Launch details copied to clipboard')
    ).toBeInTheDocument();
  });
});
