// ============================================================
// app/api/cron/route.ts
// GET — Master cron job (Vercel allows 1 per day on this plan)
// Runs: nudge engine + ad activation + cohort snapshot update
// Schedule: 0 8 * * * (8am UTC daily)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient }              from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BASE = 'https://antcpu-ads.vercel.app';
const CORS = {
  'Access-Control-Allow-Origin':  BASE,
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Cache-Control':                'no-store',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS });
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: CORS });

  const t0      = Date.now();
  const results: Record<string, unknown> = {};

  // ── 1. Nudge engine ───────────────────────────────────────
  try {
    const nudgeRes = await fetch(`${BASE}/api/cron/nudge`, {
      headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
      cache: 'no-store',
    });
    results.nudge = await nudgeRes.json();
  } catch (e) {
    results.nudge = { error: e instanceof Error ? e.message : 'failed' };
  }

  // ── 2. Ad activation — Day 1 of active cohort ────────────
  // Activate challenger intro ads when cohort goes live
  try {
    const clock = await fetch(`${BASE}/api/clock`, { cache: 'no-store' })
      .then(r => r.json()).catch(() => null);

    if (clock?.day === 1 && clock?.is_active) {
      // Set ads to active for all challengers in current cohort
      // who have an ad_id and whose ad is still pending/inactive
      const { data: challengers } = await supabase
        .from('challengers')
        .select('ad_id')
        .eq('cohort', clock.cohort)
        .eq('status', 'active')
        .not('ad_id', 'is', null);

      const adIds = (challengers ?? []).map(c => c.ad_id).filter(Boolean);

      if (adIds.length > 0) {
        const { count } = await supabase
          .from('ads')
          .update({ status: 'active' })
          .in('id', adIds)
          .neq('status', 'active');

        results.ad_activation = { activated: adIds.length, cohort: clock.cohort };
      } else {
        results.ad_activation = { activated: 0, reason: 'no_ads_to_activate' };
      }
    } else {
      results.ad_activation = { skipped: true, reason: `day_${clock?.day ?? '?'}_not_day1` };
    }
  } catch (e) {
    results.ad_activation = { error: e instanceof Error ? e.message : 'failed' };
  }

  // ── 3. Cohort snapshot update ─────────────────────────────
  // Update running totals on cohort_snapshots daily
  try {
    const clock = await fetch(`${BASE}/api/clock`, { cache: 'no-store' })
      .then(r => r.json()).catch(() => null);

    if (clock?.cohort) {
      const [regCount, gradCount, subCount, postCount, avgRes] = await Promise.all([
        supabase.from('challengers').select('*', { count: 'exact', head: true })
          .eq('cohort', clock.cohort),
        supabase.from('challengers').select('*', { count: 'exact', head: true })
          .eq('cohort', clock.cohort).eq('status', 'graduated'),
        supabase.from('submissions').select('submissions.id', { count: 'exact', head: true })
          .eq('challengers.cohort', clock.cohort),
        supabase.from('office_messages').select('*', { count: 'exact', head: true })
          .eq('cohort', clock.cohort),
        supabase.from('challengers').select('progress_pct')
          .eq('cohort', clock.cohort).eq('status', 'active')
          .not('profile_type', 'in', '("team","founder")'),
      ]);

      const avgProgress = avgRes.data?.length
        ? Math.round(avgRes.data.reduce((s: number, c: any) => s + (c.progress_pct ?? 0), 0) / avgRes.data.length)
        : null;

      await supabase.from('cohort_snapshots').update({
        total_registered: regCount.count ?? 0,
        total_completed:  gradCount.count ?? 0,
        community_posts:  postCount.count ?? 0,
        avg_progress_pct: avgProgress,
      }).eq('cohort', clock.cohort);

      results.snapshot = { updated: true, cohort: clock.cohort };
    }
  } catch (e) {
    results.snapshot = { error: e instanceof Error ? e.message : 'failed' };
  }

  return NextResponse.json({
    ok: true,
    runtime_ms: Date.now() - t0,
    results,
  }, { headers: CORS });
}
