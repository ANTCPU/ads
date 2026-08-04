// app/api/internship/health/route.ts
// ============================================================
// Central Nervous System — antcpu internship platform
//
// Designed to be consumed by:
//   - Human admins (browser)
//   - AI agents (structured JSON)
//   - Cron jobs (status + actions)
//   - Future dashboard (live feed)
//
// Returns full system state in one hit — no DB access needed
// by any consumer. This is the single source of truth.
// ============================================================

import { createClient } from '@supabase/supabase-js';
import { NextResponse }  from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BASE = 'https://antcpu-ads.vercel.app/api/internship';

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS });
}

// ── Route ping — GET or POST ───────────────────────────────
async function ping(path: string, method = 'GET'): Promise<string> {
  try {
    const r = await fetch(`${BASE}${path}`, {
      method,
      headers: method === 'POST' ? { 'Content-Type': 'application/json' } : {},
      body:    method === 'POST' ? JSON.stringify({}) : undefined,
    });
    return (r.ok || r.status === 400 || r.status === 409)
      ? `✅ ${path}`
      : `❌ ${path} — ${r.status}`;
  } catch {
    return `❌ ${path} — unreachable`;
  }
}

export async function GET() {
  const t0 = Date.now();

  // ── 1. Calendar ────────────────────────────────────────────
  const calRes  = await fetch(`${BASE}/calendar`);
  const cal     = await calRes.json();

  // ── 2. DB counts — parallel ────────────────────────────────
  const [
    { count: cCount },
    { count: gCount },
    { count: sCount },
    { count: aCount },
    { count: seCount },
    { count: mCount },
    { count: subCount },
  ] = await Promise.all([
    supabase.from('challengers') .select('*', { count:'exact', head:true }),
    supabase.from('gates')       .select('*', { count:'exact', head:true }),
    supabase.from('sessions')    .select('*', { count:'exact', head:true }),
    supabase.from('activity_log').select('*', { count:'exact', head:true }),
    supabase.from('submissions') .select('*', { count:'exact', head:true }),
    supabase.from('moods')       .select('*', { count:'exact', head:true }),
    supabase.from('submissions') .select('*', { count:'exact', head:true })
      .eq('status', 'reviewed'),
  ]);

  // ── 3. Challengers detail ──────────────────────────────────
  const { data: challengers } = await supabase
    .from('challengers')
    .select(`
      intern_id, first_name, track, progress_pct,
      flag, last_seen, completed_gates, cohort,
      ai_exp, background, timezone, why_here,
      is_early_adopter, created_at
    `)
    .eq('status', 'active')
    .order('progress_pct', { ascending: false });

  // ── 4. Gates state ─────────────────────────────────────────
  const { data: gates } = await supabase
    .from('gates')
    .select('id, day, week, label, pct, locked')
    .order('day');

  const unlockedGates  = gates?.filter(g => !g.locked) ?? [];
  const lockedGates    = gates?.filter(g => g.locked)  ?? [];
  const todayGate      = gates?.find(g => g.day === cal.day) ?? null;

  // ── 5. Mood summary ────────────────────────────────────────
  const MOOD: Record<string, string> = {
    shining: '🌟', none: '😊', nudge: '😐',
    'at-risk': '😟', stalled: '😴'
  };

  const moodCounts: Record<string, number> = {
    shining: 0, none: 0, nudge: 0, 'at-risk': 0, stalled: 0
  };
  challengers?.forEach(c => {
    const f = c.flag || 'none';
    if (f in moodCounts) moodCounts[f]++;
  });

  const moodSummary = Object.entries(moodCounts)
    .map(([f, n]) => ({ flag: f, emoji: MOOD[f], count: n }));

  // ── 6. AI context — who needs attention ───────────────────
  const needsAttention = challengers?.filter(
    c => c.flag === 'at-risk' || c.flag === 'stalled'
  ).map(c => ({
    intern_id:   c.intern_id,
    first_name:  c.first_name,
    track:       c.track,
    mood:        MOOD[c.flag] ?? '😊',
    flag:        c.flag,
    progress:    c.progress_pct,
    hrs_since:   Math.round(
      (Date.now() - new Date(c.last_seen).getTime()) / 3600000
    ),
    gates_done:  c.completed_gates?.length ?? 0,
    day_joined:  new Date(c.created_at).getDate(),
    ai_exp:      c.ai_exp,
    why_here:    c.why_here,
  })) ?? [];

  const shining = challengers?.filter(c => c.flag === 'shining') ?? [];

  // ── 7. Cohort AI profile ───────────────────────────────────
  const tracks = { dev: 0, marketing: 0 };
  const countries: Record<string, number> = {};
  const aiExp: Record<string, number> = {};

  challengers?.forEach(c => {
    if (c.track === 'dev') tracks.dev++;
    else tracks.marketing++;
    if (c.timezone) {
      countries[c.timezone] = (countries[c.timezone] || 0) + 1;
    }
    if (c.ai_exp) {
      aiExp[c.ai_exp] = (aiExp[c.ai_exp] || 0) + 1;
    }
  });

  const avgProgress = challengers?.length
    ? Math.round(
        challengers.reduce((s, c) => s + c.progress_pct, 0) / challengers.length
      )
    : 0;

  // ── 8. Live API pings — parallel ──────────────────────────
  const [
    rMe, rGates, rCalendar, rActivity,
    rMoods, rFlags, rProgress, rSubmit, rRegister
  ] = await Promise.all([
    ping('/me?email=cicconechase40@gmail.com'),
    ping('/gates'),
    ping('/calendar'),
    ping('/activity?intern_id=intern-6a6af201'),
    ping('/moods'),
    ping('/flags'),
    ping('/progress',  'POST'),
    ping('/submit',    'POST'),
    ping('/register',  'POST'),
  ]);

  // ── 9. Recommended actions for AI agent ───────────────────
  const actions: string[] = [];

  if (needsAttention.length > 0)
    actions.push(`Send re-engagement to ${needsAttention.map(c => c.first_name).join(', ')}`);

  if (cal.day > 4 && avgProgress < 15)
    actions.push('Cohort average progress low — consider community post');

  if (cal.days_left_in_week <= 2)
    actions.push(`Week 1 closes in ${cal.days_left_in_week} days — send deadline reminder`);

  if (cal.day === 8)
    actions.push('Week 2 starts today — run: UPDATE gates SET locked=false WHERE week=2');

  if (lockedGates.length === 0)
    actions.push('All gates unlocked — verify this is intentional');

  // ── 10. Assemble response ──────────────────────────────────
  const allOk = ![rMe,rGates,rCalendar,rActivity,rMoods,rFlags,rProgress,rSubmit,rRegister]
    .some(v => v.startsWith('❌'));

  return NextResponse.json({

    // ── System status ────────────────────────────────────────
    status:       allOk ? '✅ healthy' : '⚠️ degraded',
    timestamp:    new Date().toISOString(),
    response_ms:  Date.now() - t0,

    // ── Calendar context ─────────────────────────────────────
    calendar: {
      day:              cal.day,
      week:             cal.week,
      week_name:        cal.week_name,
      phase:            cal.phase,
      cohort:           cal.cohort,
      days_left_week:   cal.days_left_in_week,
      days_left_total:  cal.days_left_in_challenge,
      today_gate:       todayGate,
      is_active:        cal.is_active,
    },

    // ── DB state ─────────────────────────────────────────────
    db: {
      challengers:      cCount,
      gates_total:      gCount,
      gates_unlocked:   unlockedGates.length,
      gates_locked:     lockedGates.length,
      sessions:         seCount,
      activity_log:     aCount,
      submissions:      sCount,
      reviewed:         subCount,
      moods:            mCount,
    },

    // ── Cohort overview ───────────────────────────────────────
    cohort: {
      total:            challengers?.length ?? 0,
      avg_progress:     avgProgress,
      tracks,
      ai_experience:    aiExp,
      mood_summary:     moodSummary,
    },

    // ── Challengers — full detail ─────────────────────────────
    challengers: challengers?.map(c => ({
      intern_id:   c.intern_id,
      first_name:  c.first_name,
      track:       c.track,
      progress:    c.progress_pct,
      mood:        MOOD[c.flag] ?? '😊',
      flag:        c.flag,
      gates_done:  c.completed_gates?.length ?? 0,
      hrs_since:   Math.round(
        (Date.now() - new Date(c.last_seen).getTime()) / 3600000
      ),
      cohort:      c.cohort,
      early:       c.is_early_adopter,
    })),

    // ── AI context ────────────────────────────────────────────
    ai: {
      needs_attention:  needsAttention,
      shining:          shining.map(c => c.first_name),
      recommended_actions: actions,
      context: [
        `Challenge: Day ${cal.day} of 31 · Week ${cal.week} · ${cal.week_name}`,
        `Cohort: ${challengers?.length ?? 0} active challengers`,
        `Avg progress: ${avgProgress}%`,
        `Mood: ${Object.entries(moodCounts).map(([f,n]) => `${MOOD[f]}${n}`).join(' ')}`,
        `Today's gate: ${todayGate?.label ?? 'none'} (+${todayGate?.pct ?? 0}%)`,
        `Week closes: ${cal.days_left_in_week} days`,
      ],
    },

    // ── Gates ─────────────────────────────────────────────────
    gates: {
      unlocked: unlockedGates.map(g => ({ id:g.id, day:g.day, label:g.label, pct:g.pct })),
      locked:   lockedGates.map(g =>   ({ id:g.id, day:g.day, week:g.week })),
    },

    // ── API routes ────────────────────────────────────────────
    routes: {
      me:       rMe,
      gates:    rGates,
      calendar: rCalendar,
      activity: rActivity,
      moods:    rMoods,
      flags:    rFlags,
      progress: rProgress,
      submit:   rSubmit,
      register: rRegister,
      session:  '⏳ pending',
    },

  }, { headers: CORS });
}
