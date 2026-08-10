import type { Metadata } from 'next';
import HomeContent from '@/components/HomeContent';

const scheduleTitle = 'Launch schedule | LaunchWatch';
const scheduleDescription =
  'Track upcoming launches, official coverage, and mission telemetry from SpaceX and Launch Library 2.';

export const metadata: Metadata = {
  title: scheduleTitle,
  description: scheduleDescription,
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: scheduleTitle,
    description: scheduleDescription,
    type: 'website',
    url: '/',
  },
  twitter: {
    card: 'summary_large_image',
    title: scheduleTitle,
    description: scheduleDescription,
  },
};

export default function Home(): React.ReactElement {
  return <HomeContent />;
}
