import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MissionTrajectory from '@/components/MissionTrajectory';
import { TRAJECTORY_DISCLOSURE } from '@/lib/trajectory';
import type { Launch, LaunchSiteAtlasResponse } from '@/lib/types';
import { UPCOMING_LAUNCHES } from '../fixtures/launches';

const mapInstances: Array<Record<string, ReturnType<typeof vi.fn>>> = [];
const polylineMock = vi.hoisted(() => vi.fn());

vi.mock('leaflet', () => {
  class MockMap {
    flyToBounds = vi.fn();
    flyTo = vi.fn();
    getContainer = vi.fn(() => document.createElement('div'));
    getZoom = vi.fn(() => 8);
    remove = vi.fn();
    zoomIn = vi.fn();
    zoomOut = vi.fn();
    on = vi.fn();
    constructor() {
      mapInstances.push(this as unknown as Record<string, ReturnType<typeof vi.fn>>);
    }
  }
  const layer = { addTo: vi.fn(), clearLayers: vi.fn() };
  layer.addTo.mockImplementation(() => layer);
  const marker = { addTo: vi.fn(), bindTooltip: vi.fn(), on: vi.fn() };
  marker.addTo.mockImplementation(() => marker);
  marker.bindTooltip.mockImplementation(() => marker);
  marker.on.mockImplementation(() => marker);
  const tiles = {
    addTo: vi.fn(),
    on: vi.fn(),
    once: vi.fn((event: string, callback: () => void) => { if (event === 'load') queueMicrotask(callback); return tiles; }),
  };
  tiles.addTo.mockImplementation(() => tiles);
  tiles.on.mockImplementation(() => tiles);
  const leaflet = {
    circleMarker: vi.fn(() => marker),
    latLngBounds: vi.fn((points) => points),
    layerGroup: vi.fn(() => layer),
    map: vi.fn(() => new MockMap()),
    polyline: polylineMock.mockImplementation(() => marker),
    tileLayer: vi.fn(() => tiles),
  };
  return { default: leaflet, ...leaflet };
});

function makeLaunch(overrides: Partial<Launch> = {}): Launch {
  return { ...UPCOMING_LAUNCHES[0], ...overrides };
}

const atlas: LaunchSiteAtlasResponse = {
  sites: [
    {
      id: '80', name: 'Space Launch Complex 40', active: true,
      latitude: 28.5619, longitude: -80.5774,
      locationName: 'Cape Canaveral SFS', countryCode: 'US',
      description: 'A workhorse orbital launch pad with a long history.',
      locationDescription: null, infoUrl: 'https://www.spacex.com/launches/',
      wikiUrl: 'https://en.wikipedia.org/wiki/Cape_Canaveral_Space_Launch_Complex_40',
      totalLaunchCount: 230, orbitalLaunchAttemptCount: 230,
      agencies: ['SpaceX', 'United States Space Force'],
      image: {
        kind: 'mission', url: 'https://thespacedevs-prod.nyc3.digitaloceanspaces.com/media/images/slc-40.jpg',
        name: 'SLC-40', credit: 'SpaceX', licenseName: 'CC BY 2.0',
        licenseUrl: 'https://creativecommons.org/licenses/by/2.0/', singleUse: false,
        sourceLabel: 'Launch Library 2', sourceUrl: 'https://thespacedevs.com/llapi',
      },
    },
    {
      id: '81', name: 'Launch Complex 39A', active: true,
      latitude: 28.6084, longitude: -80.6043,
      locationName: 'Kennedy Space Center', countryCode: 'US',
      description: 'Apollo, Shuttle, and commercial missions have flown here.',
      locationDescription: null, infoUrl: null, wikiUrl: null,
      totalLaunchCount: 180, orbitalLaunchAttemptCount: 178,
      agencies: ['NASA', 'SpaceX'], image: null,
    },
  ],
  meta: { generatedAt: '2026-08-11T00:00:00.000Z', cached: false, stale: false, source: 'launch-library-2', sourceUrl: 'https://thespacedevs.com/llapi' },
};

