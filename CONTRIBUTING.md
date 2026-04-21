# Contributing to LaunchWatch

LaunchWatch is a small Next.js codebase. Good contributions are scoped, tested with the existing checks, and documented in the same change.

## Ground Rules

- Follow the [Code of Conduct](/Users/matthewschwen/projects/launchwatch/CODE_OF_CONDUCT.md)
- Do not commit secrets or local API keys
- Keep changes focused and avoid unrelated cleanup in the same PR
- Update documentation when the UI, behavior, or workflow changes

## Local Setup

```bash
git clone https://github.com/mattschwen/launchwatch.git
cd launchwatch
npm install
npm run dev
```

The app normally starts on `http://localhost:3000`. If that port is already taken, Next.js will choose another open port.

## Optional Environment Variables

```env
NEXT_PUBLIC_NASA_API_KEY=your_nasa_key
NEXT_PUBLIC_LL2_API_KEY=your_launch_library_key
```

## Repo Shape

- `app/` contains routes, layout, and the internal API route
- `components/` contains the UI surface
- `lib/` contains API logic, hooks, calendar utilities, notifications, and shared types
- `public/` contains the live logo, icons, manifest, service worker, and offline page
- `docs/` contains user-facing and contributor docs
- `.memory/` contains internal summaries and architecture notes

## Workflow

1. Create a branch from `main`
2. Make the smallest coherent change that solves the problem
3. Run the local checks
4. Update docs if behavior changed
5. Open a PR with a clear summary and verification notes

## Required Checks

```bash
npm run lint
npm run build
```

There is currently no dedicated automated test suite. If you add one, document it and wire it into CI.

## Code Guidelines

- Use TypeScript for new code
- Prefer small components with obvious responsibilities
- Keep server and client boundaries explicit
- Reuse shared types from [lib/types.ts](/Users/matthewschwen/projects/launchwatch/lib/types.ts)
- Reuse existing CSS variables in [app/globals.css](/Users/matthewschwen/projects/launchwatch/app/globals.css)
- Preserve the current green mission-control visual system unless the task explicitly changes the design direction

## UI Guidelines

The active visual identity is a mission-control interface for rocket enthusiasts. Current product styling is based on:

- the logo in `public/newlogo.jpeg`
- a green-and-black console shell
- telemetry-style panels instead of frosted glass cards
- green, cyan, amber, and live-state red accents
- explicit controls for overlays, expanded views, and watch/intel handoffs

Do not drift back toward the old light/glass system in docs or UI copy.

## Pull Request Notes

PRs should include:

- what changed
- why it changed
- how it was verified
- screenshots or recordings for visual changes

## Documentation Policy

If you change any of the following, update the docs in the same PR:

- routes
- environment variables
- caching behavior
- branding or look and feel
- map behavior
- notification behavior
- deployment steps

## Useful References

- [README.md](/Users/matthewschwen/projects/launchwatch/README.md)
- [docs/ARCHITECTURE.md](/Users/matthewschwen/projects/launchwatch/docs/ARCHITECTURE.md)
- [docs/API.md](/Users/matthewschwen/projects/launchwatch/docs/API.md)
- [docs/DEPLOYMENT.md](/Users/matthewschwen/projects/launchwatch/docs/DEPLOYMENT.md)
- [docs/CONTRIBUTING_QUICK_START.md](/Users/matthewschwen/projects/launchwatch/docs/CONTRIBUTING_QUICK_START.md)
