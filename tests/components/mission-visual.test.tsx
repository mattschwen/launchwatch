import type { ImgHTMLAttributes } from 'react';
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import MissionVisual from '@/components/launch/MissionVisual';
import {
  getLaunchVisualMetadata,
  isSupportedLaunchVisualUrl,
  selectLaunchVisual,
} from '@/lib/launch-visual';
import type { Launch, LaunchVisual } from '@/lib/types';
import { UPCOMING_LAUNCHES } from '../fixtures/launches';

vi.mock('next/image', async () => {
  const { createElement } = await import('react');

  return {
    default: ({
      fill,
      priority,
      ...props
    }: ImgHTMLAttributes<HTMLImageElement> & {
      fill?: boolean;
      priority?: boolean;
    }) =>
      createElement('img', {
        ...props,
        'data-fill': String(Boolean(fill)),
        'data-priority': String(Boolean(priority)),
      }),
  };
});

function licensedVisual(
  kind: LaunchVisual['kind'] = 'vehicle',
  overrides: Partial<LaunchVisual> = {}
): LaunchVisual {
  return {
    kind,
    url: `/${kind}-visual.jpg`,
    thumbnailUrl: `/${kind}-visual-thumbnail.jpg`,
    name: kind === 'vehicle' ? 'Astra Nova' : 'Orbital Dawn',
    credit: 'Mission Imaging Team',
    licenseName: 'CC BY 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    singleUse: false,
    sourceLabel: 'Launch Library 2',
    sourceUrl: 'https://thespacedevs.com/',
    ...overrides,
  };
}

function launchWithVisuals(
  values: {
    vehicleVisual?: LaunchVisual | null;
    missionVisual?: LaunchVisual | null;
  } = {}
): Launch {
  return {
    ...UPCOMING_LAUNCHES[0],
    vehicleVisual: values.vehicleVisual ?? null,
    missionVisual: values.missionVisual ?? null,
  };
}

