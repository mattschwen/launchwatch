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
    </div>
  );
}
