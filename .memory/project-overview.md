# Project Overview

## Snapshot

- Name: LaunchWatch
- Version: `1.1.1`
- Stack: Next.js 16, React 19, TypeScript 5, Tailwind CSS 4
- Primary goal: show upcoming launches, live windows, launch history, launch sites, and stream/calendar actions

## Current Product Identity

- active logo: `public/newlogo.jpeg`
- visual direction: green mission-control shell with telemetry panels
- accent palette: green, cyan, amber, live-state red
- compact sticky header with rotating rocket fact ribbon

## Current Routes

- `/`
- `/watch`
- `/launch/[id]`
- `/history`
- `/api/launches?type=all|live|next`
- `/api/launch-intel`

## Current Gaps

- no automated test suite yet
- no database
- history is SpaceX-only
- notifications are browser-dependent
