import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
});
