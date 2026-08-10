import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import VideoPlayer from '@/components/video/VideoPlayer';

describe('VideoPlayer coverage state', () => {
  it('moves keyboard focus into a video after deferred loading', async () => {
    const user = userEvent.setup();
    render(
      <VideoPlayer
        url="https://www.youtube.com/watch?v=official-mission"
        title="Orbital Dawn"
      />
    );

    const loadVideo = screen.getByRole('button', {
      name: 'Load video for Orbital Dawn',
    });
    loadVideo.focus();
    await user.keyboard('{Enter}');

    expect(screen.getByTitle('Orbital Dawn')).toHaveFocus();
    expect(
      screen.getByRole('link', {
        name: /Open exact video.*new tab/i,
      })
    ).toHaveAttribute(
      'href',
      'https://www.youtube.com/watch?v=official-mission'
    );
  });

  it('offers an exact YouTube handoff before loading the embed', () => {
    render(
      <VideoPlayer
        url="https://youtu.be/official-mission?feature=shared"
        title="Orbital Dawn"
      />
    );

    expect(screen.getByText('Choose playback')).toBeVisible();
    expect(
      screen.getByText(/LaunchWatch never receives your Google credentials/i)
    ).toBeVisible();
    expect(
      screen.getByRole('link', { name: /Open on YouTube.*new tab/i })
    ).toHaveAttribute(
      'href',
      'https://www.youtube.com/watch?v=official-mission'
    );
  });

  it('keeps the exact YouTube recovery visible for autoplaying coverage', () => {
    render(
      <VideoPlayer
        url="https://www.youtube.com/embed/official-live"
        title="Orbital Dawn"
        autoplay
        live
      />
    );

    expect(screen.getByTitle('Orbital Dawn')).toHaveAttribute(
      'referrerpolicy',
      'strict-origin-when-cross-origin'
    );
    expect(screen.getByText('YouTube sign-in stays on YouTube')).toBeVisible();
    expect(
      screen.getByRole('link', { name: /Open exact video.*new tab/i })
    ).toHaveAttribute(
      'href',
      'https://www.youtube.com/watch?v=official-live'
    );
  });

  it('keeps scheduled external coverage distinct from a live broadcast', () => {
    const { rerender } = render(
      <VideoPlayer url="https://x.com/i/broadcasts/scheduled-mission" />
    );

    const scheduled = screen.getByRole('link', {
      name: /Open provider stream.*new tab/i,
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

    const live = screen.getByRole('link', {
      name: /Open provider stream.*new tab/i,
    });
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