describe('launch visual selection', () => {
  it('prefers an eligible vehicle reference over mission imagery', () => {
    const selection = selectLaunchVisual(
      launchWithVisuals({
        vehicleVisual: licensedVisual('vehicle'),
        missionVisual: licensedVisual('mission'),
      })
    );

    expect(selection.status).toBe('available');
    expect(selection.visual).toMatchObject({
      kind: 'vehicle',
      url: '/vehicle-visual.jpg',
      credit: 'Mission Imaging Team',
      licenseName: 'CC BY 4.0',
    });
  });

  it('falls back to eligible mission imagery when vehicle rights are ineligible', () => {
    const selection = selectLaunchVisual(
      launchWithVisuals({
        vehicleVisual: licensedVisual('vehicle', {
          licenseName: 'CC BY-ND 4.0',
        }),
        missionVisual: licensedVisual('mission'),
      })
    );

    expect(selection.status).toBe('available');
    expect(selection.visual?.kind).toBe('mission');
  });

  it.each([
    ['unsupported image host', { url: 'https://example.com/rocket.jpg' }],
    ['bare Flickr host', { url: 'https://staticflickr.com/rocket.jpg' }],
    ['missing credit', { credit: '   ' }],
    ['unknown credit', { credit: 'Unknown' }],
    ['unavailable credit', { credit: 'N/A' }],
    ['pending credit', { credit: 'TBD' }],
    ['unknown license', { licenseName: 'Unknown' }],
    ['unapproved license', { licenseName: 'All rights reserved' }],
    ['no-derivatives license', { licenseName: 'CC BY-NC-ND 4.0' }],
    ['insecure license link', { licenseUrl: 'http://creativecommons.org/' }],
    ['single-use media', { singleUse: true }],
    ['missing single-use clearance', { singleUse: undefined }],
  ])('exposes rights-unverified for %s', (_, override) => {
    const selection = selectLaunchVisual(
      launchWithVisuals({
        vehicleVisual: licensedVisual('vehicle', override),
      })
    );

    expect(selection).toEqual({
      status: 'rights-unverified',
      visual: null,
    });
  });

  it.each([
    'CC0 1.0',
    'Creative Commons Zero',
    'Public Domain',
    'CC BY 4.0',
    'CC BY-SA 4.0',
    'CC BY-NC-SA 4.0',
    'Creative Commons Attribution-NonCommercial-ShareAlike 4.0',
  ])('accepts the explicit reusable license %s', (licenseName) => {
    const selection = selectLaunchVisual(
      launchWithVisuals({
        vehicleVisual: licensedVisual('vehicle', { licenseName }),
      })
    );

    expect(selection.status).toBe('available');
  });

  it.each([
    '/test/rocket.jpg',
    'https://thespacedevs-prod.nyc3.digitaloceanspaces.com/media/images/rocket.jpg',
    'https://live.staticflickr.com/65535/rocket.jpg',
    'https://images2.imgbox.com/ab/cd/rocket.jpg',
    'https://i.imgur.com/rocket.jpg',
  ])('accepts the supported image location %s', (url) => {
    expect(isSupportedLaunchVisualUrl(url)).toBe(true);
  });

  it('rejects an LL2-hosted image outside the optimizer media path', () => {
    expect(
      isSupportedLaunchVisualUrl(
        'https://thespacedevs-prod.nyc3.digitaloceanspaces.com/private/rocket.jpg'
      )
    ).toBe(false);
  });

  it('drops an unsupported thumbnail without rejecting the licensed full image', () => {
    const selection = selectLaunchVisual(
      launchWithVisuals({
        vehicleVisual: licensedVisual('vehicle', {
          thumbnailUrl: 'https://example.com/thumbnail.jpg',
        }),
      })
    );

    expect(selection.status).toBe('available');
    expect(selection.visual?.thumbnailUrl).toBeNull();
  });

  it('distinguishes absent media from supplied media with unverifiable rights', () => {
    expect(selectLaunchVisual(launchWithVisuals())).toEqual({
      status: 'missing',
      visual: null,
    });
    expect(
      selectLaunchVisual(
        launchWithVisuals({
          missionVisual: licensedVisual('mission', { credit: undefined }),
        })
      )
    ).toEqual({
      status: 'rights-unverified',
      visual: null,
    });
  });

  it('exposes only an eligible visual to social metadata', () => {
    const eligible = launchWithVisuals({
      vehicleVisual: licensedVisual('vehicle'),
    });
    const ineligible = launchWithVisuals({
      vehicleVisual: licensedVisual('vehicle', {
        singleUse: true,
      }),
    });

    expect(getLaunchVisualMetadata(eligible)).toEqual({
      url: '/vehicle-visual.jpg',
      alt:
        'Vehicle reference image of Astra Nova. ' +
        'Credit: Mission Imaging Team. License: CC BY 4.0.',
    });
    expect(getLaunchVisualMetadata(ineligible)).toBeNull();
  });
});

