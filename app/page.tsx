import Link from 'next/link';
import Image from 'next/image';
import LiveLaunches from '@/components/LiveLaunches';
import NextLaunch from '@/components/NextLaunch';
import LaunchList from '@/components/LaunchList';
import HeaderRocketFact from '@/components/HeaderRocketFact';
import NotificationPrompt from '@/components/NotificationPrompt';
import Footer from '@/components/Footer';

export default function Home() {
  return (
    <div className="min-h-screen">
      <NotificationPrompt />
      
      {/* Compact Header */}
      <header className="w-full bg-white sticky top-0 z-50 border-b border-gray-200 shadow-sm overflow-hidden">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 flex items-center justify-between gap-2 sm:gap-4 h-14 sm:h-16 lg:h-20">
          <Link href="/" className="flex items-center gap-2 sm:gap-3 group flex-shrink-0">
          <Image
            src="/logo.svg"
            alt="LaunchWatch"
            width={128}
            height={128}
            className="w-12 h-12 sm:w-24 sm:h-24 lg:w-32 lg:h-32 transition-transform group-hover:scale-105"
          />
          <div>
            <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold gradient-text">LaunchWatch</h1>
            <p className="hidden sm:block text-[var(--text-muted)] text-xs sm:text-sm">Track upcoming rocket launches & livestreams</p>
          </div>
          </Link>
          
          {/* Facts + History Button Container */}
          <div className="hidden lg:flex items-center gap-4 flex-1 max-w-2xl ml-6">
            <div className="glass rounded-xl overflow-hidden flex-1">
              <HeaderRocketFact />
            </div>
            
            <Link
              href="/history"
              className="flex-shrink-0 group relative px-5 py-2.5 bg-white border-2 border-gray-200 hover:border-[var(--primary)] text-[var(--text-primary)] hover:text-[var(--primary)] font-semibold rounded-xl shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105"
            >
              <span className="flex items-center gap-2">
                <span className="text-base">📚</span>
                <span className="text-sm">History</span>
              </span>
            </Link>
          </div>

          {/* Mobile History Button */}
          <Link
            href="/history"
            className="lg:hidden flex-shrink-0 group relative px-3 sm:px-5 py-2 sm:py-2.5 bg-white border-2 border-gray-200 hover:border-[var(--primary)] text-[var(--text-primary)] hover:text-[var(--primary)] font-semibold rounded-lg sm:rounded-xl shadow-sm hover:shadow-md transition-all duration-300 active:scale-95 sm:hover:scale-105"
          >
            <span className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-base sm:text-lg">📚</span>
              <span className="text-xs sm:text-sm">History</span>
            </span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-6 sm:py-8 lg:py-10 space-y-6 sm:space-y-8 lg:space-y-10">
        <LiveLaunches />
        <NextLaunch />
        <LaunchList />
      </main>

      <Footer />
    </div>
  );
}
