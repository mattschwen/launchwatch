import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import WatchSectionIndex from '@/components/watch/WatchSectionIndex';

const sectionIds = [
  'watch-coverage',
  'watch-queue',
  'watch-mission',
  'watch-intelligence',
  'watch-trajectory',
];

function renderIndex(): void {
  render(
    <>
      <WatchSectionIndex />
      {sectionIds.map((id) => (
        <section key={id} id={id} tabIndex={-1}>
          {id}
        </section>
      ))}
    </>,
  );
}

beforeEach(() => {
  window.history.replaceState({}, '', '/watch?id=ll2-demo-orbital-dawn');
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
  Element.prototype.scrollBy = vi.fn();
});

afterEach(() => {
  window.history.replaceState({}, '', '/');
});

describe('WatchSectionIndex', () => {
  it('preserves the selected mission while revealing and focusing a section', async () => {
    const user = userEvent.setup();
    renderIndex();

    await user.click(screen.getByRole('link', { name: 'Intel' }));

    expect(window.location.pathname).toBe('/watch');
    expect(window.location.search).toBe('?id=ll2-demo-orbital-dawn');
    expect(window.location.hash).toBe('#watch-intelligence');
    expect(document.getElementById('watch-intelligence')).toHaveFocus();
    expect(screen.getByRole('link', { name: 'Intel' })).toHaveAttribute(
      'aria-current',
      'location',
    );
  });

  it('moves keyboard focus through the compact section rail', async () => {
    const user = userEvent.setup();
    renderIndex();
    const coverage = screen.getByRole('link', { name: 'Coverage' });
    const queue = screen.getByRole('link', { name: 'Queue' });
    const path = screen.getByRole('link', { name: 'Path' });

    coverage.focus();
    await user.keyboard('{ArrowRight}');
    expect(queue).toHaveFocus();
    await user.keyboard('{End}');
    expect(path).toHaveFocus();
    await user.keyboard('{Home}');
    expect(coverage).toHaveFocus();
  });

  it('restores a deep-linked section after the watch console mounts', async () => {
    window.history.replaceState(
      {},
      '',
      '/watch?id=ll2-demo-orbital-dawn#watch-trajectory',
    );
    renderIndex();

    await waitFor(() =>
      expect(screen.getByRole('link', { name: 'Path' })).toHaveAttribute(
        'aria-current',
        'location',
      ),
    );
    expect(window.scrollTo).toHaveBeenCalled();
  });
});
