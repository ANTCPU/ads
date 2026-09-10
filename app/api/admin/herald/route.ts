import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const EXCLUDE = ['test@antcpu.com', 'antcpu@gmail.com'];

export async function GET() {
  try {
    // ── All real users ────────────────────────────────────────────────────────
    const { data: allUsers } = await supabase
      .from('ad_signups')
      .select('name, email, brand_name, status, country, created_at, last_seen_at, visit_count, streak_days')
      .not('email', 'in', `(${EXCLUDE.map(e => `'${e}'`).join(',')})`)
      .order('created_at', { ascending: false });

    const users = allUsers || [];

    // ── Emails that have submitted any ad ─────────────────────────────────────
    const { data: adRows } = await supabase
      .from('ads')
      .select('email, share_count, click_count, status, title, points');

    const adsByEmail: Record<string, any[]> = {};
    for (const ad of (adRows || [])) {
      if (!adsByEmail[ad.email]) adsByEmail[ad.email] = [];
      adsByEmail[ad.email].push(ad);
    }

    // ── Bucket 1 — No ad submitted ────────────────────────────────────────────
    const noAd = users.filter(u => !adsByEmail[u.email]);

    // ── Bucket 2 — Has active ad but zero shares + zero clicks ───────────────
    const noShares = users
      .filter(u => adsByEmail[u.email])
      .filter(u => {
        const activeAds = adsByEmail[u.email].filter(a => a.status === 'active');
        if (activeAds.length === 0) return false;
        const anyEngagement = activeAds.some(
          a => (a.share_count || 0) > 0 || (a.click_count || 0) > 0
        );
        return !anyEngagement;
      })
      .map(u => {
        const worst = adsByEmail[u.email]
          .filter(a => a.status === 'active')
          .sort((a, b) => (a.points || 0) - (b.points || 0))[0];
        return { ...u, ad_title: worst?.title || '', ad_points: worst?.points || 0 };
      });

    // ── Bucket 3 — Inactive 7+ days ───────────────────────────────────────────
    const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
    const inactive = users.filter(u =>
      adsByEmail[u.email] &&
      (!u.last_seen_at || u.last_seen_at < sevenDaysAgo)
    );

    return NextResponse.json({ noAd, noShares, inactive });

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
