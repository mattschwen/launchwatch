import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import LaunchMap from '@/components/LaunchMap';
import type { Launch } from '@/lib/types';
import { UPCOMING_LAUNCHES } from '../fixtures/launches';

function launchAt(
  id: string,
  name: string,
  lat: number,
  lng: number,
  countryCode: string,
  overrides: Partial<Launch> = {}
): Launch {
  return {
    ...UPCOMING_LAUNCHES[0],
    id,
    sourceId: id,
    name: `${name} mission`,
    location: { name, lat, lng, countryCode },
    ...overrides,
  };
}

const MAP_LAUNCHES = [
  launchAt('vandenberg-one', 'Vandenberg SFB', 34.632, -120.611, 'US', {
    isLive: true,
    status: 'live',
    statusName: 'Live',
  }),
  launchAt('vandenberg-two', 'Vandenberg SFB', 34.72, -120.62, 'US'),
  launchAt('cape', 'Cape Canaveral SFS', 28.562, -80.577, 'US'),
  launchAt('guiana', 'Guiana Space Centre', 5.236, -52.768, 'GF'),
  launchAt('wenchang', 'Wenchang Space Launch Site', 19.614, 110.951, 'CN'),
];

describe('LaunchMap', () => {
  it('groups duplicate locations and terminates offscreen routes intentionally', async () => {
    const user = userEvent.setup();
    const { container } = render(<LaunchMap launches={MAP_LAUNCHES} />);

    await waitFor(() => {
      expect(
        container.querySelector('[data-focus-label="Vandenberg SFB"]')
      ).toBeInTheDocument();
    });

    expect(screen.getByText('04')).toBeVisible();
    expect(screen.getByRole('button', { name: /Vandenberg SFB.*2×/i }))
      .toBePressed();
    expect(
      container.querySelectorAll('[data-route-offscreen="true"]').length
    ).toBeGreaterThan(0);
    expect(
      container.querySelectorAll('[data-route-edge]').length
    ).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: 'Expand map' }));

    expect(
      await screen.findByRole('dialog', { name: 'Expanded mission map' })
    ).toBeVisible();
    await waitFor(() => {
      expect(
        container.querySelector('[data-map-zoom="3.2"]')
      ).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Zoom in' }));

    await waitFor(() => {
      expect(
        container.querySelector('[data-map-zoom="4.3"]')
      ).toBeInTheDocument();
    });
    expect(screen.getByText(/manual track/i)).toBeVisible();
  });
});
