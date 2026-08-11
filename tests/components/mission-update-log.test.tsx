import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import MissionUpdateLog from '@/components/launch/MissionUpdateLog';
import type { LaunchProviderUpdate } from '@/lib/types';

const UPDATES: LaunchProviderUpdate[] = [
  {
    id: '4103',
    comment: 'Now targeting Jul 29 at 02:00 UTC.',
    createdAt: '2035-07-28T09:15:00.000Z',
    sourceUrl: 'https://example.test/mission-update',
  },
  {
    id: '4102',
    comment: 'Launch weather improved to 85% GO.',
    createdAt: '2035-07-27T18:42:00.000Z',
    sourceUrl: null,
  },
];

describe('MissionUpdateLog', () => {
  it('renders the latest provider notes with safe source affordances', () => {
    render(<MissionUpdateLog providerUpdates={UPDATES} />);

    const region = screen.getByRole('region', {
      name: 'Latest mission updates',
    });
    expect(within(region).getAllByRole('listitem')).toHaveLength(2);
    expect(region).toHaveTextContent('Now targeting Jul 29 at 02:00 UTC.');
    expect(region).toHaveTextContent('Jul 28, 2035, 09:15 UTC');
    expect(region).toHaveTextContent('Cited source unavailable');

    const source = within(region).getByRole('link', {
      name: /Open cited source.*opens in a new tab/i,
    });
    expect(source).toHaveAttribute('href', 'https://example.test/mission-update');
    expect(source).toHaveAttribute('target', '_blank');
    expect(source).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('uses only the newest note in compact mission briefings', () => {
    render(<MissionUpdateLog providerUpdates={UPDATES} compact />);

    expect(screen.getByText('Latest provider update')).toBeVisible();
    expect(screen.getByText(UPDATES[0].comment)).toBeVisible();
    expect(screen.queryByText(UPDATES[1].comment)).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('omits an unavailable provider log', () => {
    const { container } = render(<MissionUpdateLog providerUpdates={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
