import Link from 'next/link';
import LiveLaunches from '@/components/LiveLaunches';
import NextLaunch from '@/components/NextLaunch';
import LaunchList from '@/components/LaunchList';
import RocketFacts from '@/components/RocketFacts';
import NotificationPrompt from '@/components/NotificationPrompt';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black">
      <NotificationPrompt />
      {/* Header */}
      <header className="w-full border-b border-gray-800 bg-black/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-white flex items-center gap-3">
                <span className="text-5xl">🚀</span>
                <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                  LaunchWatch
                </span>
              </h1>
              <p className="text-gray-400 mt-2 text-sm md:text-base">
                Track upcoming rocket launches • Watch live streams • Discover space facts
              </p>
            </div>
            <Link
              href="/history"
              className="hidden sm:flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-600 text-white font-medium rounded-lg transition-colors"
            >
              <span>📜</span>
              <span>History</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Live Launches Section */}
        <LiveLaunches />

        {/* Next Launch Section */}
        <NextLaunch />

        {/* Upcoming Launches Section */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-2">
            <span>📅</span>
            <span>Upcoming Launches</span>
          </h2>
          <LaunchList />
        </section>
      </main>

      {/* Footer with Rocket Facts */}
      <footer className="mt-auto">
        <RocketFacts />
        <div className="bg-black border-t border-gray-800 py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <p className="text-gray-400 text-sm">
              Data from{' '}
              <a
                href="https://api.spacexdata.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300"
              >
                SpaceX API
              </a>
              ,{' '}
              <a
                href="https://ll.thespacedevs.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300"
              >
                The Space Devs
              </a>
              , and{' '}
              <a
                href="https://api.nasa.gov"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300"
              >
                NASA
              </a>
            </p>
            <p className="text-gray-500 text-xs mt-2">
              Built with Next.js • Updates every 2 minutes
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
