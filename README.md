# LaunchWatch 🚀

A modern, minimal web app that tracks upcoming NASA and SpaceX rocket launches, displays live streams, and showcases fascinating rocket facts.

![LaunchWatch](https://img.shields.io/badge/Next.js-16.0-black?style=flat-square&logo=next.js)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4.0-38B2AC?style=flat-square&logo=tailwind-css)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?style=flat-square&logo=typescript)

## ✨ Features

- **🔴 Live Launch Detection** - Automatically detects launches happening within ±2 hours and displays livestreams
- **📅 Upcoming Launches** - Comprehensive list of upcoming launches from SpaceX and global space agencies
- **⏱️ Countdown Timers** - Real-time countdowns to upcoming launches
- **🎥 Livestream Integration** - Embedded YouTube livestreams for active launches
- **💡 Rocket Facts** - Rotating banner with fascinating rocket statistics and space facts
- **🌙 Dark Theme** - Beautiful space-themed dark UI
- **📱 Mobile Responsive** - Works perfectly on all devices
- **⚡ Fast & Lightweight** - Built with Next.js 16, loads instantly

## 🚀 Quick Start

### Prerequisites

- Node.js 20.x or higher
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd launchwatch
```

2. Install dependencies:
```bash
npm install
```

3. (Optional) Set up NASA API key:
```bash
cp .env.example .env.local
# Edit .env.local and add your NASA API key from https://api.nasa.gov
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## 🛠️ Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** TailwindCSS 4
- **APIs:**
  - [SpaceX API](https://api.spacexdata.com) - SpaceX launch data
  - [Launch Library 2](https://ll.thespacedevs.com) - Global launch data
  - [NASA API](https://api.nasa.gov) - Astronomy Picture of the Day

## 📦 Project Structure

```
launchwatch/
├── app/
│   ├── layout.tsx          # Root layout with metadata
│   ├── page.tsx            # Main page component
│   └── globals.css         # Global styles & animations
├── components/
│   ├── Countdown.tsx       # Countdown timer component
│   ├── LiveLaunches.tsx    # Live launches wrapper
│   ├── LiveNow.tsx         # Live launch display with stream
│   ├── LaunchCard.tsx      # Individual launch card
│   ├── LaunchList.tsx      # Launches grid
│   ├── NextLaunch.tsx      # Next upcoming launch
│   └── RocketFacts.tsx     # Rotating facts banner
├── lib/
│   ├── api.ts              # API integration functions
│   ├── hooks.ts            # React hooks for data fetching
│   └── types.ts            # TypeScript type definitions
└── public/                 # Static assets
```

## 🌐 API Data Sources

This app uses **free, open-source APIs** with no authentication required (except NASA APOD which has a generous free tier):

- **SpaceX API v4** - Real-time SpaceX launch data
- **The Space Devs LL2** - Global launch schedule
- **NASA Open APIs** - Astronomy Picture of the Day

## 🎨 Features Breakdown

### Live Launch Detection
The app automatically checks for launches happening within a 2-hour window (±2 hours from current time) and displays:
- Live countdown
- Embedded YouTube livestream
- Launch details and quick facts

### Data Caching
- Smart caching system reduces API calls
- Upcoming launches: 5-minute cache
- Rocket data: 24-hour cache
- Auto-refresh every 2 minutes for launch list
- Auto-refresh every 30 seconds for live launches

### Countdown Timers
Real-time countdowns showing:
- Days (if >24 hours)
- Hours
- Minutes
- Seconds (with pulse animation)

### Rocket Facts
Rotating banner displaying:
- Rocket specifications (height, mass, success rate)
- NASA Astronomy Picture of the Day
- Curated space trivia
- Auto-rotates every 15 seconds

## 🚢 Deployment

### Deploy to Vercel (Recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

1. Push your code to GitHub
2. Import the project in Vercel
3. (Optional) Add `NEXT_PUBLIC_NASA_API_KEY` environment variable
4. Deploy!

### Deploy to Netlify

1. Build the project:
```bash
npm run build
```

2. Deploy the `.next` directory

### Deploy to any Node.js host

```bash
npm run build
npm start
```

## ⚙️ Configuration

### Environment Variables

Create a `.env.local` file:

```env
# Optional: NASA API Key
# Without this, the app uses DEMO_KEY (rate-limited)
# Get a free key at https://api.nasa.gov
NEXT_PUBLIC_NASA_API_KEY=your_nasa_api_key_here
```

## 🎯 MVP Checklist

- ✅ Live launch detection and display
- ✅ Embedded livestreams
- ✅ Countdown timers
- ✅ Upcoming launches list (20+ launches)
- ✅ Launch details (mission, rocket, site, time)
- ✅ Status indicators
- ✅ Rotating rocket facts banner
- ✅ Dark space theme
- ✅ Mobile responsive design
- ✅ Fast loading (<1 second)
- ✅ No authentication required
- ✅ Auto-refresh data
- ✅ Ready for Vercel deployment

## 📝 Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

## 🤝 Contributing

Contributions are welcome! Feel free to:
- Report bugs
- Suggest features
- Submit pull requests

## 📄 License

This project is open source and available under the MIT License.

## 🙏 Credits

- Launch data from [SpaceX API](https://github.com/r-spacex/SpaceX-API)
- Global launch data from [The Space Devs](https://thespacedevs.com)
- Space imagery from [NASA](https://api.nasa.gov)
- Built with [Next.js](https://nextjs.org)

---

**Made with ❤️ for space enthusiasts**