describe('MissionVisual', () => {
  it('renders truthful vehicle labeling, informative alt text, and visible rights', () => {
    const launch = launchWithVisuals({
      vehicleVisual: licensedVisual('vehicle'),
    });

    render(<MissionVisual launch={launch} priority />);

    expect(screen.getByText('Vehicle reference')).toBeVisible();
    expect(screen.getByText('Astra Nova')).toBeVisible();
    const image = screen.getByRole('img', {
      name: 'Vehicle reference image of Astra Nova',
    });
    expect(image).toHaveClass('mission-visual-image-vehicle');
    expect(image).toHaveAttribute('loading', 'eager');
    expect(image).toHaveAttribute('fetchpriority', 'high');
    expect(
      screen.getByText(
        'Credit: Mission Imaging Team · via Launch Library 2'
      )
    ).toBeVisible();
    expect(
      screen.getByRole('link', {
        name: 'Open CC BY 4.0 license in a new tab',
      })
    ).toHaveAttribute(
      'href',
      'https://creativecommons.org/licenses/by/4.0/'
    );
    expect(
      screen.getByRole('link', {
        name: 'Open full image in a new tab',
      })
    ).toHaveAttribute('href', '/vehicle-visual.jpg');
    expect(
      screen.getByRole('link', {
        name: 'Open Launch Library 2 source record in a new tab',
      })
    ).toHaveAttribute('href', 'https://thespacedevs.com/');
  });

  it('uses neutral mission imagery copy when only mission media is eligible', () => {
    const launch = launchWithVisuals({
      missionVisual: licensedVisual('mission'),
    });

    render(<MissionVisual launch={launch} />);

    expect(screen.getByText('Mission imagery')).toBeVisible();
    expect(
      screen.getByRole('img', {
        name: 'Mission image for Orbital Dawn',
      })
    ).toHaveClass('mission-visual-image-mission');
  });

  it('lets constrained layouts declare their actual responsive image width', () => {
    const launch = launchWithVisuals({
      vehicleVisual: licensedVisual('vehicle'),
    });

    render(
      <MissionVisual
        launch={launch}
        compact
        sizes="(max-width: 1023px) calc(100vw - 2rem), 21rem"
      />
    );

    expect(screen.getByRole('img')).toHaveAttribute(
      'sizes',
      '(max-width: 1023px) calc(100vw - 2rem), 21rem'
    );
  });

  it('keeps a fixed loading shell until the image reports ready', () => {
    const { container } = render(
      <MissionVisual
        launch={launchWithVisuals({
          vehicleVisual: licensedVisual('vehicle'),
        })}
      />
    );
    const figure = container.querySelector('figure');
    const image = screen.getByRole('img');

    expect(figure).toHaveAttribute('aria-busy', 'true');
    expect(figure).toHaveAttribute('data-visual-status', 'loading');
    expect(
      container.querySelector('.mission-visual-skeleton')
    ).toBeInTheDocument();

    fireEvent.load(image);

    expect(figure).toHaveAttribute('aria-busy', 'false');
    expect(figure).toHaveAttribute('data-visual-status', 'loaded');
    expect(
      container.querySelector('.mission-visual-skeleton')
    ).not.toBeInTheDocument();
    expect(image).toHaveClass('mission-visual-image-loaded');
  });

  it('reports detail enrichment without showing an unavailable state prematurely', () => {
    const { rerender } = render(
      <MissionVisual
        launch={launchWithVisuals()}
        loading
        showUnavailableState
      />
    );

    expect(
      screen.getByRole('status', { name: 'Loading mission visual' })
    ).toHaveTextContent('Requesting licensed mission imagery');
    expect(
      document.querySelectorAll('.mission-visual-placeholder-action')
    ).toHaveLength(3);
    expect(
      screen.queryByLabelText('Mission visual unavailable')
    ).not.toBeInTheDocument();

    rerender(
      <MissionVisual
        launch={launchWithVisuals()}
        showUnavailableState
      />
    );

    expect(
      screen.getByLabelText('Mission visual unavailable')
    ).toHaveAttribute('data-visual-status', 'missing');
    expect(screen.getByText('Usage policy')).toBeVisible();
    expect(screen.getByText('Source actions unavailable')).toBeVisible();
    expect(
      document.querySelector('.mission-visual-placeholder-action')
    ).not.toBeInTheDocument();
  });

  it('retries a broken image, preserves focus while busy, and hands focus to the recovered image action', async () => {
    const { container } = render(
      <MissionVisual
        launch={launchWithVisuals({
          vehicleVisual: licensedVisual('vehicle'),
        })}
      />
    );

    fireEvent.error(screen.getByRole('img'));

    expect(
      screen.getByRole('status')
    ).toHaveTextContent('Visual signal unavailable');
    expect(container.querySelector('figure')).toHaveAttribute(
      'data-visual-status',
      'error'
    );
    expect(
      screen.getByRole('link', {
        name: 'Open full image in a new tab',
      })
    ).toBeVisible();
    expect(
      screen.getByRole('link', {
        name: 'Open CC BY 4.0 license in a new tab',
      })
    ).toBeVisible();

    const retry = screen.getByRole('button', { name: 'Retry image' });
    retry.focus();
    fireEvent.click(retry);

    expect(retry).toHaveFocus();
    expect(retry).toHaveAttribute('aria-disabled', 'true');
    expect(retry).toHaveAttribute('aria-busy', 'true');
    expect(retry).toHaveTextContent('Retrying image');
    expect(container.querySelector('figure')).toHaveAttribute(
      'data-visual-status',
      'retrying'
    );

    fireEvent.load(screen.getByRole('img'));

    await waitFor(() =>
      expect(
        screen.getByRole('link', {
          name: 'Open full image in a new tab',
        })
      ).toHaveFocus()
    );
    expect(container.querySelector('figure')).toHaveAttribute(
      'data-visual-status',
      'loaded'
    );
    expect(
      screen.queryByRole('button', { name: 'Retry image' })
    ).not.toBeInTheDocument();
  });

  it('resets loading and error state when the selected URL changes', () => {
    const firstLaunch = launchWithVisuals({
      vehicleVisual: licensedVisual('vehicle', {
        url: '/vehicle-a.jpg',
        name: 'Vehicle A',
      }),
    });
    const secondLaunch = launchWithVisuals({
      vehicleVisual: licensedVisual('vehicle', {
        url: '/vehicle-b.jpg',
        name: 'Vehicle B',
      }),
    });
    const { container, rerender } = render(
      <MissionVisual launch={firstLaunch} compact />
    );

    fireEvent.load(screen.getByRole('img'));
    expect(container.querySelector('figure')).toHaveAttribute(
      'data-visual-status',
      'loaded'
    );

    rerender(<MissionVisual launch={secondLaunch} compact />);

    expect(
      screen.getByRole('img', {
        name: 'Vehicle reference image of Vehicle B',
      })
    ).toBeVisible();
    expect(container.querySelector('figure')).toHaveAttribute(
      'data-visual-status',
      'loading'
    );
    expect(
      container.querySelector('.mission-visual-skeleton')
    ).toBeInTheDocument();
    expect(container.querySelector('figure')).toHaveClass(
      'mission-visual-compact'
    );
  });

  it('returns null by default when no eligible media exists', () => {
    const { container } = render(
      <MissionVisual launch={launchWithVisuals()} />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('optionally distinguishes missing media from rights-unverified media', () => {
    const { rerender } = render(
      <MissionVisual
        launch={launchWithVisuals()}
        showUnavailableState
      />
    );

    expect(screen.getByText('Provider image not supplied')).toBeVisible();
    expect(screen.getByText('Source actions unavailable')).toBeVisible();
    expect(
      screen.getByLabelText('Mission visual unavailable')
    ).toHaveAttribute('data-visual-status', 'missing');
    expect(
      document.querySelector('.mission-visual-placeholder-action')
    ).not.toBeInTheDocument();

    rerender(
      <MissionVisual
        launch={launchWithVisuals({
          vehicleVisual: licensedVisual('vehicle', {
            licenseName: 'Unknown',
          }),
        })}
        showUnavailableState
      />
    );

    expect(
      screen.getByText('Image withheld — usage rights unverified')
    ).toBeVisible();
    expect(
      screen.getByLabelText('Mission visual unavailable')
    ).toHaveAttribute('data-visual-status', 'rights-unverified');
  });

  it('reports a detail lookup failure as degraded rather than missing', () => {
    render(
      <MissionVisual
        launch={launchWithVisuals()}
        error="Provider unavailable"
        showUnavailableState
      />
    );

    expect(
      screen.getByRole('status', { name: 'Mission visual unavailable' })
    ).toHaveAttribute('data-visual-status', 'degraded');
    expect(
      screen.getByText('Visual metadata temporarily unavailable')
    ).toBeVisible();
    expect(
      screen.queryByText('Provider image not supplied')
    ).not.toBeInTheDocument();
  });
});
