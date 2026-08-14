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
  localStorage.clear();
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

  it('keeps expanded top menus below the sticky header', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(851);
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
      function (this: HTMLElement) {
        if (this.tagName === 'HEADER') {
          return {
            bottom: 70,
            height: 70,
            left: 0,
            right: 393,
            top: 0,
            width: 393,
            x: 0,
            y: 0,
            toJSON: () => ({}),
          };
        }
        return {
          bottom: 474,
          height: 44,
          left: 32,
          right: 192,
          top: 430,
          width: 160,
          x: 32,
          y: 430,
          toJSON: () => ({}),
        };
      }
    );

    render(
      <div className="app-shell">
        <header />
        <AddToCalendar
          launch={UPCOMING_LAUNCHES[0]}
          menuPlacement="top"
        />
      </div>
    );

    await user.click(screen.getByRole('button', { name: 'Add to calendar' }));

    expect(
      screen.getByRole('group', { name: 'Calendar options' })
    ).toHaveStyle({ maxHeight: '352px' });
    expect(
      screen.getByRole('group', { name: 'Calendar options' })
    ).toHaveClass('bottom-full', 'overflow-y-auto', 'overscroll-contain');
  });

  it('keeps a scrollable top menu when compact telemetry leaves its interaction floor', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(568);
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
      function (this: HTMLElement) {
        if (this.tagName === 'HEADER') {
          return {
            bottom: 70,
            height: 70,
            left: 0,
            right: 320,
            top: 0,
            width: 320,
            x: 0,
            y: 0,
            toJSON: () => ({}),
          };
        }
        return {
          bottom: 244,
          height: 44,
          left: 16,
          right: 152,
          top: 200,
          width: 136,
          x: 16,
          y: 200,
          toJSON: () => ({}),
        };
      },
    );

    render(
      <div className="app-shell">
        <header />
        <AddToCalendar
          launch={UPCOMING_LAUNCHES[0]}
          menuPlacement="top"
        />
      </div>,
    );

    await user.click(screen.getByRole('button', { name: 'Add to calendar' }));

    expect(
      screen.getByRole('group', { name: 'Calendar options' }),
    ).toHaveStyle({ maxHeight: '122px' });
    expect(
      screen.getByRole('group', { name: 'Calendar options' }),
    ).toHaveClass('bottom-full');
  });

  it('identifies the Google Calendar handoff as a new-tab action', async () => {
    const user = userEvent.setup();

    render(<AddToCalendar launch={UPCOMING_LAUNCHES[0]} />);

    await user.click(
      screen.getByRole('button', { name: 'Add to calendar' })
    );

    expect(
      screen.getByRole('button', {
        name: /Google Calendar.*opens in a new tab/i,
      })
    ).toBeVisible();
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
      name: 'Enable alerts for all launches',
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
        name: 'Pause all launch alerts',
      })
    ).toHaveFocus();
    expect(alerts).not.toBeDisabled();
    expect(alerts).toHaveAttribute('aria-busy', 'false');
    expect(alerts).toHaveAttribute('aria-disabled', 'false');
    expect(
      screen.getByText(
        'Browser alerts are active for every calendar-ready mission while LaunchWatch is open. Activate this command to pause them.'
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
      screen.getByRole('button', { name: 'Enable alerts for all launches' })
    );

    expect(
      await screen.findByRole('button', {
        name: 'Pause all launch alerts',
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

  it('keeps pause and resume available after browser permission is granted', async () => {
    const user = userEvent.setup();
    Object.defineProperty(window, 'Notification', {
      configurable: true,
      value: {
        permission: 'granted',
        requestPermission: vi.fn(),
      },
    });

    render(<AddToCalendar launch={UPCOMING_LAUNCHES[0]} />);

    await user.click(screen.getByRole('button', { name: 'Add to calendar' }));
    const pause = screen.getByRole('button', {
      name: 'Pause all launch alerts',
    });
    await user.click(pause);

    const resume = screen.getByRole('button', {
      name: 'Resume all launch alerts',
    });
    expect(resume).toHaveFocus();
    expect(resume).toHaveAttribute('aria-disabled', 'false');
    expect(localStorage.getItem('launchwatch-alerts-enabled')).toBe('paused');
    expect(
      screen.getByText(
        'Browser launch alerts are paused. Activate this command to resume alerts for every calendar-ready mission.'
      )
    ).toBeInTheDocument();

    await user.click(resume);
    expect(
      screen.getByRole('button', { name: 'Pause all launch alerts' })
    ).toHaveFocus();
    expect(localStorage.getItem('launchwatch-alerts-enabled')).toBe('enabled');
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
      name: 'Enable alerts for all launches',
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
        'Could not copy launch details. A selectable manual copy fallback is available.'
      )
    ).toBeInTheDocument();
    const fallback = screen.getByRole('textbox', {
      name: 'Manual copy fallback',
    });
    expect((fallback as HTMLTextAreaElement).value).toContain(
      'Mission details: https://www.launchwatch.io/launch/ll2-demo-orbital-dawn'
    );
    expect(fallback).toHaveAccessibleDescription(
      'Select the mission brief below if clipboard access stays blocked.'
    );

    await user.click(fallback);
    expect(fallback).toHaveFocus();
    expect(fallback).toHaveProperty('selectionStart', 0);
    expect(fallback).toHaveProperty(
      'selectionEnd',
      (fallback as HTMLTextAreaElement).value.length
    );

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
