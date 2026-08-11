import { describe, expect, it } from 'vitest';
import { normalizeLaunchSites } from '@/lib/launch-sites';

describe('normalizeLaunchSites', () => {
  it('keeps trustworthy site facts, links, and licensed image metadata', () => {
    const sites = normalizeLaunchSites([
      {
        id: 80,
        active: true,
        name: 'Space Launch Complex 40',
        latitude: '28.5619',
        longitude: '-80.5774',
        description: '  Historic and active orbital pad.  ',
        info_url: 'https://www.spacex.com/launches/',
        wiki_url: 'javascript:alert(1)',
        total_launch_count: 230,
        orbital_launch_attempt_count: 229,
        location: {
          name: 'Cape Canaveral SFS',
          country: { alpha_2_code: 'US' },
        },
        agencies: [{ name: 'SpaceX' }, { name: 'SpaceX' }, { abbrev: 'USSF' }],
        image: {
          image_url: 'https://thespacedevs-prod.nyc3.digitaloceanspaces.com/media/images/pad.jpg',
          credit: 'SpaceX',
          license: { name: 'CC BY 2.0', link: 'https://creativecommons.org/licenses/by/2.0/' },
          single_use: false,
        },
      },
    ]);

    expect(sites).toHaveLength(1);
    expect(sites[0]).toMatchObject({
      id: '80', latitude: 28.5619, longitude: -80.5774,
      description: 'Historic and active orbital pad.',
      infoUrl: 'https://www.spacex.com/launches/', wikiUrl: null,
      totalLaunchCount: 230, orbitalLaunchAttemptCount: 229,
      agencies: ['SpaceX', 'USSF'],
      image: { credit: 'SpaceX', licenseName: 'CC BY 2.0', singleUse: false },
    });
  });

  it('drops malformed coordinates, deduplicates IDs, and sorts by launch count', () => {
    const sites = normalizeLaunchSites([
      { id: 1, name: 'Invalid latitude', latitude: 95, longitude: 10 },
      { id: 2, name: 'Quiet pad', latitude: 10, longitude: 20, total_launch_count: 2 },
      { id: 3, name: 'Busy pad', latitude: 11, longitude: 21, total_launch_count: 80 },
      { id: 2, name: 'Updated quiet pad', latitude: 10, longitude: 20, total_launch_count: 4 },
    ]);

    expect(sites.map((site) => site.name)).toEqual(['Busy pad', 'Updated quiet pad']);
  });
});
