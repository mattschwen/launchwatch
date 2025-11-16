import Link from 'next/link';
import Image from 'next/image';
import PastLaunches from '@/components/PastLaunches';
import HeaderRocketFact from '@/components/HeaderRocketFact';
import Footer from '@/components/Footer';

export const metadata = {
  title: 'Launch History | LaunchWatch',
  description: 'Browse past rocket launches and their outcomes',
};

export default function HistoryPage() {
  return (
    <div className="min-h-screen">
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
              <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold gradient-text">Launch History</h1>
              <p className="hidden sm:block text-[var(--text-muted)] text-xs sm:text-sm">Browse past rocket launches & results</p>
            </div>
          </Link>
          
          {/* Facts + Home Button Container */}
          <div className="hidden lg:flex items-center gap-4 flex-1 max-w-2xl ml-6">
            <div className="glass rounded-xl overflow-hidden flex-1">
              <HeaderRocketFact />
            </div>
            
            <Link
              href="/"
              className="flex-shrink-0 group relative px-5 py-2.5 bg-white border-2 border-gray-200 hover:border-[var(--accent)] text-[var(--text-primary)] hover:text-[var(--accent)] font-semibold rounded-xl shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105"
            >
              <span className="flex items-center gap-2">
                <span className="text-base">🏠</span>
                <span className="text-sm">Home</span>
              </span>
            </Link>
          </div>

          {/* Mobile Home Button */}
          <Link
            href="/"
            className="lg:hidden flex-shrink-0 group relative px-3 sm:px-5 py-2 sm:py-2.5 bg-white border-2 border-gray-200 hover:border-[var(--accent)] text-[var(--text-primary)] hover:text-[var(--accent)] font-semibold rounded-lg sm:rounded-xl shadow-sm hover:shadow-md transition-all duration-300 active:scale-95 sm:hover:scale-105"
          >
            <span className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-base sm:text-lg">🏠</span>
              <span className="text-xs sm:text-sm">Home</span>
            </span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-6 sm:py-8 lg:py-10">
        <PastLaunches />
      </main>

      <Footer />
    </div>
  );
}