describe('MissionTrajectory', () => {
  beforeEach(() => {
    mapInstances.length = 0;
    polylineMock.mockClear();
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(atlas), { status: 200 })));
  });

  it('keeps the lightweight illustrative model in compact placements', () => {
    const { container } = render(<MissionTrajectory launch={makeLaunch()} />);
    expect(screen.getByRole('heading', { name: 'Mission trajectory' })).toBeVisible();
    expect(screen.getByText('Illustrative model')).toBeVisible();
    expect(screen.getAllByText(TRAJECTORY_DISCLOSURE)).toHaveLength(2);
    expect(container.querySelector('[data-trajectory-map]')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /28\.5619°N.*80\.5774°W.*opens in a new tab/i })).toHaveAttribute('href', 'https://www.openstreetmap.org/?mlat=28.5619&mlon=-80.5774#map=12/28.5619/-80.5774');
    expect(
      screen.getByRole('link', {
        name: /FlightClub simulation.*opens in a new tab/i,
      })
    ).toHaveAttribute(
      'href',
      'https://flightclub.io/result?llId=demo-orbital-dawn',
    );
  });

  it('loads a continuous open map and a progressively explorable field guide', async () => {
    const user = userEvent.setup();
    const { container } = render(<MissionTrajectory launch={makeLaunch()} variant="detail" />);
    expect(screen.getByRole('heading', { name: 'Launch site atlas' })).toBeVisible();
    expect(screen.getByText('Open pad atlas')).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Stage-by-stage mission model' })).toBeVisible();
    expect(container.querySelectorAll('[data-trajectory-map]')).toHaveLength(1);
    expect(screen.getByRole('group', { name: 'Atlas controls' })).toBeVisible();
    expect(container.querySelector('[data-launch-site-atlas]')).toBeInTheDocument();

    const panel = screen.getByRole('complementary', { name: 'Launch site learning panel' });
    expect(await within(panel).findByRole('heading', { name: 'Space Launch Complex 40' })).toBeVisible();
    expect(within(panel).getAllByText('230', { selector: 'dd' })).toHaveLength(2);
    expect(within(panel).getByText(/workhorse orbital launch pad/i)).toBeVisible();
    expect(within(panel).getByText(/SpaceX · United States Space Force/)).toBeVisible();
    expect(within(panel).getByRole('img', { name: /Space Launch Complex 40 launch facility/i })).toBeVisible();
    expect(within(panel).getByRole('link', { name: /OpenStreetMap/i })).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.getAllByText('Illustrative ascent corridor')).not.toHaveLength(0);
    expect(polylineMock).toHaveBeenCalledTimes(2);
    expect(polylineMock.mock.calls[1]?.[1]).toEqual(expect.objectContaining({
      className: 'mission-corridor-line',
      color: '#5ee6a8',
    }));

    await user.click(within(panel).getByRole('button', { name: 'Explore next nearby launch pad' }));
    expect(within(panel).getByRole('heading', { name: 'Launch Complex 39A' })).toBeVisible();
    expect(mapInstances[0].flyTo).toHaveBeenCalled();
  });

  it('connects the visible controls to continuous map operations', async () => {
    const user = userEvent.setup();
    render(<MissionTrajectory launch={makeLaunch()} variant="detail" />);
    await screen.findByRole('heading', { name: 'Space Launch Complex 40' });
    await user.click(screen.getByRole('button', { name: 'Zoom atlas in' }));
    await user.click(screen.getByRole('button', { name: 'Zoom atlas out' }));
    await user.click(screen.getByRole('button', { name: 'Fit nearby launch pads' }));
    await user.click(screen.getByRole('button', { name: 'Reset atlas to launch region' }));
    await user.click(screen.getAllByRole('button', { name: 'Center current launch' })[0]);
    expect(mapInstances[0].zoomIn).toHaveBeenCalled();
    expect(mapInstances[0].zoomOut).toHaveBeenCalled();
    expect(mapInstances[0].flyToBounds).toHaveBeenCalled();
    expect(mapInstances[0].flyTo).toHaveBeenCalled();
  });

  it('finds pads by operator and reports an honest empty search state', async () => {
    const user = userEvent.setup();
    render(<MissionTrajectory launch={makeLaunch()} variant="detail" />);
    const panel = screen.getByRole('complementary', { name: 'Launch site learning panel' });
    await within(panel).findByRole('heading', { name: 'Space Launch Complex 40' });
    const search = within(panel).getByRole('searchbox', { name: 'Find a launch pad' });

    await user.type(search, 'NASA');
    expect(within(panel).getByRole('button', { name: /Launch Complex 39A/ })).toBeVisible();
    expect(within(panel).queryByRole('button', { name: /Space Launch Complex 40/ })).not.toBeInTheDocument();

    await user.clear(search);
    await user.type(search, 'No such facility');
    expect(within(panel).getByRole('status')).toHaveTextContent(/No pads match/);
  });

  it('reports a provider failure without hiding the open map', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 502 })));
    render(<MissionTrajectory launch={makeLaunch()} variant="detail" />);
    expect(await screen.findByText('Nearby pad data is unavailable')).toBeVisible();
    expect(screen.getByRole('group', { name: 'Atlas controls' })).toBeVisible();
    expect(screen.getByText(/still explore the open map/i)).toBeVisible();
  });

  it('recovers a transient pad failure without reloading the mission', async () => {
    const user = userEvent.setup();
    let resolveRetry!: (response: Response) => void;
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('{}', { status: 502 }))
      .mockImplementationOnce(
        () =>
          new Promise<Response>((resolve) => {
            resolveRetry = resolve;
          }),
      );
    vi.stubGlobal('fetch', fetchMock);

    render(<MissionTrajectory launch={makeLaunch()} variant="detail" />);
    const retry = await screen.findByRole('button', {
      name: 'Retry nearby pad data',
    });
    await user.click(retry);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(retry).toHaveAttribute('aria-disabled', 'true');
    expect(retry).toHaveAttribute('aria-busy', 'true');
    expect(retry).toHaveFocus();

    resolveRetry(new Response(JSON.stringify(atlas), { status: 200 }));

    const recoveredHeading = await screen.findByRole('heading', {
      name: 'Space Launch Complex 40',
    });
    await waitFor(() => expect(recoveredHeading).toHaveFocus());
    expect(screen.queryByText('Nearby pad data is unavailable')).not.toBeInTheDocument();
  });

  it('keeps facility retry unavailable while the device is offline', async () => {
    vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(false);
    const fetchMock = vi.fn(async () => new Response('{}', { status: 502 }));
    vi.stubGlobal('fetch', fetchMock);

    render(<MissionTrajectory launch={makeLaunch()} variant="detail" />);
    const retry = await screen.findByRole('button', {
      name: 'Retry nearby pad data',
    });
    await waitFor(() => expect(retry).toHaveAttribute('aria-disabled', 'true'));
    expect(screen.getByText('Retry when online')).toBeVisible();

    retry.click();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('renders an honest coordinate-missing state without requesting pad data', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    render(<MissionTrajectory launch={makeLaunch({ location: undefined })} variant="detail" />);
    expect(screen.getByText('Launch-site atlas unavailable')).toBeVisible();
    expect(screen.getByText(/did not report coordinates/i)).toBeVisible();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('opens the atlas dialog with managed focus and restores focus on Escape', async () => {
    const user = userEvent.setup();
    render(<MissionTrajectory launch={makeLaunch()} />);
    const open = screen.getByRole('button', { name: 'Enlarge launch site atlas' });
    await user.click(open);
    const dialog = screen.getByRole('dialog', { name: makeLaunch().name });
    await waitFor(() => expect(within(dialog).getByRole('button', { name: 'Close launch site atlas' })).toHaveFocus());
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(open).toHaveFocus());
  });

  it('keeps expansion disabled before a mission is selected', () => {
    render(<MissionTrajectory launch={null} />);
    expect(screen.getByText('No mission selected')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Enlarge launch site atlas' })).toBeDisabled();
    expect(screen.getByText('Mission trajectory model unavailable')).toBeInTheDocument();
  });
});
