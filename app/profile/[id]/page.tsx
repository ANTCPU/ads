import { createClient } from '@supabase/supabase-js';
import { Metadata } from 'next';
import ProfileClient from './ProfileClient';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function generateMetadata(
  { params }: { params: { id: string } }
): Promise<Metadata> {
  const id = decodeURIComponent(params.id);

  let { data: profile } = await supabase
    .from('ad_profiles')
    .select('name, brand, bio, website')
    .eq('email', id)
    .single();

  if (!profile) {
    const { data: all } = await supabase.from('ad_profiles').select('*');
    profile = all?.find(
      (p: any) => p.brand?.toLowerCase().replace(/\s+/g, '-') === id
    ) || null;
  }

  if (!profile) {
    return {
      title: 'Profile — ANTCPU ADS',
      description: 'Advertiser profile on ANTCPU ADS.',
    };
  }

  const title = `${profile.brand} — ANTCPU ADS`;
  const description = profile.bio
    ? `${profile.bio.slice(0, 140)}`
    : `${profile.brand} is advertising on ANTCPU ADS ⚡`;
  const url = `https://antcpu-ads.vercel.app/profile/${encodeURIComponent(id)}`;

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
          alt: profile.brand,
        },
      ],
      type: 'profile',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['https://antcpu-ads.vercel.app/og-image.jpg'],
    },
  };
}

export default function ProfilePage() {
  return <ProfileClient />;
}
