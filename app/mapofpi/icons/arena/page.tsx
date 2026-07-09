import { Metadata } from 'next';
import MapOfPiArenaClient from './MapOfPiArenaClient';

export const metadata: Metadata = {
  title: 'Country Champions Arena — Map of Pi × ANTCPU ADS',
  description: 'Map of Pi sellers from every country. Real shops. Real Pi commerce. Powered by the ANTCPU ADS network.',
  openGraph: {
    title: 'Country Champions Arena — Map of Pi',
    description: 'Map of Pi sellers from every country. Real shops. Real Pi commerce.',
    url: 'https://antcpu-ads.vercel.app/mapofpi/icons/arena',
    siteName: 'ANTCPU ADS',
    images: [{ url: 'https://antcpu-ads.vercel.app/og-image.jpg', width: 1200, height: 630, alt: 'Map of Pi Country Champions Arena' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Country Champions Arena — Map of Pi',
    description: 'Map of Pi sellers from every country. Real shops. Real Pi commerce.',
    images: ['https://antcpu-ads.vercel.app/og-image.jpg'],
  },
};

export default function MapOfPiArenaPage() {
  return <MapOfPiArenaClient />;
}
