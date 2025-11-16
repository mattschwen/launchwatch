import Image from 'next/image';
import Link from 'next/link';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-8 sm:mt-12 border-t border-gray-200 bg-white/50">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-6 sm:py-8">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 mb-6 sm:mb-8">
          {/* About Section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Image src="/logo.svg" alt="LaunchWatch" width={32} height={32} />
              <h3 className="font-bold text-lg gradient-text">LaunchWatch</h3>
            </div>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              Real-time rocket launch tracking powered by open data from SpaceX, The Space Devs, and NASA.
            </p>
          </div>

          {/* Data Sources */}
          <div>
            <h3 className="font-semibold text-sm text-[var(--text-primary)] mb-3 uppercase tracking-wide">
              Data Sources
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a 
                  href="https://api.spacexdata.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-[var(--text-secondary)] hover:text-[var(--primary)] transition-colors"
                >
                  SpaceX API
                </a>
              </li>
              <li>
                <a 
                  href="https://ll.thespacedevs.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-[var(--text-secondary)] hover:text-[var(--primary)] transition-colors"
                >
                  The Space Devs (Launch Library 2)
                </a>
              </li>
              <li>
                <a 
                  href="https://api.nasa.gov" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-[var(--text-secondary)] hover:text-[var(--primary)] transition-colors"
                >
                  NASA Open APIs
                </a>
              </li>
            </ul>
          </div>

          {/* Open Source */}
          <div>
            <h3 className="font-semibold text-sm text-[var(--text-primary)] mb-3 uppercase tracking-wide">
              Open Source
            </h3>
            <p className="text-sm text-[var(--text-secondary)] mb-3">
              LaunchWatch is free and open source under the MIT License.
            </p>
            <a
              href="https://github.com/matthewschwen/launchwatch"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--text-primary)] hover:bg-gray-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Image 
                src="/github-mark.svg" 
                alt="GitHub" 
                width={20} 
                height={20}
                className="invert"
              />
              View on GitHub
            </a>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--text-muted)]">
            <span>© {currentYear} LaunchWatch</span>
            <span className="hidden sm:inline">•</span>
            <a
              href="https://github.com/matthewschwen/launchwatch/blob/main/LICENSE"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[var(--primary)] transition-colors"
            >
              MIT License
            </a>
            <span className="hidden sm:inline">•</span>
            <span>Made with ❤️ for space enthusiasts</span>
          </div>
          
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
            <span>Built with</span>
            <a 
              href="https://nextjs.org" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-[var(--primary)] transition-colors font-medium"
            >
              Next.js
            </a>
            <span>&</span>
            <a 
              href="https://tailwindcss.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-[var(--primary)] transition-colors font-medium"
            >
              Tailwind CSS
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

