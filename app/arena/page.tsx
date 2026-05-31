import { Metadata } from 'next';
import ArenaUniversalClient from './ArenaUniversalClient';

export const metadata: Metadata = {
  title: 'The Arena — ANTCPU ADS',
  description: '30 live ads. 6 brands. One automated marketing network.',
  openGraph: {
    title: 'The Arena — ANTCPU ADS',
    description: '30 live ads. 6 brands. One automated marketing network.',
    url: 'https://antcpu-ads.vercel.app/arena',
    siteName: 'ANTCPU ADS',
    images: [{ url: 'https://antcpu-ads.vercel.app/og-image.jpg', width: 1200, height: 630, alt: 'The Arena' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The Arena — ANTCPU ADS',
    description: '30 live ads. 6 brands. One automated marketing network.',
    images: ['https://antcpu-ads.vercel.app/og-image.jpg'],
  },
};

export default function ArenaPage() {
  return <ArenaUniversalClient />;
}
