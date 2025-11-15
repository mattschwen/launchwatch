import Link from 'next/link';
import PastLaunches from '@/components/PastLaunches';

export const metadata = {
  title: 'Launch History | LaunchWatch',
  description: 'Browse past rocket launches and their outcomes',
};

export default function HistoryPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black">
      {/* Header */}
      <header className="w-full border-b border-gray-800 bg-black/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <Link href="/" className="inline-flex items-center gap-2 text-white hover:text-blue-400 transition-colors mb-2">
                <span>←</span>
                <span>Back to Upcoming</span>
              </Link>
              <h1 className="text-4xl md:text-5xl font-bold text-white flex items-center gap-3">
                <span className="text-5xl">📜</span>
                <span className="bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
                  Launch History
                </span>
              </h1>
              <p className="text-gray-400 mt-2 text-sm md:text-base">
                Explore past launches and their outcomes
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PastLaunches />
      </main>

      {/* Footer */}
      <footer className="mt-auto">
        <div className="bg-black border-t border-gray-800 py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="text-center md:text-left">
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
                  Built with Next.js • Updates every 10 minutes
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <span className="text-xl">🚀</span>
                <span>LaunchWatch</span>
                <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs font-mono border border-blue-500/30">
                  v1.0.0
                </span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
