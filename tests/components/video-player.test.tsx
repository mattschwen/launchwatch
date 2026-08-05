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
    expect(scheduled).toHaveClass('action-button-secondary');
    expect(scheduled).not.toHaveClass('action-button-stream');

    rerender(
      <VideoPlayer
        url="https://x.com/i/broadcasts/scheduled-mission"
        live
      />
    );

    expect(
      screen.getByRole('link', { name: 'Open provider stream' })
    ).toHaveClass('action-button-stream');
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
});
