import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import FilterBar from '@/components/FilterBar';

describe('FilterBar', () => {
  it('keeps filter categories and the reset action visible', () => {
    render(<FilterBar onFilterChange={vi.fn()} />);

    for (const label of [
      'Search launches',
      'Provider',
      'Status',
      'Sort launches',
    ]) {
      expect(screen.getByText(label, { selector: 'label' })).toBeVisible();
    }

    expect(
      screen.getByRole('button', { name: 'Clear launch filters' })
    ).toHaveTextContent('Clear filters');
    expect(
      screen.getByRole('searchbox', { name: 'Search launches' })
    ).toHaveAttribute('maxlength', '120');
    expect(
      screen.getByRole('option', { name: 'Timing pending' })
    ).toHaveValue('tbd');
  });

  it('renders the current providers and emits the selected provider name', async () => {
    const user = userEvent.setup();
    const onFilterChange = vi.fn();
    render(
      <FilterBar
        onFilterChange={onFilterChange}
        providerOptions={[
          'China Aerospace Science and Technology Corporation',
          'SpaceX',
        ]}
      />
    );

    const provider = screen.getByRole('combobox', { name: 'Provider' });
    expect(
      screen.getByRole('option', {
        name: 'China Aerospace Science and Technology Corporation',
      })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('option', { name: 'NASA' })
    ).not.toBeInTheDocument();

    await user.selectOptions(
      provider,
      'China Aerospace Science and Technology Corporation'
    );

    expect(onFilterChange).toHaveBeenLastCalledWith({
      search: '',
      provider: 'China Aerospace Science and Technology Corporation',
      status: 'all',
      sortBy: 'date-asc',
    });
  });

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

  it('treats whitespace-only search input as an inactive filter', async () => {
    const user = userEvent.setup();
    const onFilterChange = vi.fn();
    render(<FilterBar onFilterChange={onFilterChange} />);

    const search = screen.getByRole('searchbox', {
      name: 'Search launches',
    });
    const clear = screen.getByRole('button', {
      name: 'Clear launch filters',
    });

    await user.type(search, '   ');

    expect(search).toHaveValue('   ');
    expect(clear).toBeDisabled();
    expect(onFilterChange).toHaveBeenLastCalledWith({
      search: '   ',
      provider: 'all',
      status: 'all',
      sortBy: 'date-asc',
    });
  });

  it('keeps a selected provider visible when it is absent from the current feed', () => {
    render(
      <FilterBar
        initialFilters={{ provider: 'Retired Provider' }}
        providerOptions={['SpaceX']}
        onFilterChange={vi.fn()}
      />
    );

    const provider = screen.getByRole('combobox', { name: 'Provider' });
    expect(provider).toHaveValue('Retired Provider');
    expect(
      screen.getByRole('option', {
        name: 'Retired Provider — not in current feed',
      })
    ).toBeInTheDocument();
  });

  it('clears filters restored from navigation back to product defaults', async () => {
    const user = userEvent.setup();
    const onFilterChange = vi.fn();
    render(
      <FilterBar
        initialFilters={{ search: 'Polaris', provider: 'SpaceX' }}
        providerOptions={['SpaceX']}
        onFilterChange={onFilterChange}
      />
    );

    const search = screen.getByRole('searchbox', {
      name: 'Search launches',
    });
    const clear = screen.getByRole('button', {
      name: 'Clear launch filters',
    });

    expect(search).toHaveValue('Polaris');
    expect(clear).toBeEnabled();
    await user.click(clear);

    expect(search).toHaveValue('');
    expect(screen.getByRole('combobox', { name: 'Provider' })).toHaveValue(
      'all'
    );
    expect(onFilterChange).toHaveBeenLastCalledWith({
      search: '',
      provider: 'all',
      status: 'all',
      sortBy: 'date-asc',
    });
    await waitFor(() => expect(search).toHaveFocus());
  });
});
