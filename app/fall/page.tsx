import { Metadata } from 'next';
import FallClient   from './FallClient';

// ─── app/fall/page.tsx ────────────────────────────────────────────────────────
// Server wrapper for the Fall 2026 Arena landing page.
// Route: /fall
//
// Pattern mirrors /arena/page.tsx exactly:
//   — generateMetadata() fetches live stats at request time (revalidate 3600)
//   — default export renders the client component
//
// Season: 1-fall2026 · Sep 22 → Dec 21 2026
// Color:  #e85d04 (from seasons.ts)
// ─────────────────────────────────────────────────────────────────────────────

export async function generateMetadata(): Promise<Metadata> {
  let adCount    = 0;
  let brandCount = 0;
  let pointCount = 0;

  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || 'https://antcpu-ads.vercel.app'}/api/stats`,
      { next: { revalidate: 3600 } }
    );
    if (res.ok) {
      const data = await res.json();
      adCount    = data.totalAds    ?? 0;
      brandCount = data.totalBrands ?? 0;
      pointCount = data.livePoints  ?? 0;
    }
  } catch {}

  const desc = adCount > 0
    ? `${adCount} live ads · ${brandCount} brands · ${pointCount.toLocaleString()} points. Fall 2026 Arena — Sep 22 to Dec 21.`
    : 'Fall 2026 Arena — Sep 22 to Dec 21. The first season of the ANTCPU ADS network.';

  return {
    title:       'Fall 2026 — ANTCPU ADS Arena',
    description: desc,
    openGraph: {
      title:       'Fall 2026 Arena — ANTCPU ADS',
      description: desc,
      url:         'https://antcpu-ads.vercel.app/fall',
      siteName:    'ANTCPU ADS',
      images: [{
        url:    'https://antcpu-ads.vercel.app/og-image.jpg',
        width:  1200,
        height: 630,
        alt:    'Fall 2026 Arena',
      }],
      type: 'website',
    },
    twitter: {
      card:        'summary_large_image',
      title:       'Fall 2026 Arena — ANTCPU ADS',
      description: desc,
      images:      ['https://antcpu-ads.vercel.app/og-image.jpg'],
    },
  };
}

export default function FallPage() {
  return <FallClient />;
}
