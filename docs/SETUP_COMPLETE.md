# Setup Status

The current repo setup is ready for day-to-day development.

## Verified Commands

```bash
npm install
npm run lint
npm run build
```

## Current Environment Requirements

- Node.js 20+
- npm
- optional API keys for NASA APOD and Launch Library 2

## Current App Entry Points

- `/` for the mission-control board
- `/watch` for the watch room
- `/launch/[id]` for mission detail and launch intelligence
- `/history` for past launches
- `/api/launches` for internal cached launch data
- `/api/launch-intel` for mission-specific stream and media intelligence

## Current Branding Assets

- active app logo: `public/newlogo.jpeg`
- source variants: `LaunchWatch_Logo.svg`, `LaunchWatch_Logo_1.svg`

## Current UI Summary

- green-and-black mission-control shell
- console panels and telemetry typography
- one-time boot sequence on first load
- watch-room intel feed and expandable map with explicit close controls
