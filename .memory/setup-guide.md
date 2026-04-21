# Setup Guide

## Prerequisites

- Node.js 20+
- npm

## Install

```bash
npm install
```

## Run

```bash
npm run dev
```

Default local URL is usually `http://localhost:3000`. If that port is in use, Next.js will move to the next open port.

## Optional Environment Variables

```env
NEXT_PUBLIC_NASA_API_KEY=your_nasa_key
NEXT_PUBLIC_LL2_API_KEY=your_launch_library_key
```

## Verification

```bash
npm run lint
npm run build
```
