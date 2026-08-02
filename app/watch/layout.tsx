import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Watch Launches | LaunchWatch',
  description:
    'Follow the active launch feed, official provider coverage, mission queue, and live mission intelligence.',
  alternates: {
    canonical: '/watch',
  },
  openGraph: {
    title: 'Watch Launches | LaunchWatch',
    description:
      'Follow the active launch feed, official provider coverage, mission queue, and live mission intelligence.',
    type: 'website',
    url: '/watch',
  },
};

export default function WatchLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.ReactNode {
  return children;
}
