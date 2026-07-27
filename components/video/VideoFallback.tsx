import { ExternalLink, Search } from 'lucide-react';
import type { Launch } from '@/lib/types';
import {
  generateYouTubeSearchUrl,
  getProviderYouTubeChannel,
} from '@/lib/youtube';

interface VideoFallbackProps {
  launch: Launch;
  className?: string;
}

export default function VideoFallback({
  launch,
  className = '',
}: VideoFallbackProps): React.ReactElement {
  const searchUrl = generateYouTubeSearchUrl(launch);
  const channelUrl = getProviderYouTubeChannel(launch);

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      <a
        href={channelUrl || searchUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="action-button action-button-primary"
      >
        <ExternalLink aria-hidden="true" size={16} />
        {channelUrl ? 'Provider channel' : 'Find stream'}
      </a>
      {channelUrl ? (
        <a
          href={searchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="action-button action-button-secondary"
        >
          <Search aria-hidden="true" size={16} />
          Search YouTube
        </a>
      ) : null}
    </div>
  );
}
