import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ShareMissionButton from '@/components/ShareMissionButton';
import { UPCOMING_LAUNCHES } from '../fixtures/launches';

function setBrowserSharing({
  share,
  writeText,
}: {
  share?: Navigator['share'];
  writeText: (value: string) => Promise<void>;
}): void {
  Object.defineProperty(navigator, 'share', {
    configurable: true,
    value: share,
  });
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText },
  });
}

describe('ShareMissionButton', () => {
  it('copies a canonical mission link and retains keyboard focus', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    setBrowserSharing({ writeText });
    render(<ShareMissionButton launch={UPCOMING_LAUNCHES[0]} />);

    const share = screen.getByRole('button', { name: 'Share mission' });
    share.focus();
    await user.keyboard('{Enter}');

    expect(writeText).toHaveBeenCalledWith(
      'http://localhost:3000/launch/ll2-demo-orbital-dawn'
    );
    expect(
      screen.getByRole('button', { name: 'Link copied' })
    ).toHaveFocus();
    expect(screen.getByText('Canonical mission link copied to clipboard.'))
      .toBeInTheDocument();
  });

  it('shows an actionable retry state when sharing is unavailable', async () => {
    const user = userEvent.setup();
    setBrowserSharing({
      share: vi.fn().mockRejectedValue(new Error('Share unavailable')),
      writeText: vi.fn().mockRejectedValue(new Error('Clipboard blocked')),
    });
    render(<ShareMissionButton launch={UPCOMING_LAUNCHES[0]} compact />);

    const share = screen.getByRole('button', { name: 'Share' });
    share.focus();
    await user.keyboard('{Enter}');

    expect(screen.getByRole('button', { name: 'Retry share' })).toHaveFocus();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Automatic sharing is unavailable. Select and copy the canonical link below.'
    );
    const manualLink = screen.getByRole('textbox', {
      name: 'Canonical mission link',
    });
    expect(manualLink).toHaveValue(
      'http://localhost:3000/launch/ll2-demo-orbital-dawn'
    );

    await user.click(manualLink);

    expect(manualLink).toHaveFocus();
    expect(manualLink).toHaveProperty('selectionStart', 0);
    expect(manualLink).toHaveProperty(
      'selectionEnd',
      'http://localhost:3000/launch/ll2-demo-orbital-dawn'.length
    );
  });
});
