import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import PwaInstallButton from '@/components/PwaInstallButton';

function offerInstall({
  outcome = 'accepted',
  prompt = vi.fn().mockResolvedValue(undefined),
}: {
  outcome?: 'accepted' | 'dismissed';
  prompt?: ReturnType<typeof vi.fn>;
} = {}): { event: Event; prompt: ReturnType<typeof vi.fn> } {
  const event = new Event('beforeinstallprompt', { cancelable: true });
  Object.defineProperties(event, {
    prompt: { value: prompt },
    userChoice: {
      value: Promise.resolve({ outcome, platform: 'web' }),
    },
  });
  act(() => window.dispatchEvent(event));
  return { event, prompt };
}

describe('PwaInstallButton', () => {
  it('appears only after an eligible browser offers installation', () => {
    render(<PwaInstallButton />);

    expect(
      screen.queryByRole('button', { name: 'Install LaunchWatch' }),
    ).not.toBeInTheDocument();

    const { event } = offerInstall();

    expect(event).toBeInstanceOf(Event);
    expect(event.defaultPrevented).toBe(true);
    expect(
      screen.getByRole('button', { name: 'Install LaunchWatch' }),
    ).toBeVisible();
  });

  it('opens the browser installer once and confirms an accepted choice', async () => {
    const user = userEvent.setup();
    render(<PwaInstallButton />);
    const { prompt } = offerInstall();

    const install = screen.getByRole('button', {
      name: 'Install LaunchWatch',
    });
    await user.click(install);

    expect(prompt).toHaveBeenCalledOnce();
    const accepted = await screen.findByRole('button', {
      name: 'Installation accepted',
    });
    expect(accepted).toHaveAttribute('aria-disabled', 'true');
    expect(accepted).toHaveAttribute('aria-busy', 'false');
    expect(
      screen.getByText('LaunchWatch installation accepted by the browser.'),
    ).toBeInTheDocument();

    await user.click(accepted);
    expect(prompt).toHaveBeenCalledOnce();
  });

  it('withdraws the action after the browser dismisses installation', async () => {
    const user = userEvent.setup();
    render(<PwaInstallButton />);
    offerInstall({ outcome: 'dismissed' });

    await user.click(
      screen.getByRole('button', { name: 'Install LaunchWatch' }),
    );

    await waitFor(() => {
      expect(
        screen.queryByRole('button', { name: 'Install LaunchWatch' }),
      ).not.toBeInTheDocument();
    });
  });

  it('reports an installer failure without leaving a reusable false action', async () => {
    const user = userEvent.setup();
    render(<PwaInstallButton />);
    const prompt = vi.fn().mockRejectedValue(new Error('Prompt unavailable'));
    offerInstall({ prompt });

    await user.click(
      screen.getByRole('button', { name: 'Install LaunchWatch' }),
    );

    const unavailable = await screen.findByRole('button', {
      name: 'Install unavailable',
    });
    expect(unavailable).toHaveAttribute('aria-disabled', 'true');
    expect(
      screen.getByText('LaunchWatch could not open the browser installer.'),
    ).toBeInTheDocument();
    await user.click(unavailable);
    expect(prompt).toHaveBeenCalledOnce();
  });

  it('replaces an outstanding action with installed feedback', () => {
    render(<PwaInstallButton />);
    offerInstall();

    act(() => window.dispatchEvent(new Event('appinstalled')));

    expect(
      screen.getByRole('button', { name: 'LaunchWatch installed' }),
    ).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByText('LaunchWatch was installed.')).toBeInTheDocument();
  });
});

