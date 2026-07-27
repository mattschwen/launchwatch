# Context Ingestion

Use this file when you need a fast mental model of the repo.

## What the App Is

LaunchWatch is a small launch-tracking web app with:

- a live-launch section
- a next-launch spotlight
- a filtered upcoming-launch list
- an integrated launch-sites map
- a past-launch history page

## What Changed Most Recently

- the home route now opens with a one-time boot sequence
- the watch and detail routes now use a shared mission-control intel deck
- the telemetry globe now auto-follows the active pad and still preserves explicit close controls
- docs were refreshed to match the current visual system and runtime behavior

## Current UI Identity

- logo mark: `public/brand/logo_launchwatch_tracked-ascent_20260726_color.svg`
- logo lockup: `public/brand/logo_launchwatch_horizontal_20260726_dark.svg`
- background: black mission-control shell
- surfaces: console panels
- accents: green, cyan, amber, live-state red

## Current Verification Commands

```bash
npm run lint
npm run build
```
