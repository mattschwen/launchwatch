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
      name: 'Try privacy-enhanced embedded video for Orbital Dawn',
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

    expect(screen.getByText('Recommended playback')).toBeVisible();
    expect(
      screen.getByText(/Embedded playback can ask you to sign in again/i)
    ).toBeVisible();
    expect(
      screen.getByText(/LaunchWatch never receives your Google credentials/i)
    ).toBeVisible();
    expect(
      screen.getByRole('link', { name: /Watch on YouTube.*new tab/i })
    ).toHaveAttribute(
      'href',
      'https://www.youtube.com/watch?v=official-mission'
    );
    expect(
      screen.getByRole('link', { name: /Watch on YouTube.*new tab/i })
    ).toHaveClass('action-button-primary');
    expect(
      screen.getByRole('button', {
        name: 'Try privacy-enhanced embedded video for Orbital Dawn',
      })
    ).toHaveClass('action-button-secondary');
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
    expect(screen.getByText('Embedded session blocked?')).toBeVisible();
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

  it('keeps signed-in YouTube playback primary before an embed loads', () => {
    const { rerender } = render(
      <VideoPlayer
        url="https://www.youtube.com/watch?v=official-mission"
        title="Orbital Dawn"
      />
    );

    expect(
      screen.getByRole('link', { name: /Watch on YouTube.*new tab/i })
    ).toHaveClass('action-button-primary');
    expect(
      screen.getByRole('button', {
        name: 'Try privacy-enhanced embedded video for Orbital Dawn',
      })
    ).toHaveClass('action-button-secondary');

    rerender(
      <VideoPlayer
        url="https://www.youtube.com/watch?v=official-mission"
        title="Orbital Dawn"
        live
      />
    );

    expect(
      screen.getByRole('link', { name: /Watch on YouTube.*new tab/i })
    ).toHaveClass('action-button-stream');
    expect(
      screen.getByRole('button', {
        name: 'Try privacy-enhanced embedded video for Orbital Dawn',
      })
    ).toHaveClass('action-button-secondary');
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
