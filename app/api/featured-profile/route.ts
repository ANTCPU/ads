// app/api/featured-profile/route.ts
// ─── Featured Partner — single source of truth ───────────────────────────────
// Reads user_badges for featured-profile holder.
// Joins ad_signups + ad_profiles + ads.
// Powers: arena block, dashboard card, mac page, footer, homepage.
// Cache: 1hr revalidation — badge changes take effect within the hour.
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse }          from 'next/server';
import { createClient }          from '@supabase/supabase-js';
import { getFeaturedProfileHolder } from '../../lib/badges';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BRAND_COLORS: Record<string, string> = {
  'mishoemanda@gmail.com': '#ff0080',  // Amanda Photography
  'joosdup.pj@gmail.com':  '#D4AF37',  // Map of Pi / Philip
};
const DEFAULT_COLOR = '#f0883e';

export const revalidate = 3600; // 1hr cache

export async function GET() {
  try {
    const email = await getFeaturedProfileHolder(supabase);
    if (!email) {
      return NextResponse.json({ ok: true, featured: null });
    }

    const [signupRes, profileRes, adRes] = await Promise.all([
      supabase
        .from('ad_signups')
        .select('name, brand_name, points')
        .eq('email', email)
        .maybeSingle(),
      supabase
        .from('ad_profiles')
        .select('bio, website_url')
        .eq('email', email)
        .maybeSingle(),
      supabase
        .from('ads')
        .select('title, url, points, rank_position, image_url, category')
        .eq('email', email)
        .eq('status', 'active')
        .order('points', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    return NextResponse.json({
      ok: true,
      featured: {
        email,
        name:        signupRes.data?.name       || '',
        brand:       signupRes.data?.brand_name || '',
        points:      signupRes.data?.points     || 0,
        bio:         profileRes.data?.bio       || '',
        websiteUrl:  profileRes.data?.website_url || adRes.data?.url || '',
        adTitle:     adRes.data?.title          || '',
        adUrl:       adRes.data?.url            || '',
        adPoints:    adRes.data?.points         || 0,
        rank:        adRes.data?.rank_position  || null,
        imageUrl:    adRes.data?.image_url      || null,
        category:    adRes.data?.category       || '',
        color:       BRAND_COLORS[email]        || DEFAULT_COLOR,
        profileUrl:  `/profile/${encodeURIComponent(email)}`,
      },
    });

  } catch (e: unknown) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'unknown' },
      { status: 500 }
    );
  }
}
