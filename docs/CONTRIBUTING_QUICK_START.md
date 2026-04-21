# Quick Start for Contributors

This is the fastest path to making a safe change in LaunchWatch.

## 1. Install and Run

```bash
git clone https://github.com/mattschwen/launchwatch.git
cd launchwatch
npm install
npm run dev
```

## 2. Make a Focused Change

Common edit areas:

- `app/` for routes and layout
- `components/` for UI
- `lib/` for data, hooks, and helpers
- `docs/` and `.memory/` for documentation

## 3. Verify

```bash
npm run lint
npm run build
```

## 4. Update Docs

If you changed behavior, UI, branding, cache timing, or setup, update the docs in the same branch.

## 5. Open a PR

Include:

- a short summary
- screenshots for UI changes
- the commands you ran to verify the change

For the full workflow, see [CONTRIBUTING.md](/Users/matthewschwen/projects/launchwatch/CONTRIBUTING.md).
