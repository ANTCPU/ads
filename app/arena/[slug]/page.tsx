// app/arena/[slug]/page.tsx
// ─── Brand arena page — metadata from brands table ────────────────────────────
// SLUG_ALIAS + PUBLIC_OG_FALLBACK hardcodes removed.
// Brands table is now the single source of truth for:
//   - slug resolution (brands.slug OR brands.campaign match)
//   - og_image_url
//   - tagline
//   - site_url
//   - display name
//
// Fallback chain:
//   1. brands table (og_image_url, tagline, name)
//   2. DEFAULT_OG / generic tagline
// ─────────────────────────────────────────────────────────────────────────────

import { Metadata }    from 'next';
import { createClient } from '@supabase/supabase-js';
import ArenaClient      from './ArenaClient';

const BASE       = 'https://antcpu-ads.vercel.app';
const DEFAULT_OG = `${BASE}/og-image.jpg`;

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const slug = rawSlug.toLowerCase();

  let ogImage      = DEFAULT_OG;
  let tagline      = `${slug} is live in the ANTCPU ADS Arena.`;
  let brandDisplay = slug.charAt(0).toUpperCase() + slug.slice(1);

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // ── Single query to brands table — replaces SLUG_ALIAS + PUBLIC_OG_FALLBACK
    // Matches on slug OR campaign — handles all alias variants automatically
    const { data: brand } = await supabase
      .from('brands')
      .select('name, label, og_image_url, tagline, site_url, logo_url')
      .or(`slug.eq.${slug},campaign.eq.${slug}`)
      .eq('active', true)
      .maybeSingle();

    if (brand) {
      if (brand.og_image_url) ogImage      = brand.og_image_url;
      if (brand.tagline)      tagline      = brand.tagline;
      if (brand.label || brand.name) {
        brandDisplay = brand.label || brand.name;
      }
    }
  } catch {
    // Non-fatal — fall through to defaults
  }

  const title       = `${brandDisplay} — ANTCPU ADS Arena`;
  const description = tagline;
  const url         = `${BASE}/arena/${slug}`;

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
      card:        'summary_large_image',
      title,
      description,
      images:      [ogImage],
    },
  };
}

export default function ArenaPage() {
  return <ArenaClient />;
}
