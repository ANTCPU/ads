import { Metadata } from 'next';
import ArenaClient from './ArenaClient';

// ─── Only the network itself is hardcoded ────────────────────
// All other brands fall back to og-image.jpg until they upload
// their own via the brand OG page (planned — ad_profiles.og_image_url)

const DEFAULT_OG = 'https://antcpu-ads.vercel.app/og-image.jpg';

const SLUG_ALIAS: Record<string, string> = {
  'ads-network': 'antcpu',
  'antcpuads':   'antcpu',
  'adsnetwork':  'antcpu',
};

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const slug = rawSlug.toLowerCase();
  const resolvedSlug = SLUG_ALIAS[slug] ?? slug;

  // ANTCPU ADS is the network — special case only
  if (resolvedSlug === 'antcpu') {
    return {
      title: 'ANTCPU ADS — The Arena',
      description: 'The Arena — automated marketing network powered by AI antbots.',
      openGraph: {
        title: 'ANTCPU ADS — The Arena',
        description: 'The Arena — automated marketing network powered by AI antbots.',
        url: `https://antcpu-ads.vercel.app/arena/${slug}`,
        siteName: 'ANTCPU ADS',
        images: [{ url: DEFAULT_OG, width: 1200, height: 630, alt: 'ANTCPU ADS' }],
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title: 'ANTCPU ADS — The Arena',
        description: 'The Arena — automated marketing network powered by AI antbots.',
        images: [DEFAULT_OG],
      },
    };
  }

  // All other brands — generic fallback until og_image_url exists
  // TODO: when ad_profiles.og_image_url is added, fetch here and use it
  const brandName = resolvedSlug.charAt(0).toUpperCase() + resolvedSlug.slice(1);
  const title = `${brandName} — ANTCPU ADS Arena`;

  return {
    title,
    description: `${brandName} is live in the ANTCPU ADS Arena.`,
    openGraph: {
      title,
      description: `${brandName} is live in the ANTCPU ADS Arena.`,
      url: `https://antcpu-ads.vercel.app/arena/${slug}`,
      siteName: 'ANTCPU ADS',
      images: [{ url: DEFAULT_OG, width: 1200, height: 630, alt: brandName }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: `${brandName} is live in the ANTCPU ADS Arena.`,
      images: [DEFAULT_OG],
    },
  };
}

export default function ArenaPage() {
  return <ArenaClient />;
}
