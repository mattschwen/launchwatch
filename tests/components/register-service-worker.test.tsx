import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Link from 'next/link';

describe('RegisterServiceWorker', () => {
  const originalSecureContext = window.isSecureContext;

  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('NODE_ENV', 'production');
    Object.defineProperty(window, 'isSecureContext', {
      configurable: true,
      value: true,
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    Object.defineProperty(window, 'isSecureContext', {
      configurable: true,
      value: originalSecureContext,
    });
  });

  it('announces and applies a waiting service-worker update', async () => {
    const user = userEvent.setup();
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      x: 12,
      y: 613,
      width: 369,
      height: 158,
      top: 613,
      right: 381,
      bottom: 771,
      left: 12,
      toJSON: () => ({}),
    });
    const waitingWorker = { postMessage: vi.fn() };
    const registrationListeners = new Map<string, EventListener>();
    const registration = {
      waiting: waitingWorker,
      installing: null,
      update: vi.fn().mockResolvedValue(undefined),
      addEventListener: vi.fn((type: string, listener: EventListener) => {
        registrationListeners.set(type, listener);
      }),
      removeEventListener: vi.fn(),
    };
    const workerListeners = new Map<string, EventListener>();
    const serviceWorker = {
      controller: {},
      register: vi.fn().mockResolvedValue(registration),
      addEventListener: vi.fn((type: string, listener: EventListener) => {
        workerListeners.set(type, listener);
      }),
      removeEventListener: vi.fn(),
    };
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: serviceWorker,
    });

    const { default: RegisterServiceWorker } = await import('@/app/register-sw');
    const { unmount } = render(<RegisterServiceWorker />);
    window.dispatchEvent(new Event('load'));

    await waitFor(() => {
      expect(serviceWorker.register).toHaveBeenCalledWith('/sw.js', {
        scope: '/',
        updateViaCache: 'none',
      });
    });
    expect(
      await screen.findByRole('button', { name: 'Update now' })
    ).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Later' })
    ).toBeVisible();
    await waitFor(() => {
      expect(document.documentElement).toHaveAttribute(
        'data-pwa-update-visible',
        'true'
      );
    });
    expect(
      document.documentElement.style.getPropertyValue('--pwa-update-clearance')
    ).toBe(`${window.innerHeight - 613 + 16}px`);

    const updateButton = screen.getByRole('button', { name: 'Update now' });
    updateButton.focus();
    await user.keyboard('{Enter}');

    expect(waitingWorker.postMessage).toHaveBeenCalledWith({
      type: 'SKIP_WAITING',
    });
    const applyingButton = screen.getByRole('button', { name: 'Updating…' });
    expect(applyingButton).not.toBeDisabled();
    expect(applyingButton).toHaveAttribute('aria-disabled', 'true');
    expect(applyingButton).toHaveAttribute('aria-busy', 'true');
    expect(applyingButton).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Later' })).toHaveAttribute(
      'aria-disabled',
      'true'
    );
    await user.keyboard('{Enter}');
    expect(waitingWorker.postMessage).toHaveBeenCalledTimes(1);
    expect(registrationListeners.has('updatefound')).toBe(true);
    expect(workerListeners.has('controllerchange')).toBe(true);

    unmount();
    expect(document.documentElement).not.toHaveAttribute(
      'data-pwa-update-visible'
    );
    expect(
      document.documentElement.style.getPropertyValue('--pwa-update-clearance')
    ).toBe('');
  });

  it('postpones a waiting update, restores focus, and offers it again after returning', async () => {
    const user = userEvent.setup();
    const waitingWorker = { postMessage: vi.fn() };
    const registration = {
      waiting: waitingWorker,
      installing: null,
      update: vi.fn().mockResolvedValue(undefined),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    const serviceWorker = {
      controller: {},
      register: vi.fn().mockResolvedValue(registration),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: serviceWorker,
    });

    const { default: RegisterServiceWorker } = await import('@/app/register-sw');
    render(
      <>
        <button type="button">Continue mission</button>
        <RegisterServiceWorker />
      </>
    );
    const workflowControl = screen.getByRole('button', {
      name: 'Continue mission',
    });
    workflowControl.focus();
    window.dispatchEvent(new Event('load'));

    const later = await screen.findByRole('button', { name: 'Later' });
    later.focus();
    await user.keyboard('{Enter}');

    expect(
      screen.queryByRole('complementary', { name: 'Mission control update' })
    ).not.toBeInTheDocument();
    expect(waitingWorker.postMessage).not.toHaveBeenCalled();
    await waitFor(() => expect(workflowControl).toHaveFocus());
    expect(document.documentElement).not.toHaveAttribute(
      'data-pwa-update-visible'
    );
    expect(
      document.documentElement.style.getPropertyValue('--pwa-update-clearance')
    ).toBe('');

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    });
    document.dispatchEvent(new Event('visibilitychange'));

    await waitFor(() => expect(registration.update).toHaveBeenCalledOnce());
    expect(
      await screen.findByRole('button', { name: 'Update now' })
    ).toBeVisible();
    expect(workflowControl).toHaveFocus();
  });

  it('handles same-route navigation inside the retained app while offline', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    const registration = {
      waiting: null,
      installing: null,
      update: vi.fn().mockResolvedValue(undefined),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        controller: {},
        register: vi.fn().mockResolvedValue(registration),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
    });

    const { default: RegisterServiceWorker } = await import('@/app/register-sw');
    render(
      <>
        <Link href="/?search=polaris">Refine current schedule</Link>
        <RegisterServiceWorker />
      </>
    );

    const link = screen.getByRole('link', {
      name: 'Refine current schedule',
    });
    const popState = vi.fn();
    window.addEventListener('popstate', popState);
    const click = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      button: 0,
    });

    expect(link.dispatchEvent(click)).toBe(false);
    expect(click.defaultPrevented).toBe(true);
    expect(window.location.search).toBe('?search=polaris');
    expect(popState).toHaveBeenCalledOnce();

    window.removeEventListener('popstate', popState);
    window.history.replaceState(null, '', '/');
  });
});
