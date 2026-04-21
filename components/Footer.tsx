import { Code2, ExternalLink } from 'lucide-react';

export default function Footer(): React.ReactElement {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-[var(--panel-border)] bg-[var(--bg-secondary)]">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          {/* Data Sources */}
          <div className="flex flex-wrap items-center gap-3 text-[10px] sm:text-xs text-[var(--text-muted)] font-[family-name:var(--font-geist-mono)] tracking-wider">
            <span className="console-label">DATA:</span>
            {[
              { href: 'https://ll.thespacedevs.com', label: 'LL2' },
              { href: 'https://api.spaceflightnewsapi.net', label: 'SNAPI' },
              { href: 'https://api.nasa.gov', label: 'NASA' },
              { href: 'https://open-meteo.com', label: 'OPEN-METEO' },
            ].map((source, i) => (
              <span key={source.href} className="inline-flex items-center gap-1">
                {i > 0 && <span className="text-[var(--panel-border)]">{'/'}{'/'}</span>}
                <a
                  href={source.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--text-muted)] hover:text-[var(--console-cyan)] transition-colors inline-flex items-center gap-0.5"
                >
                  {source.label}
                  <ExternalLink size={8} />
                </a>
              </span>
            ))}
          </div>

          {/* Right: Author + GitHub + Copyright */}
          <div className="flex items-center gap-4 text-[10px] sm:text-xs text-[var(--text-muted)] font-[family-name:var(--font-geist-mono)] tracking-wider">
            <span>
              BUILT BY{' '}
              <a
                href="https://github.com/mattschwen"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--console-cyan)] hover:text-[var(--text-primary)] transition-colors"
              >
                MATT SCHWEN
              </a>
            </span>
            <span className="text-[var(--panel-border)]">{'/'}{'/'}</span>
            <a
              href="https://github.com/mattschwen/launchwatch"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 hover:text-[var(--console-green)] transition-colors"
            >
              <Code2 size={14} />
              <span className="hidden sm:inline">OPEN SOURCE</span>
            </a>
            <span className="text-[var(--panel-border)]">{'/'}{'/'}</span>
            <span>&copy; {currentYear} LAUNCHWATCH</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
