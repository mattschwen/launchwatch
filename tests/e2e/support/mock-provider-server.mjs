import { createServer } from 'node:http';

const port = Number.parseInt(process.env.MOCK_PROVIDER_PORT || '3199', 10);

function dateFromNow(days, hours = 0) {
  return new Date(
    Date.now() + days * 24 * 60 * 60 * 1000 + hours * 60 * 60 * 1000
  );
}

const polarisDate = dateFromNow(7, 4);
const returnDate = dateFromNow(-180);

const launches = {
  'demo-polaris': {
    id: 'demo-polaris',
    name: 'Polaris Relay',
    date_utc: polarisDate.toISOString(),
    date_unix: Math.floor(polarisDate.getTime() / 1000),
    rocket: { id: 'falcon-9', name: 'Falcon 9' },
    success: null,
    details:
      'A communications relay mission supporting the next generation of polar-orbit coverage.',
    links: {
      webcast: 'https://www.youtube.com/watch?v=demo-polaris',
      youtube_id: 'demo-polaris',
      article: null,
      wikipedia: null,
      patch: { small: null, large: null },
      flickr: { original: [] },
    },
    launchpad: {
      id: 'ksc-39a',
      name: 'LC-39A',
      full_name: 'Kennedy Space Center Launch Complex 39A',
    },
    upcoming: true,
  },
  'demo-return': {
    id: 'demo-return',
    name: 'Demo Return Flight',
    date_utc: returnDate.toISOString(),
    date_unix: Math.floor(returnDate.getTime() / 1000),
    rocket: { id: 'dragon-2', name: 'Falcon 9 / Dragon' },
    success: true,
    details:
      'A completed crew demonstration mission validating the return and recovery profile.',
    links: {
      webcast: 'https://www.youtube.com/watch?v=demo-return',
      youtube_id: 'demo-return',
      article: null,
      wikipedia: null,
      patch: { small: null, large: null },
      flickr: { original: [] },
    },
    launchpad: {
      id: 'ksc-39a',
      name: 'LC-39A',
      full_name: 'Kennedy Space Center Launch Complex 39A',
    },
    upcoming: false,
  },
};

function ll2Launch({
  id,
  name,
  daysFromNow,
  statusName,
  statusAbbrev,
  rocket,
  provider,
  pad,
  latitude,
  longitude,
  missionType,
  description,
}) {
  const launchDate = dateFromNow(daysFromNow);

  return {
    id,
    name,
    net: launchDate.toISOString(),
    window_start: launchDate.toISOString(),
    window_end: new Date(launchDate.getTime() + 2 * 60 * 60 * 1000).toISOString(),
    status: {
      id: statusAbbrev === 'Success' ? 3 : statusAbbrev === 'Failure' ? 4 : 1,
      name: statusName,
      abbrev: statusAbbrev,
    },
    rocket: {
      id: 1,
      configuration: {
        id: 1,
        name: rocket,
        full_name: rocket,
        families: [{ id: 1, name: rocket.split(' ')[0] }],
        variant: rocket.split(' ').slice(1).join(' ') || null,
        image: null,
      },
    },
    pad: {
      id: 1,
      name: pad,
      latitude,
      longitude,
      location: {
        name: pad,
        country: { alpha_2_code: 'US' },
      },
    },
    launch_service_provider: {
      name: provider,
      logo: null,
    },
    webcast_live: false,
    vid_urls: [],
    mission: {
      name,
      description,
      type: missionType,
      orbit: { name: 'Low Earth Orbit', abbrev: 'LEO' },
    },
    timeline: [
      {
        type: {
          name: 'Launch operations begin',
          abbrev: 'OPS',
          description:
            'Mission teams begin the terminal countdown sequence.',
        },
        relative_time: '-P0DT2H35M',
        description: 'Mission teams begin the terminal countdown sequence.',
      },
      {
        type: {
          name: 'Propellant load',
          abbrev: 'LOAD',
          description: 'Launch vehicle propellant loading begins.',
        },
        relative_time: '-P0DT0H35M',
        description: 'Launch vehicle propellant loading begins.',
      },
      {
        type: {
          name: 'Strongback retract',
          abbrev: 'T/E',
          description:
            'The transporter erector moves to its launch position.',
        },
        relative_time: '-P0DT0H4M30S',
        description: 'The transporter erector moves to its launch position.',
      },
      {
        type: {
          name: 'Startup',
          abbrev: 'START',
          description:
            'Flight computers assume control of the countdown.',
        },
        relative_time: '-P0DT0H1M',
        description: 'Flight computers assume control of the countdown.',
      },
      {
        type: {
          name: 'Liftoff',
          abbrev: 'L/O',
          description: 'The vehicle clears the tower.',
        },
        relative_time: 'P0D',
        description: 'The vehicle clears the tower.',
      },
      {
        type: {
          name: 'Stage separation',
          abbrev: 'SEP',
          description: 'The first and second stages separate.',
        },
        relative_time: 'P0DT0H2M35S',
        description: 'The first and second stages separate.',
      },
      {
        type: {
          name: 'Fairing separation',
          abbrev: 'FAIR',
          description: 'The payload fairing separates after ascent.',
        },
        relative_time: 'P0DT0H3M18S',
        description: 'The payload fairing separates after ascent.',
      },
      {
        type: {
          name: 'Payload deployment',
          abbrev: 'DEPLOY',
          description: 'The payload deploys into its target orbit.',
        },
        relative_time: 'P0DT0H54M12S',
        description: 'The payload deploys into its target orbit.',
      },
    ],
    program: [{ name: 'LaunchWatch Test Program' }],
    image: null,
    mission_patches: [],
  };
}

