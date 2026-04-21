import { Launch, LaunchIntel } from './types';
import { generateYouTubeSearchUrl, getProviderYouTubeChannel, inferLaunchProvider } from './youtube';

export function getFallbackLaunchSummary(launch: Launch): LaunchIntel['summary'] {
  const provider = inferLaunchProvider(launch);
  const providerChannel = getProviderYouTubeChannel(launch);

  if (providerChannel) {
    return {
      streamState: 'standby',
      recommendedLabel: 'Track Provider Channel',
      recommendedUrl: providerChannel,
      rationale: `${provider} has no verified broadcast ranked yet, so the official channel is the best standby view.`,
      lastUpdated: new Date().toISOString(),
    };
  }

  if (launch.livestream) {
    return {
      streamState: launch.isLive ? 'live' : 'standby',
      recommendedLabel: launch.isLive ? 'Open Provider Link' : 'Open Stream Link',
      recommendedUrl: launch.livestream,
      rationale: 'Launch data includes a webcast URL, but it has not been verified against live search results yet.',
      lastUpdated: new Date().toISOString(),
    };
  }

  return {
    streamState: 'search',
    recommendedLabel: 'Search for Stream',
    recommendedUrl: generateYouTubeSearchUrl(launch),
    rationale: 'No provider stream is attached yet, so YouTube search is the best public fallback.',
    lastUpdated: new Date().toISOString(),
  };
}
