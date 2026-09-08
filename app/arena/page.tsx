import { Metadata } from 'next';
import ArenaUniversalClient from './ArenaUniversalClient';

// ─── Dynamic OG meta — fetches live stats at request time ─────────────────────
export async function generateMetadata(): Promise<Metadata> {
  let adCount   = 62;
  let brandCount = 11;

  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || 'https://antcpu-ads.vercel.app'}/api/stats`,
      { next: { revalidate: 3600 } } // refresh every hour
    );
    if (res.ok) {
      const data = await res.json();
      adCount    = data.totalAds    ?? adCount;
      brandCount = data.totalBrands ?? brandCount;
    }
  } catch {}

  const desc = `${adCount} live ads. ${brandCount} brands. One automated marketing network.`;

  return {
    title: 'The Arena — ANTCPU ADS',
    description: desc,
    openGraph: {
      title:       'The Arena — ANTCPU ADS',
      description: desc,
      url:         'https://antcpu-ads.vercel.app/arena',
      siteName:    'ANTCPU ADS',
      images: [{ url: 'https://antcpu-ads.vercel.app/og-image.jpg', width: 1200, height: 630, alt: 'The Arena' }],
      type: 'website',
    },
    twitter: {
      card:        'summary_large_image',
      title:       'The Arena — ANTCPU ADS',
      description: desc,
      images:      ['https://antcpu-ads.vercel.app/og-image.jpg'],
    },
  };
}

export default function ArenaPage() {
  return <ArenaUniversalClient />;
}
