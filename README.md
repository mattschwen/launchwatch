<div align="center">
  <img src="public/logo.svg" alt="LaunchWatch Logo" width="200" height="200">
  
  # LaunchWatch
  
  **Track upcoming rocket launches, watch live streams, and discover space facts.**
  
  [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
  [![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
  
</div>

## Features

- **Live Launch Tracking** - Automatically detects launches happening within ±2 hours
- **Embedded Livestreams** - Watch SpaceX and NASA launches directly in the app
- **Push Notifications** - Get notified before launches (PWA)
- **Countdown Timers** - Real-time countdowns to upcoming launches
- **Calendar Integration** - Add launches to your calendar with one click
- **Rocket Facts** - Rotating banner with space trivia and NASA's Astronomy Picture of the Day
- **Filter by Agency** - Filter launches by SpaceX, NASA, ESA, and more
- **3-Month View** - See all upcoming launches for the next 3 months
- **Offline Support** - PWA with offline capabilities

## Quick Start

```bash
# Clone the repository
git clone https://github.com/yourusername/launchwatch.git
cd launchwatch

# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4
- **APIs**:
  - [SpaceX API v4](https://api.spacexdata.com) - SpaceX launch data
  - [The Space Devs Launch Library 2](https://ll.thespacedevs.com) - Global launch data
  - [NASA API](https://api.nasa.gov) - Astronomy Picture of the Day
- **Deployment**: Vercel

## Environment Variables

Create a `.env.local` file (optional):

```env
# Optional: NASA API Key (get free key at https://api.nasa.gov)
NEXT_PUBLIC_NASA_API_KEY=your_key_here

# Optional: Launch Library 2 API Key for higher rate limits
NEXT_PUBLIC_LL2_API_KEY=your_key_here
```

Without API keys, the app uses free public endpoints with rate limits.

## Project Structure

```
launchwatch/
├── app/                    # Next.js App Router
│   ├── api/launches/       # API route for launch data
│   ├── history/            # Past launches page
│   ├── page.tsx            # Home page
│   └── layout.tsx          # Root layout
├── components/             # React components
├── lib/                    # Utilities and API functions
│   ├── api.ts              # External API integrations
│   ├── hooks.ts            # React hooks
│   ├── types.ts            # TypeScript types
│   └── notifications.ts    # Push notification logic
├── public/                 # Static assets
│   ├── manifest.json       # PWA manifest
│   └── sw.js               # Service worker
└── docs/                   # Documentation
```

## Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm start            # Start production server
npm run lint         # Run ESLint
```

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## API Rate Limits

- **SpaceX API**: No authentication required, no rate limits
- **Launch Library 2 (Free)**: 15 requests/hour
- **Launch Library 2 (With API Key)**: Higher limits
- **NASA API (DEMO_KEY)**: 30 requests/hour
- **NASA API (With Key)**: 1000 requests/hour

The app uses intelligent caching to stay within these limits.

## License

This project is licensed under the MIT License - see [LICENSE](LICENSE) file for details.

## Credits

- Launch data from [SpaceX API](https://github.com/r-spacex/SpaceX-API)
- Global launch data from [The Space Devs](https://thespacedevs.com)
- Space imagery from [NASA](https://api.nasa.gov)
- Built with [Next.js](https://nextjs.org)

## Support

- **Bug Reports**: [Open an issue](https://github.com/yourusername/launchwatch/issues/new?template=bug_report.md)
- **Feature Requests**: [Open an issue](https://github.com/yourusername/launchwatch/issues/new?template=feature_request.md)
- **Questions**: [Start a discussion](https://github.com/yourusername/launchwatch/discussions)

---

Made with ❤️ for space enthusiasts
