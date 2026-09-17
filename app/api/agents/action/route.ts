// app/api/agents/action/route.ts
// ─── Agent Action — share + status ───────────────────────────────────────────
// Token-gated POST — executes agent actions against the Arena.
// Actions: share (increment share_count + points), status (health check)
//
// Moved from: /api/agent POST (Sep 2026)
// Note: share action here is a direct write — bypasses Scout scoring.
// For full scoring (badges, tiers, rank), use /api/agents/scout instead.
// Auth: AGENT_TOKEN query param
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient }              from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const AGENT_TOKEN = process.env.AGENT_TOKEN || 'antcpu-agent-2026';

export async function POST(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (token !== AGENT_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body   = await req.json().catch(() => ({}));
  const action = body.action;

  // ── share — direct write, no Scout scoring ────────────────────────────────
  if (action === 'share' && body.ad_id) {
    const { data: ad } = await supabase
      .from('ads')
      .select('id, brand, title, share_count, is_system, points')
      .eq('id', body.ad_id)
      .single();

    if (!ad) return NextResponse.json({ error: 'Ad not found' }, { status: 404 });

    const pointsToAdd = ad.is_system ? 1 : 5;
    const newShares   = (ad.share_count || 0) + 1;
    const newPoints   = (ad.points      || 0) + pointsToAdd;

    await supabase.from('ads').update({
      share_count: newShares,
      points:      newPoints,
    }).eq('id', body.ad_id);

    return NextResponse.json({
      status:       'shared',
      agent:        'antcpu-agent',
      ad_id:        body.ad_id,
      brand:        ad.brand,
      new_shares:   newShares,
      new_points:   newPoints,
      points_added: pointsToAdd,
      is_system:    ad.is_system,
    });
  }

  // ── status — health check ─────────────────────────────────────────────────
  if (action === 'status') {
    return NextResponse.json({
      status:    'ok',
      agent:     'antcpu-agent',
      version:   'ADS_V05',
      timestamp: new Date().toISOString(),
    });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
