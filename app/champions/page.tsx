import { Metadata } from 'next';
import ChampionsClient from './ChampionsClient';

export const metadata: Metadata = {
  title: 'Country Champions — Map of Pi',
  description: 'See which ones are leading their countries in the Arena. One champion per nation. Updated live.',
  openGraph: {
    title: 'Country Champions — Map of Pi',
    description: 'See pioneers who are leading their countries in the Arena. One champion per nation. Updated live.',
    url: 'https://antcpu-ads.vercel.app/champions',
    siteName: 'Map of Pi',
    images: [{ url: 'https://antcpu-ads.vercel.app/og-image.jpg', width: 1200, height: 630, alt: 'Country Champions' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Country Champions — Map of Pi',
    description: 'See which brands are leading their countries in the Arena. One champion per nation. Updated live.',
    images: ['https://antcpu-ads.vercel.app/og-image.jpg'],
  },
};

export default function ChampionsPage() {
  return <ChampionsClient />;
}
