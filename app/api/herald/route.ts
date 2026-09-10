import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const EXCLUDE = ['test@antcpu.com', 'antcpu@gmail.com'];

export async function GET() {
  // ── No ad submitted ───────────────────────────────────────────────────────
  const { data: allUsers } = await supabase
    .from('ad_signups')
    .select('name, email, brand_name, status, country, created_at, last_seen_at, visit_count, streak_days')
    .not('email', 'in', `(${EXCLUDE.map(e => `"${e}"`).join(',')})`)
    .order('created_at', { ascending: false });

  const { data: adEmails } = await supabase
    .from('ads')
    .select('email');

  const { data: shareAds } = await supabase
    .from('ads')
    .select('email, share_count, click_count')
    .eq('status', 'active');

  const users      = allUsers  || [];
  const withAd     = new Set((adEmails  || []).map((r: any) => r.email));
  const withShares = new Set(
    (shareAds || [])
      .filter((r: any) => (r.share_count || 0) > 0 || (r.click_count || 0) > 0)
      .map((r: any) => r.email)
  );

  const noAd = users.filter(u => !withAd.has(u.email));

  // ── No shares — has active ad but zero shares AND zero clicks ─────────────
  const { data: activeAds } = await supabase
    .from('ads')
    .select('email, title, share_count, click_count, points')
    .eq('status', 'active')
    .not('email', 'in', `(${EXCLUDE.map(e => `"${e}"`).join(',')})`);

  // Group by email — take worst performing ad per user
  const noShareMap: Record<string, any> = {};
  for (const ad of (activeAds || [])) {
    if ((ad.share_count || 0) === 0 && (ad.click_count || 0) === 0) {
      if (!noShareMap[ad.email]) {
        const user = users.find(u => u.email === ad.email);
        if (user) noShareMap[ad.email] = { ...user, ad_title: ad.title, ad_points: ad.points };
      }
    }
  }
  const noShares = Object.values(noShareMap).filter(u => !withShares.has(u.email));

  // ── Inactive — last_seen_at > 7 days or null with created_at > 7 days ────
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400 * 1000).toISOString();
  const inactive = users.filter(u =>
    withAd.has(u.email) &&
    (!u.last_seen_at || u.last_seen_at < sevenDaysAgo)
  );

  return NextResponse.json({ noAd, noShares, inactive });
}