const ll2Upcoming = ll2Launch({
  id: 'demo-orbital-dawn',
  name: 'Orbital Dawn',
  daysFromNow: 2,
  statusName: 'Go for Launch',
  statusAbbrev: 'Go',
  rocket: 'Astra Nova',
  provider: 'Demo Launch Alliance',
  pad: 'Space Launch Complex 40',
  latitude: 28.5619,
  longitude: -80.5774,
  missionType: 'Communications',
  description:
    'A communications payload mission opening a new low-Earth-orbit relay corridor.\n\nMission objectives:\n\n* Deploy the relay payload\n* Validate the communications link',
});

ll2Upcoming.rocket.configuration.image = {
  id: 9001,
  name: 'Astra Nova launch vehicle',
  image_url: '/icon-512.png',
  thumbnail_url: '/icon-192.png',
  credit: 'LaunchWatch fixture',
  license: {
    id: 1,
    name: 'CC BY 4.0',
    link: 'https://creativecommons.org/licenses/by/4.0/',
  },
  single_use: false,
  variants: [],
};
const ll2RankedCoverage = {
  ...ll2Upcoming,
  id: 'demo-ranked-coverage',
  vid_urls: [
    {
      priority: 8,
      source: 'youtube.com',
      publisher: 'Community relay',
      title: 'Orbital Dawn community restream',
      url: 'https://www.youtube.com/watch?v=community-orbital-dawn',
      type: { name: 'Unofficial Re-stream' },
      live: false,
    },
    {
      priority: 10,
      source: 'x.com',
      publisher: 'Demo Launch Alliance',
      title: 'Orbital Dawn official webcast',
      url: 'https://x.com/i/broadcasts/official-orbital-dawn',
      type: { name: 'Official Webcast' },
      live: false,
    },
  ],
};

const ll2UnsafeCoverage = {
  ...ll2Upcoming,
  id: 'demo-unsafe-coverage',
  name: 'Unsafe Coverage Fixture',
  vid_urls: [
    {
      priority: 10,
      publisher: 'Compromised provider record',
      title: 'Unsafe scripted coverage',
      url: 'javascript:alert(document.domain)',
      type: { name: 'Official Webcast' },
      live: true,
    },
    {
      priority: 9,
      publisher: 'Compromised provider record',
      title: 'Credential-bearing coverage',
      url: 'https://viewer:secret@example.test/stream',
      type: { name: 'Official Webcast' },
      live: true,
    },
  ],
};

