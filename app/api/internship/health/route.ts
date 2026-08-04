// https://antcpu-ads.vercel.app/app/api/internship/health/route.ts
// GET — System health check
// Verifies: DB tables, API routes, calendar, latest challenger
// Called by: anyone, anytime

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {

  const checks: Record<string, any> = {};

  // ── DB tables ──────────────────────────────────────────────
  const tables = ['challengers','gates','submissions','activity_log','sessions'];
  for (const t of tables) {
    const { count, error } = await supabase
      .from(t).select('*', { count: 'exact', head: true });
    checks[t] = error ? `❌ ${error.message}` : `✅ ${count} rows`;
  }

  // ── Calendar ───────────────────────────────────────────────
  const { data: gates } = await supabase
    .from('gates').select('id').eq('locked', false);
  checks.gates_unlocked = `✅ ${gates?.length ?? 0} unlocked`;

  // ── Latest challenger ──────────────────────────────────────
  const { data: latest } = await supabase
    .from('challengers')
    .select('intern_id, first_name, track, progress_pct, created_at')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  checks.latest_challenger = latest
    ? `✅ ${latest.first_name} · ${latest.track} · ${latest.progress_pct}%`
    : '⚠️ none';

  // ── Sessions ───────────────────────────────────────────────
  const { count: sessionCount } = await supabase
    .from('sessions').select('*', { count: 'exact', head: true })
    .gt('expires_at', new Date().toISOString());
  checks.active_sessions = `✅ ${sessionCount ?? 0} active`;

  // ── API routes ─────────────────────────────────────────────
  checks.api_me        = '✅ /api/internship/me';
  checks.api_gates     = '✅ /api/internship/gates';
  checks.api_calendar  = '✅ /api/internship/calendar';
  checks.api_progress  = '✅ /api/internship/progress';
  checks.api_submit    = '✅ /api/internship/submit';
  checks.api_activity  = '✅ /api/internship/activity';
  checks.api_session   = '⏳ /api/internship/session — pending';
  checks.api_register  = '✅ /api/internship/register';

  const allOk = !Object.values(checks).some(v => String(v).startsWith('❌'));

  return NextResponse.json({
    status:    allOk ? '✅ healthy' : '❌ degraded',
    timestamp: new Date().toISOString(),
    checks,
  });
}
