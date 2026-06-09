import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use the Service Role Key to bypass RLS restrictions safely on the server backend
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Agent token — Zapier uses this to authenticate
// Set AGENT_TOKEN in Vercel env vars
const AGENT_TOKEN = process.env.AGENT_TOKEN || 'antcpu-agent-2026';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (token !== AGENT_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [
    { data: ads },
    { data: signups },
    { data: systemAds },
    { data: pendingAds },
    { data: archivedAds },
    { data: todayClicks },
  ] = await Promise.all([
    supabase.from('ads').select('*').eq('status', 'active').order('points', { ascending: false }),
    supabase.from('ad_signups').select('email, brand_name, status, points, created_at').order('created_at', { ascending: false }).limit(20),
    supabase.from('ads').select('id, title, brand, points, share_count, click_count, image_url').eq('is_system', true).order('points', { ascending: false }),
    supabase.from('ads').select('id, brand, title, created_at').eq('status', 'pending_review'),
    supabase.from('ads').select('id').eq('status', 'archived'),
    supabase.from('ad_clicks').select('ad_id, created_at').gte('created_at', todayStart.toISOString()),
  ]);

  const totalAds    = ads?.length || 0;
  const totalUsers  = signups?.length || 0;
  const topAd       = ads?.[0] || null;
  const systemTotal = systemAds?.reduce((s: number, a: any) => s + (a.points || 0), 0) || 0;

  // Today
  const clicksToday = todayClicks?.length || 0;
  const clicksByAd: Record<string, number> = {};
  (todayClicks || []).forEach((c: any) => {
    clicksByAd[c.ad_id] = (clicksByAd[c.ad_id] || 0) + 1;
  });
  const topClickedAdId = Object.entries(clicksByAd).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  const topClickedAd   = topClickedAdId ? (ads || []).find((a: any) => a.id === topClickedAdId) : null;

  // Leaderboard top 5
  const leaderboard = (ads || []).slice(0, 5).map((a: any, i: number) => ({
    rank:      i + 1,
    brand:     a.brand,
    title:     a.title,
    points:    a.points      || 0,
    clicks:    a.click_count || 0,
    shares:    a.share_count || 0,
    tier:      a.tier,
    is_system: a.is_system   || false,
    has_image: !!a.image_url,
  }));

  // Brands breakdown
  const brandMap: Record<string, { ads: number; points: number; clicks: number; shares: number }> = {};
  (ads || []).forEach((a: any) => {
    if (!brandMap[a.brand]) brandMap[a.brand] = { ads: 0, points: 0, clicks: 0, shares: 0 };
    brandMap[a.brand].ads++;
    brandMap[a.brand].points += a.points      || 0;
    brandMap[a.brand].clicks += a.click_count || 0;
    brandMap[a.brand].shares += a.share_count || 0;
  });
  const brands = Object.entries(brandMap)
    .map(([brand, stats]) => ({ brand, ...stats }))
    .sort((a, b) => b.points - a.points);

  // Image readiness
  const withImage    = (ads || []).filter((a: any) => !!a.image_url).length;
  const withoutImage = totalAds - withImage;

  return NextResponse.json({
    status:    'ok',
    timestamp: new Date().toISOString(),
    build: {
      version: 'ADS_V03',
      features: {
        share_modal: true, facebook_share: true, twitter_share: true,
        image_cards: true, video_ads: true, scout_cap: true,
        brand_protect: true, weekly_schedule: true, arena_footer: true,
      },
      deluxe_coming_soon: ['image_upload', 'video_upload', 'custom_brand_voice'],
    },
    arena: {
      total_active_ads: totalAds,
      total_users:      totalUsers,
      top_ad: topAd ? {
        brand:  topAd.brand,
        title:  topAd.title,
        points: topAd.points,
        clicks: topAd.click_count,
        shares: topAd.share_count,
        tier:   topAd.tier,
      } : null,
    },
    today: {
      clicks:         clicksToday,
      top_clicked_ad: topClickedAd ? {
        brand:        (topClickedAd as any).brand,
        title:        (topClickedAd as any).title,
        clicks_today: clicksByAd[(topClickedAd as any).id] || 0,
      } : null,
      note: clicksToday === 0
        ? 'No clicks today yet — share ads to drive activity'
        : `${clicksToday} clicks tracked today`,
    },
    leaderboard,
    brands,
    image_readiness: {
      with_image:    withImage,
      without_image: withoutImage,
      pct_ready:     totalAds > 0 ? Math.round((withImage / totalAds) * 100) : 0,
      note: withoutImage > 0
        ? `${withoutImage} ads are text-only — image upload unlocks Deluxe tier`
        : 'All ads have images',
    },
    health: {
      pending_review:   pendingAds?.length  || 0,
      archived_total:   archivedAds?.length || 0,
      system_ads_total: systemAds?.length   || 0,
      system_pts_total: systemTotal,
    },
    system_ads: {
      count:        systemAds?.length || 0,
      total_points: systemTotal,
      ads:          systemAds || [],
    },
    recent_signups: signups || [],
    agent_user: {
      email:       'test@antcpu.com',
      brand:       'ANTCPU Test',
      trialStatus: 'team',
      dashboard:   'https://antcpu-ads.vercel.app/dashboard/antcpu',
    },
  });
}

export async function POST(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (token !== AGENT_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const action = body.action;

  // ── SHARE action — agent shares a system ad ──────────────
  if (action === 'share' && body.ad_id) {
    const { data: ad } = await supabase
      .from('ads')
      .select('id, brand, title, share_count, is_system, points')
      .eq('id', body.ad_id)
      .single();

    if (!ad) return NextResponse.json({ error: 'Ad not found' }, { status: 404 });

    // System ad cap — max 1 point per share
    const pointsToAdd = ad.is_system ? 1 : 5;
    const newShares   = (ad.share_count || 0) + 1;
    const newPoints   = (ad.points || 0) + pointsToAdd;

    await supabase.from('ads').update({
      share_count: newShares,
      points: newPoints,
    }).eq('id', body.ad_id);

    return NextResponse.json({
      status: 'shared',
      ad_id: body.ad_id,
      brand: ad.brand,
      title: ad.title,
      new_shares: newShares,
      new_points: newPoints,
      points_added: pointsToAdd,
      is_system: ad.is_system,
    });
  }

  // ── STATUS action — return current test session ───────────
  if (action === 'status') {
    return NextResponse.json({
      status: 'ok',
      agent: 'test@antcpu.com',
      timestamp: new Date().toISOString(),
      message: 'Agent session active',
    });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
