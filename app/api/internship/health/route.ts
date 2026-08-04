// app/api/internship/health/route.ts

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BASE = 'https://antcpu-ads.vercel.app/api/internship';

async function pingRoute(path: string): Promise<string> {
  try {
    const r = await fetch(`${BASE}${path}`, { method: 'GET' });
    return r.ok ? `✅ ${path}` : `❌ ${path} — ${r.status}`;
  } catch {
    return `❌ ${path} — unreachable`;
  }
}

export async function GET() {
  const checks: Record<string, any> = {};

  // ── DB tables ──────────────────────────────────────────────
  const tables = ['challengers','gates','submissions','activity_log','sessions','moods'];
  for (const t of tables) {
    const { count, error } = await supabase
      .from(t).select('*', { count: 'exact', head: true });
    checks[t] = error ? `❌ ${error.message}` : `✅ ${count} rows`;
  }

  // ── Gates unlocked ─────────────────────────────────────────
  const { data: unlockedGates } = await supabase
    .from('gates').select('id').eq('locked', false);
  checks.gates_unlocked = `✅ ${unlockedGates?.length ?? 0} unlocked`;

  // ── Latest challenger ──────────────────────────────────────
  const { data: latest } = await supabase
    .from('challengers')
    .select('intern_id, first_name, track, progress_pct, flag, last_seen')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  checks.latest_challenger = latest
    ? `✅ ${latest.first_name} · ${latest.track} · ${latest.progress_pct}% · ${latest.flag}`
    : '⚠️ none';

  // ── Active sessions ────────────────────────────────────────
  const { count: sessionCount } = await supabase
    .from('sessions').select('*', { count: 'exact', head: true })
    .gt('expires_at', new Date().toISOString());
  checks.active_sessions = `✅ ${sessionCount ?? 0} active`;

  // ── Mood flags summary ─────────────────────────────────────
  const { data: flagData } = await supabase
    .from('challengers')
    .select('flag')
    .eq('status', 'active');

  const MOOD_EMOJI: Record<string, string> = {
    shining: '🌟', none: '😊', nudge: '😐',
    'at-risk': '😟', stalled: '😴'
  };

  const flagCounts: Record<string, number> = {
    shining: 0, none: 0, nudge: 0, 'at-risk': 0, stalled: 0
  };
  flagData?.forEach(c => {
    const f = c.flag || 'none';
    if (f in flagCounts) flagCounts[f]++;
  });

  checks.moods = Object.entries(flagCounts)
    .map(([f, n]) => `${MOOD_EMOJI[f]} ${n}`)
    .join('  ');

  // ── Live API pings — parallel ──────────────────────────────
  const [me, gates, calendar, progress, submit,
         activity, register, moods, flags] = await Promise.all([
    pingRoute('/me?email=cicconechase40@gmail.com'),
    pingRoute('/gates'),
    pingRoute('/calendar'),
    pingRoute('/progress?intern_id=intern-6a6af201'),
    pingRoute('/submit'),
    pingRoute('/activity?intern_id=intern-6a6af201'),
    pingRoute('/register'),
    pingRoute('/moods'),
    pingRoute('/flags'),
  ]);

  checks.api_me       = me;
  checks.api_gates    = gates;
  checks.api_calendar = calendar;
  checks.api_progress = progress;
  checks.api_submit   = submit;
  checks.api_activity = activity;
  checks.api_register = register;
  checks.api_moods    = moods;
  checks.api_flags    = flags;
  checks.api_session  = '⏳ /api/internship/session — pending';

  const allOk = !Object.values(checks)
    .some(v => String(v).startsWith('❌'));

  return NextResponse.json({
    status:    allOk ? '✅ healthy' : '❌ degraded',
    timestamp: new Date().toISOString(),
    checks,
  });
}
