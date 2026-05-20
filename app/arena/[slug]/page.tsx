import { Metadata } from 'next';
import ArenaClient from './ArenaClient';

const BRAND_META: Record<string, { name: string; tagline: string; url: string }> = {
  mapofpi: {
    name: 'Map of Pi',
    tagline: 'The future of Pi eCommerce — 2.1M+ users, 148K sellers, 173K+ transactions.',
    url: 'https://mapofpi.com',
  },
  antcpu: {
    name: 'ANTCPU',
    tagline: 'Automated marketing network powered by AI antbots.',
    url: 'https://antcpu.com',
  },
  test: {
    name: 'ANTCPU TEST',
    tagline: 'Arena Copilot — Test Environment.',
    url: 'https://antcpu-ads.vercel.app',
  },
};

export async function generateMetadata(
  { params }: { params: { slug: string } }
): Promise<Metadata> {
  const slug = params.slug.toLowerCase();
  const brand = BRAND_META[slug];

  if (!brand) {
    return {
      title: 'Brand Arena — ANTCPU ADS',
      description: 'Explore brand arenas on ANTCPU ADS.',
    };
  }

  const title = `${brand.name} — ANTCPU ADS Arena`;
  const description = brand.tagline;
  const url = `https://antcpu-ads.vercel.app/arena/${slug}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: 'ANTCPU ADS',
      images: [
        {
          url: 'https://antcpu-ads.vercel.app/og-image.jpg',
          width: 1200,
          height: 630,
          alt: brand.name,
        },
      ],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['https://antcpu-ads.vercel.app/og-image.jpg'],
    },
  };
}

export default function ArenaPage() {
  return <ArenaClient />;
}
