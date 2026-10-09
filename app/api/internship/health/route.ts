// ============================================================
// app/api/internship/health/route.ts
// Central Nervous System — antcpu internship platform
//
// v3 (Oct 2026):
// — office_messages counts added (total + 24h)
// — sessions_active_1h added
// — badges_total added
// — session/office/messages route pings added
// — session: '⏳ pending' replaced with live ping
// — actions: office + session wire checks added
// — db block renamed to db_counts for clarity
// — presence block added to response
// ============================================================

import { createClient } from '@supabase/supabase-js';
import { NextResponse }  from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BASE  = 'https://antcpu-ads.vercel.app/api/internship';
const CLOCK = 'https://antcpu-ads.vercel.app/api/clock';

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'no-store, no-cache, must-revalidate',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS });
}

// ── Route ping ────────────────────────────────────────────────

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

// ── Mood map ──────────────────────────────────────────────────

const MOOD: Record<string, string> = {
  shining:   '🌟',
  none:      '😊',
  nudge:     '😐',
  'at-risk': '😟',
  stalled:   '😴',
};

export async function GET() {
  const t0 = Date.now();

  // ── 1. Clock — source of truth ────────────────────────────
  const clockRes = await fetch(CLOCK, { cache: 'no-store' });
  const clock    = await clockRes.json();

  // ── 2. DB counts — parallel ───────────────────────────────
  const [
    { count: cCount          },
    { count: gCount          },
    { count: seCount         },
    { count: aCount          },
    { count: sCount          },
    { count: mCount          },
    { count: subCount        },
    { count: officeCount     },
    { count: officeCount24h  },
    { count: sessionsActive1h},
    { count: badgesTotal     },
    { count: dmCount         },
  ] = await Promise.all([
    supabase.from('challengers')   .select('*', { count: 'exact', head: true }),
    supabase.from('gates')         .select('*', { count: 'exact', head: true }),
    supabase.from('sessions')      .select('*', { count: 'exact', head: true }),
    supabase.from('activity_log')  .select('*', { count: 'exact', head: true }),
    supabase.from('submissions')   .select('*', { count: 'exact', head: true }),
    supabase.from('moods')         .select('*', { count: 'exact', head: true }),
    supabase.from('submissions')   .select('*', { count: 'exact', head: true })
      .eq('status', 'reviewed'),
    supabase.from('office_messages').select('*', { count: 'exact', head: true }),
    supabase.from('office_messages').select('*', { count: 'exact', head: true })
      .gt('created_at', new Date(Date.now() - 86400000).toISOString()),
    supabase.from('sessions')      .select('*', { count: 'exact', head: true })
      .gt('last_seen', new Date(Date.now() - 3600000).toISOString()),
    supabase.from('user_badges')   .select('*', { count: 'exact', head: true }),
    supabase.from('direct_messages').select('*', { count: 'exact', head: true }),
  ]);

  // ── 3. Challengers detail ─────────────────────────────────
  const { data: challengers } = await supabase
    .from('challengers')
    .select(`
      intern_id, challenger_num, handle,
      first_name, track, progress_pct,
      flag, last_seen, completed_gates,
      cohort, cohort_short,
      ai_exp, background, timezone, why_here,
      is_early_adopter, created_at
    `)
    .eq('status', 'active')
    .order('progress_pct', { ascending: false });

  // ── 4. Gates state ────────────────────────────────────────
  const { data: gates } = await supabase
    .from('gates')
    .select('id, day, week, label, pct, locked')
    .order('day');

  const unlockedGates = gates?.filter(g => !g.locked) ?? [];
  const lockedGates   = gates?.filter(g =>  g.locked) ?? [];
  const todayGate     = gates?.find(g => g.day === clock.day) ?? null;

  // ── 5. Mood summary ───────────────────────────────────────
  const moodCounts: Record<string, number> = {
    shining: 0, none: 0, nudge: 0, 'at-risk': 0, stalled: 0,
  };

  challengers?.forEach(c => {
    const f = c.flag || 'none';
    if (f in moodCounts) moodCounts[f]++;
  });

  const moodSummary = Object.entries(moodCounts)
    .map(([f, n]) => ({ flag: f, emoji: MOOD[f], count: n }));

  // ── 6. AI context ─────────────────────────────────────────
  const needsAttention = challengers
    ?.filter(c => c.flag === 'at-risk' || c.flag === 'stalled')
    .map(c => ({
      intern_id:      c.intern_id,
      challenger_num: c.challenger_num,
      handle:         c.handle,
      first_name:     c.first_name,
      track:          c.track,
      mood:           MOOD[c.flag] ?? '😊',
      flag:           c.flag,
      progress:       c.progress_pct,
      hrs_since:      Math.round(
        (Date.now() - new Date(c.last_seen).getTime()) / 3600000
      ),
      gates_done:     c.completed_gates?.length ?? 0,
      day_joined:     new Date(c.created_at).getDate(),
      ai_exp:         c.ai_exp,
      why_here:       c.why_here,
    })) ?? [];

  const shining = challengers?.filter(c => c.flag === 'shining') ?? [];

  // ── 7. Cohort profile ─────────────────────────────────────
  const tracks: Record<string, number> = { dev: 0, marketing: 0 };
  const aiExp:  Record<string, number> = {};

  challengers?.forEach(c => {
    if (c.track === 'dev') tracks.dev++;
    else tracks.marketing++;
    if (c.ai_exp) aiExp[c.ai_exp] = (aiExp[c.ai_exp] || 0) + 1;
  });

  const avgProgress = challengers?.length
    ? Math.round(
        challengers.reduce((s, c) => s + c.progress_pct, 0) / challengers.length
      )
    : 0;

  // ── 8. Route pings — parallel ─────────────────────────────
  const [
    rMe, rGates, rCalendar, rActivity,
    rMoods, rFlags, rProgress, rSubmit,
    rRegister, rSession, rOffice, rMessages,
  ] = await Promise.all([
    ping('/me?handle=Lawi10'),
    ping('/gates'),
    ping('/calendar'),
    ping('/activity?intern_id=intern-antcpu-001'),
    ping('/moods'),
    ping('/flags'),
    ping('/progress',  'POST'),
    ping('/submit',    'POST'),
    ping('/register',  'POST'),
    ping('/session',   'POST'),
    ping('/office?cohort=october-2026&room=general'),
    ping('/messages?intern_id=intern-antcpu-001'),
  ]);

  // ── 9. Recommended actions ────────────────────────────────
  const actions: string[] = [];

  if (needsAttention.length > 0)
    actions.push(
      `Send re-engagement to ${needsAttention.map(c => c.handle ?? c.first_name).join(', ')}`
    );

  if (clock.day > 4 && avgProgress < 15)
    actions.push('Cohort average progress low — consider community post');

  if (clock.days_left_week <= 2)
    actions.push(`Week ${clock.week} closes in ${clock.days_left_week} days — send deadline reminder`);

  if (clock.day === 8)
    actions.push('Week 2 starts today — run: UPDATE gates SET locked=false WHERE week=2');

  if (lockedGates.length === 0)
    actions.push('All gates unlocked — verify this is intentional');

  if (clock.next_cohort?.signups > 0)
    actions.push(
      `${clock.next_cohort.signups} signed up for ${clock.next_cohort.cohort} — ${clock.next_cohort.opens_in_days} days until open`
    );

  if ((officeCount24h ?? 0) <= 4)
    actions.push('Virtual office has no challenger posts today — seed a standup prompt');

  if ((sessionsActive1h ?? 0) === 0)
    actions.push('No active sessions in last hour — session ping not yet wired on antcpu.io');

  // ── 10. Assemble response ─────────────────────────────────
  const routeValues = [
    rMe, rGates, rCalendar, rActivity,
    rMoods, rFlags, rProgress, rSubmit,
    rRegister, rSession, rOffice, rMessages,
  ];

  const allOk = !routeValues.some(v => v.startsWith('❌'));

  return NextResponse.json({

    // ── System status ─────────────────────────────────────
    status:      allOk ? '✅ healthy' : '⚠️ degraded',
    timestamp:   new Date().toISOString(),
    response_ms: Date.now() - t0,

    // ── Calendar — from clock ─────────────────────────────
    calendar: {
      day:             clock.day,
      week:            clock.week,
      week_name:       clock.week_name,
      phase:           clock.phase,
      cohort:          clock.cohort,
      days_left_week:  clock.days_left_week,
      days_left_total: clock.days_left_total,
      today_gate:      todayGate,
      is_active:       clock.is_active,
      entry_open:      clock.entry_open,
    },

    // ── Next cohort ───────────────────────────────────────
    next_cohort: clock.next_cohort ?? null,

    // ── DB counts ─────────────────────────────────────────
    db_counts: {
      challengers:         cCount,
      gates_total:         gCount,
      gates_unlocked:      unlockedGates.length,
      gates_locked:        lockedGates.length,
      sessions:            seCount,
      activity_log:        aCount,
      submissions:         sCount,
      reviewed:            subCount,
      moods:               mCount,
      office_messages:     officeCount,
      office_24h:          officeCount24h,
      sessions_active_1h:  sessionsActive1h,
      badges_total:        badgesTotal,
      direct_messages:     dmCount,
    },

    // ── Presence ──────────────────────────────────────────
    presence: {
      sessions_active_1h:  sessionsActive1h ?? 0,
      office_posts_today:  officeCount24h   ?? 0,
      office_total:        officeCount      ?? 0,
      dms_total:           dmCount          ?? 0,
      virtual_office_live: (officeCount     ?? 0) > 0,
    },

    // ── Cohort overview ───────────────────────────────────
    cohort: {
      total:         challengers?.length ?? 0,
      avg_progress:  avgProgress,
      tracks,
      ai_experience: aiExp,
      mood_summary:  moodSummary,
    },

    // ── Challengers — full detail ─────────────────────────
    challengers: challengers?.map(c => ({
      intern_id:      c.intern_id,
      challenger_num: c.challenger_num,
      handle:         c.handle,
      first_name:     c.first_name,
      track:          c.track,
      progress:       c.progress_pct,
      mood:           MOOD[c.flag] ?? '😊',
      flag:           c.flag,
      gates_done:     c.completed_gates?.length ?? 0,
      hrs_since:      Math.round(
        (Date.now() - new Date(c.last_seen).getTime()) / 3600000
      ),
      cohort:         c.cohort,
      cohort_short:   c.cohort_short,
      early:          c.is_early_adopter,
    })),

    // ── AI context ────────────────────────────────────────
    ai: {
      needs_attention:     needsAttention,
      shining:             shining.map(c => c.handle ?? c.first_name),
      recommended_actions: actions,
      context: [
        `Challenge: Day ${clock.day} of ${clock.total_days} · Week ${clock.week} · ${clock.week_name}`,
        `Cohort: ${challengers?.length ?? 0} active challengers`,
        `Avg progress: ${avgProgress}%`,
        `Mood: ${Object.entries(moodCounts).map(([f, n]) => `${MOOD[f]}${n}`).join(' ')}`,
        `Today's gate: ${todayGate?.label ?? 'none'} (+${todayGate?.pct ?? 0}%)`,
        `Week closes: ${clock.days_left_week} days`,
        `Office: ${officeCount ?? 0} messages · ${officeCount24h ?? 0} today`,
        `Sessions active 1h: ${sessionsActive1h ?? 0}`,
        `Badges total: ${badgesTotal ?? 0}`,
        clock.next_cohort
          ? `Next cohort: ${clock.next_cohort.cohort} · ${clock.next_cohort.opens_in_days}d · ${clock.next_cohort.signups} signed up`
          : 'Next cohort: not configured',
      ],
    },

    // ── Gates ─────────────────────────────────────────────
    gates: {
      unlocked: unlockedGates.map(g => ({ id: g.id, day: g.day, label: g.label, pct: g.pct })),
      locked:   lockedGates.map(g =>   ({ id: g.id, day: g.day, week: g.week })),
    },

    // ── API routes ────────────────────────────────────────
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
      session:  rSession,
      office:   rOffice,
      messages: rMessages,
    },

  }, { headers: CORS });
}
