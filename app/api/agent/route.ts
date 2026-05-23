import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Agent token — Zapier uses this to authenticate
// Set AGENT_TOKEN in Vercel env vars
const AGENT_TOKEN = process.env.AGENT_TOKEN || 'antcpu-agent-2026';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');

  if (token !== AGENT_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Fetch full arena state for agent
  const [
    { data: ads },
    { data: signups },
    { data: systemAds },
  ] = await Promise.all([
    supabase.from('ads').select('*').eq('status', 'active').order('points', { ascending: false }),
    supabase.from('ad_signups').select('email, brand_name, status, points, created_at').order('created_at', { ascending: false }).limit(20),
    supabase.from('ads').select('id, title, points, share_count, click_count').eq('is_system', true).order('points', { ascending: false }),
  ]);

  const totalAds    = ads?.length || 0;
  const totalUsers  = signups?.length || 0;
  const topAd       = ads?.[0] || null;
  const systemTotal = systemAds?.reduce((s, a) => s + (a.points || 0), 0) || 0;

  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    arena: {
      total_active_ads: totalAds,
      total_users: totalUsers,
      top_ad: topAd ? {
        brand: topAd.brand,
        title: topAd.title,
        points: topAd.points,
        clicks: topAd.click_count,
        shares: topAd.share_count,
      } : null,
    },
    system_ads: {
      count: systemAds?.length || 0,
      total_points: systemTotal,
      ads: systemAds || [],
    },
    recent_signups: signups || [],
    agent_user: {
      email: 'test@antcpu.com',
      brand: 'ANTCPU Test',
      trialStatus: 'team',
      dashboard: 'https://antcpu-ads.vercel.app/dashboard/user',
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
