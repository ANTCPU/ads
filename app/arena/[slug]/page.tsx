import { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';
import ArenaClient from './ArenaClient';

const BASE = 'https://antcpu-ads.vercel.app';
const DEFAULT_OG = `${BASE}/og-image.jpg`;

// Slug aliases — antcpu variants all resolve to 'antcpu'
const SLUG_ALIAS: Record<string, string> = {
  'ads-network': 'antcpu',
  'antcpuads':   'antcpu',
  'adsnetwork':  'antcpu',
};

// OG fallbacks for known slugs that have files in public/
// but may not have an ad_profiles row yet
const PUBLIC_OG_FALLBACK: Record<string, string> = {
  antcpu:  `${BASE}/og-image.jpg`,
  mapofpi: `${BASE}/og-mapofpi.jpg`,
};

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const slug = rawSlug.toLowerCase();
  const resolvedSlug = SLUG_ALIAS[slug] ?? slug;

  // Try ad_profiles first — brand may have uploaded their own OG image
  let ogImage  = PUBLIC_OG_FALLBACK[resolvedSlug] ?? DEFAULT_OG;
  let tagline  = `${resolvedSlug} is live in the ANTCPU ADS Arena.`;
  let siteUrl  = '';

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data } = await supabase
      .from('ad_profiles')
      .select('og_image_url, tagline, site_url')
      .ilike('brand_name', resolvedSlug)
      .maybeSingle();

    if (data?.og_image_url) ogImage = data.og_image_url;
    if (data?.tagline)      tagline = data.tagline;
    if (data?.site_url)     siteUrl = data.site_url;
  } catch {
    // Non-fatal — fall through to defaults
  }

  const brandDisplay = resolvedSlug.charAt(0).toUpperCase() + resolvedSlug.slice(1);
  const title        = `${brandDisplay} — ANTCPU ADS Arena`;
  const description  = tagline;
  const url          = `${BASE}/arena/${slug}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: 'ANTCPU ADS',
      images: [{ url: ogImage, width: 1200, height: 630, alt: brandDisplay }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  };
}

export default function ArenaPage() {
  return <ArenaClient />;
}
