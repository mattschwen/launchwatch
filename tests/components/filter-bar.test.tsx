import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import FilterBar from '@/components/FilterBar';

describe('FilterBar', () => {
  it('restores focus to search after clearing active filters', async () => {
    const user = userEvent.setup();
    const onFilterChange = vi.fn();
    render(<FilterBar onFilterChange={onFilterChange} />);

    const search = screen.getByRole('searchbox', {
      name: 'Search launches',
    });
    const clear = screen.getByRole('button', {
      name: 'Clear launch filters',
    });

    await user.type(search, 'Polaris');
    expect(clear).toBeEnabled();

    clear.focus();
    await user.keyboard('{Enter}');

    expect(search).toHaveValue('');
    expect(clear).toBeDisabled();
    expect(onFilterChange).toHaveBeenLastCalledWith({
      search: '',
      provider: 'all',
      status: 'all',
      sortBy: 'date-asc',
    });
    await waitFor(() => expect(search).toHaveFocus());
  });
});
