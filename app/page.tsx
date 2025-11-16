import Link from 'next/link';
import Image from 'next/image';
import LiveLaunches from '@/components/LiveLaunches';
import NextLaunch from '@/components/NextLaunch';
import LaunchList from '@/components/LaunchList';
import RocketFacts from '@/components/RocketFacts';
import NotificationPrompt from '@/components/NotificationPrompt';

export default function Home() {
  return (
    <div className="min-h-screen">
      <NotificationPrompt />
      
      {/* Compact Header */}
      <header className="w-full bg-white sticky top-0 z-50 border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-1 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
          <Image
            src="/logo.svg"
            alt="LaunchWatch"
            width={128}
            height={128}
            className="w-24 h-24 sm:w-32 sm:h-32 transition-transform group-hover:scale-110"
          />
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold gradient-text">LaunchWatch</h1>
            <p className="hidden sm:block text-[var(--text-muted)] text-sm">Real-time launch tracking</p>
          </div>
          </Link>
          <Link
            href="/history"
            className="bg-[var(--primary)] hover:bg-[var(--primary-hover)] flex items-center gap-2 px-3 py-2 text-white text-sm rounded-lg transition-colors"
          >
            <span>📜</span>
            <span className="hidden sm:inline">History</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-10">
        <LiveLaunches />
        <NextLaunch />
        <LaunchList />
      </main>

      {/* Compact Footer */}
      <footer className="mt-8">
        <RocketFacts />
        <div className="glass border-t border-[var(--glass-border)] py-4">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-[var(--text-secondary)]">
            <p>
              Data from{' '}
              <a href="https://api.spacexdata.com" target="_blank" rel="noopener noreferrer" className="text-[var(--primary-hover)] hover:text-[var(--accent)]">SpaceX</a>
              {', '}
              <a href="https://ll.thespacedevs.com" target="_blank" rel="noopener noreferrer" className="text-[var(--primary-hover)] hover:text-[var(--accent)]">The Space Devs</a>
              {' & '}
              <a href="https://api.nasa.gov" target="_blank" rel="noopener noreferrer" className="text-[var(--primary-hover)] hover:text-[var(--accent)]">NASA</a>
            </p>
            <div className="flex items-center gap-2">
              <Image src="/logo.svg" alt="" width={16} height={16} className="opacity-60" />
              <span>LaunchWatch v1.0</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
