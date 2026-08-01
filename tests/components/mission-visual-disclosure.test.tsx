import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import MissionVisualDisclosure from '@/components/launch/MissionVisualDisclosure';
import { UPCOMING_LAUNCHES } from '../fixtures/launches';

describe('MissionVisualDisclosure', () => {
  it('keeps optional mission imagery behind a keyboard-safe disclosure', async () => {
    const user = userEvent.setup();
    const launch = UPCOMING_LAUNCHES[0];

    render(
      <MissionVisualDisclosure launch={launch} loading={false} error={null} />
    );

    const showVisual = screen.getByRole('button', {
      name: `Show mission visual for ${launch.name}`,
    });
    expect(showVisual).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('figure')).not.toBeInTheDocument();

    showVisual.focus();
    await user.keyboard('{Enter}');

    const hideVisual = screen.getByRole('button', {
      name: `Hide mission visual for ${launch.name}`,
    });
    expect(hideVisual).toHaveFocus();
    expect(hideVisual).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('figure')).toBeVisible();
  });
});