const ll2PendingBriefing = {
  ...ll2Upcoming,
  id: 'demo-pending-briefing',
  name: 'Pending Briefing Mission',
  mission: {
    ...ll2Upcoming.mission,
    name: 'Pending Briefing Mission',
    description: 'Details TBD.',
  },
};

const ll2Previous = ll2Launch({
  id: 'demo-pathfinder',
  name: 'Pathfinder Qualification',
  daysFromNow: -320,
  statusName: 'Failure',
  statusAbbrev: 'Failure',
  rocket: 'Pathfinder I',
  provider: 'Demo Launch Alliance',
  pad: 'Vandenberg Space Force Base',
  latitude: 34.6321,
  longitude: -120.6107,
  missionType: 'Test flight',
  description:
    'A qualification flight retained for archive filtering and failure-state coverage.',
});

ll2Previous.image = {
  id: 9002,
  name: 'Pathfinder Qualification mission',
  image_url: '/icon-512.png',
  thumbnail_url: '/icon-192.png',
  credit: 'LaunchWatch fixture',
  license: {
    id: 1,
    name: 'CC BY 4.0',
    link: 'https://creativecommons.org/licenses/by/4.0/',
  },
  single_use: false,
  variants: [],
};

function sendJson(response, status, body) {
  response.writeHead(status, {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
  });
  response.end(JSON.stringify(body));
}

async function readJson(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }

  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url || '/', `http://127.0.0.1:${port}`);

  if (request.method === 'GET' && url.pathname === '/health') {
    sendJson(response, 200, { ok: true });
    return;
  }

  if (
    request.method === 'POST' &&
    url.pathname === '/spacex/v4/launches/query'
  ) {
    try {
      const body = await readJson(request);
      const requestedId = body?.query?._id;
      if (typeof requestedId === 'string') {
        const launch = launches[requestedId];
        sendJson(response, 200, { docs: launch ? [launch] : [] });
        return;
      }

      const upcoming = body?.query?.upcoming;
      sendJson(response, 200, {
        docs:
          upcoming === true
            ? [launches['demo-polaris']]
            : upcoming === false
              ? [launches['demo-return']]
              : [],
      });
    } catch {
      sendJson(response, 400, { error: 'Invalid request body' });
    }
    return;
  }

  if (
    request.method === 'GET' &&
    url.pathname === '/ll2/2.3.0/launches/upcoming/'
  ) {
    sendJson(response, 200, { count: 1, results: [ll2Upcoming] });
    return;
  }

  if (
    request.method === 'GET' &&
    url.pathname === '/ll2/2.3.0/launches/previous/'
  ) {
    sendJson(response, 200, { count: 1, results: [ll2Previous] });
    return;
  }

  if (
    request.method === 'GET' &&
    url.pathname.startsWith('/ll2/2.3.0/launches/')
  ) {
    const id = url.pathname.split('/').filter(Boolean).at(-1);
    const launch =
      id === ll2Upcoming.id
        ? ll2Upcoming
        : id === ll2RankedCoverage.id
          ? ll2RankedCoverage
        : id === ll2UnsafeCoverage.id
          ? ll2UnsafeCoverage
        : id === ll2PendingBriefing.id
          ? ll2PendingBriefing
        : id === ll2Previous.id
          ? ll2Previous
          : null;
    sendJson(
      response,
      launch ? 200 : 404,
      launch || { error: 'Launch not found' }
    );
    return;
  }

  sendJson(response, 404, { error: 'Mock provider route not found' });
});

server.listen(port, '127.0.0.1', () => {
  process.stdout.write(`Mock launch provider ready on ${port}\n`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
  });
}
