import { Metadata } from 'next';
import ChampionsClient from './ChampionsClient';

export const metadata: Metadata = {
  title: 'Country Champions — ANTCPU ADS',
  description: 'Map of Pi pioneers representing their countries in the Arena. Every Pi marketer is a country champion. Updated live.',
  openGraph: {
    title: 'Country Champions — ANTCPU ADS',
    description: 'Map of Pi pioneers representing their countries in the Arena. Every Pi marketer is a country champion. Updated live.',
    url: 'https://antcpu-ads.vercel.app/champions',
    siteName: 'ANTCPU ADS',
    images: [{ url: 'https://antcpu-ads.vercel.app/og-image.jpg', width: 1200, height: 630, alt: 'Country Champions — ANTCPU ADS' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Country Champions — ANTCPU ADS',
    description: 'Map of Pi pioneers representing their countries in the Arena. Every Pi marketer is a country champion. Updated live.',
    images: ['https://antcpu-ads.vercel.app/og-image.jpg'],
  },
};

export default function ChampionsPage() {
  return <ChampionsClient />;
}
