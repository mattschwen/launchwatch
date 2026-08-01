import type { LaunchIntel } from '@/lib/types';

interface CoverageSignalProps {
  intel: LaunchIntel;
  className?: string;
}

const STREAM_STATE_LABELS: Record<
  LaunchIntel['summary']['streamState'],
  string
> = {
  live: 'Live broadcast identified',
  upcoming: 'Upcoming stream identified',
  standby: 'Provider stream standby',
  search: 'Search fallback only',
  none: 'No stream lead',
};

function signalStateClass(
  state: LaunchIntel['summary']['streamState']
): string {
  if (state === 'none') return 'coverage-signal-empty';
  if (state === 'search') return 'coverage-signal-fallback';
  return 'coverage-signal-active';
}

function countStateClass(count: number): string {
  return count > 0 ? 'coverage-signal-active' : 'coverage-signal-empty';
}

export default function CoverageSignal({
  intel,
  className = '',
}: CoverageSignalProps): React.ReactElement {
  const streamState = intel.summary.streamState;
  const streamCount = intel.streamCandidates.filter(
    (candidate) => candidate.source !== 'search'
  ).length;
  const newsCount = intel.newsItems.length;
  const socialCount = intel.socialItems.length;

  return (
    <div
      role="group"
      aria-label="Coverage signal"
      className={`coverage-signal ${className}`.trim()}
    >
      <div className="coverage-signal-header">
        <p className="coverage-signal-label">Coverage signal</p>
        <p
          className={`coverage-signal-state coverage-signal-state-${streamState}`}
        >
          {STREAM_STATE_LABELS[streamState]}
        </p>
      </div>

      <div className="coverage-signal-visual" aria-hidden="true">
        <span
          className={`coverage-signal-segment coverage-signal-stream ${signalStateClass(streamState)}`}
          data-count={streamCount}
          data-state={streamState}
        />
        <span
          className={`coverage-signal-segment coverage-signal-news ${countStateClass(newsCount)}`}
          data-count={newsCount}
        />
        <span
          className={`coverage-signal-segment coverage-signal-social ${countStateClass(socialCount)}`}
          data-count={socialCount}
        />
      </div>

      <dl className="coverage-signal-counts">
        <div className="coverage-signal-count">
          <dt>Stream leads</dt>
          <dd>{streamCount}</dd>
        </div>
        <div className="coverage-signal-count">
          <dt>News reports</dt>
          <dd>{newsCount}</dd>
        </div>
        <div className="coverage-signal-count">
          <dt>Community posts</dt>
          <dd>{socialCount}</dd>
        </div>
      </dl>
    </div>
  );
}
