import { Metadata }   from 'next';
import { createClient } from '@supabase/supabase-js';
import ProfileClient  from './ProfileClient';

const BASE = 'https://antcpu-ads.vercel.app';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug);

  // Try by email first, then by brand slug
  let { data: profile } = await supabase
    .from('ad_profiles')
    .select('name, brand, bio, website, avatar')
    .eq('email', slug)
    .maybeSingle();

  if (!profile) {
    const { data: all } = await supabase.from('ad_profiles').select('*');
    profile = all?.find(
      (p: any) => p.brand?.toLowerCase().replace(/\s+/g, '-') === slug
    ) || null;
  }

  if (!profile) return {
    title: 'Profile — ANTCPU ADS',
    description: 'Advertiser profile on ANTCPU ADS.',
  };

  const title       = `${profile.brand} — ANTCPU ADS`;
  const description = profile.bio
    ? profile.bio.slice(0, 140)
    : `${profile.brand} is advertising on ANTCPU ADS ⚡`;
  const url         = `${BASE}/profile/${rawSlug}`;
  const image       = profile.avatar || `${BASE}/og-image.jpg`;

  return {
    title,
    description,
    openGraph: {
      title, description, url,
      siteName: 'ANTCPU ADS',
      images: [{ url: image, width: 1200, height: 630, alt: profile.brand }],
      type: 'profile',
    },
    twitter: {
      card: 'summary_large_image',
      title, description,
      images: [image],
    },
  };
}

export default function ProfilePage() {
  return <ProfileClient />;
}
