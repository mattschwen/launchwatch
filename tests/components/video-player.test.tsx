import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import VideoPlayer from '@/components/video/VideoPlayer';

describe('VideoPlayer coverage state', () => {
  it('keeps scheduled external coverage distinct from a live broadcast', () => {
    const { rerender } = render(
      <VideoPlayer url="https://x.com/i/broadcasts/scheduled-mission" />
    );

    const scheduled = screen.getByRole('link', {
      name: 'Open provider stream',
    });
    expect(scheduled.closest('.stream-surface')).toHaveClass('signal-cold');
    expect(scheduled).toHaveClass('action-button-secondary');
    expect(scheduled).not.toHaveClass('action-button-stream');

    rerender(
      <VideoPlayer
        url="https://x.com/i/broadcasts/scheduled-mission"
        live
      />
    );

    const live = screen.getByRole('link', { name: 'Open provider stream' });
    expect(live.closest('.stream-surface')).toHaveClass('signal-live');
    expect(live).toHaveClass('action-button-stream');
  });

  it('uses the same distinction before an embedded provider video loads', () => {
    const { rerender } = render(
      <VideoPlayer
        url="https://www.youtube.com/watch?v=official-mission"
        title="Orbital Dawn"
      />
    );

    expect(
      screen.getByRole('button', { name: 'Load video for Orbital Dawn' })
    ).toHaveClass('action-button-secondary');

    rerender(
      <VideoPlayer
        url="https://www.youtube.com/watch?v=official-mission"
        title="Orbital Dawn"
        live
      />
    );

    expect(
      screen.getByRole('button', { name: 'Load video for Orbital Dawn' })
    ).toHaveClass('action-button-stream');
  });

  it('uses the caution signal when no provider coverage is confirmed', () => {
    const { container } = render(<VideoPlayer url={null} />);

    expect(container.querySelector('.stream-surface')).toHaveClass(
      'signal-warm'
    );
    expect(
      screen.getByText('Stream availability has not been confirmed.')
    ).toBeVisible();
  });
});
