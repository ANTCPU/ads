import { Metadata } from 'next';
import ArenaClient from './ArenaClient';

const BASE = 'https://antcpu-ads.vercel.app';

// OG images that actually exist in public/
// Only wire what's confirmed — nothing else
const OG_IMAGES: Record<string, string> = {
  antcpu:      `${BASE}/og-image.jpg`,
  'ads-network': `${BASE}/og-image.jpg`,
  antcpuads:   `${BASE}/og-image.jpg`,
  adsnetwork:  `${BASE}/og-image.jpg`,
  mapofpi:     `${BASE}/og-mapofpi.jpg`,
};

const DEFAULT_OG = `${BASE}/og-image.jpg`;

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const slug = rawSlug.toLowerCase();

  const ogImage = OG_IMAGES[slug] ?? DEFAULT_OG;
  const title   = `${slug.charAt(0).toUpperCase() + slug.slice(1)} — ANTCPU ADS Arena`;
  const url     = `${BASE}/arena/${slug}`;

  return {
    title,
    description: `${slug} is live in the ANTCPU ADS Arena.`,
    openGraph: {
      title,
      description: `${slug} is live in the ANTCPU ADS Arena.`,
      url,
      siteName: 'ANTCPU ADS',
      images: [{ url: ogImage, width: 1200, height: 630, alt: slug }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: `${slug} is live in the ANTCPU ADS Arena.`,
      images: [ogImage],
    },
  };
}

export default function ArenaPage() {
  return <ArenaClient />;
}
