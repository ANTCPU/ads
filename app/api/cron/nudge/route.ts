// ============================================================
// app/api/cron/nudge/route.ts
// GET — Signal-driven nudge engine
// Called by Vercel cron every 2h
// Works for monthly AND weekly cohorts — no hardcoded dates
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient }              from '@supabase/supabase-js';
import {
  buildNudgeEmail, buildContext,
  hasRecentNudge, logNudge,
  type NudgeType,
} from '../../internship/nudge/route';
import { heraldSend }        from '../../../lib/herald';
import { notifyDiscord, DC } from '../../../lib/discord';
import {
  checkEmailValidity,
  recordEmailSent,
  logEmailSend,
} from '../../../lib/emailGate';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const CORS = {
  'Access-Control-Allow-Origin':  'https://antcpu-ads.vercel.app',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control':                'no-store',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS });
}

// ── Signal evaluator ──────────────────────────────────────────
// Pure logic — no hardcoded dates or months
// Returns first matching signal or null
function evaluateSignals(c: any, clock: any): {
  signal: string; nudgeType: NudgeType; cooldownHours: number;
} | null {
  const progress = c.progress_pct ?? 0;
  const hrsSince = Math.round(
    (Date.now() - new Date(c.last_seen).getTime()) / 3600000
  );
  const daysLeft = clock?.days_left_total ?? 0;
  const week     = clock?.week ?? 1;

  // Complete
  if (progress >= 100)
    return { signal: 'complete', nudgeType: 'complete_badge', cooldownHours: 9999 };

  // Closing soon — last 3 days
  if (daysLeft <= 3 && progress < 100 && hrsSince > 24)
    return { signal: 'closing_soon', nudgeType: 'final_push', cooldownHours: 72 };

  // Week 4 going dark
  if (week >= 4 && hrsSince > 48 && progress < 100)
    return { signal: 'week4_dark', nudgeType: 'week4_push', cooldownHours: 48 };

  // Week 3 stalled
  if (week === 3 && progress >= 50 && hrsSince > 48)
    return { signal: 'week3_stalled', nudgeType: 'week3_push', cooldownHours: 48 };

  // Week 3 just unlocked
  if (week === 3 && progress >= 50 && hrsSince < 24)
    return { signal: 'week3_unlock', nudgeType: 'week3_unlock', cooldownHours: 9999 };

  // Week 2 stalled mid-progress
  if (week === 2 && progress >= 25 && progress < 50 && hrsSince > 48)
    return { signal: 'week2_stalled', nudgeType: 'week2_push', cooldownHours: 48 };

  // Week 2 just unlocked
  if (week >= 2 && progress >= 25 && progress < 30)
    return { signal: 'week2_unlock', nudgeType: 'week2_unlock', cooldownHours: 9999 };

  // Week 3 approaching — finish week 2
  if (week === 2 && daysLeft <= 4 && progress < 50)
    return { signal: 'week3_approaching', nudgeType: 'week3_unlock', cooldownHours: 72 };

  // Soft — stalled before week 1 complete
  if (progress > 10 && progress < 25 && hrsSince > 72)
    return { signal: 'stalled_pre_w1', nudgeType: 'soft', cooldownHours: 72 };

  // Hard d2 — profile done, hasn't touched arena
  if (progress === 10 && hrsSince > 48)
    return { signal: 'stuck_d2', nudgeType: 'hard_d2', cooldownHours: 9999 };

  // Hard d1 — registered, never returned
  if (progress <= 5 && hrsSince > 48)
    return { signal: 'stuck_d1', nudgeType: 'hard_d1', cooldownHours: 9999 };

  // Week 1 mentor intro — early days, active
  if (progress > 0 && progress < 25 && hrsSince < 72 && week === 1)
    return { signal: 'week1_mentor_intro', nudgeType: 'week1_mentor', cooldownHours: 9999 };

  return null;
}

// ── Engine ────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: CORS });

  const t0 = Date.now();

  // Clock
  const clock = await fetch('https://antcpu-ads.vercel.app/api/clock', { cache: 'no-store' })
    .then(r => r.json()).catch(() => null);
  const cohort = clock?.cohort ?? 'november-2026';

  // Active challengers for current cohort — exclude mentors
  const { data: challengers, error } = await supabase
    .from('challengers')
    .select(`
      id, intern_id, email, handle, first_name, track,
      progress_pct, last_seen, cohort, elevation_note,
      next_gate_id, next_gate_label, next_gate_pct
    `)
    .eq('status', 'active')
    .eq('cohort', cohort)
    .not('role_title', 'ilike', '%mentor%')
    .not('profile_type', 'eq', 'team')
    .not('profile_type', 'eq', 'founder');

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500, headers: CORS });

  type Result = {
    handle: string; signal: string; nudgeType: string;
    sent: boolean; reason?: string;
  };
  const results: Result[] = [];

  for (const c of challengers ?? []) {
    const evaluation = evaluateSignals(c, clock);

    if (!evaluation) {
      results.push({ handle: c.handle, signal: 'none', nudgeType: 'none', sent: false, reason: 'no_signal' });
      continue;
    }

    const { signal, nudgeType, cooldownHours } = evaluation;

    // Cooldown check
    const blocked = await hasRecentNudge(c.intern_id, signal, cooldownHours);
    if (blocked) {
      results.push({ handle: c.handle, signal, nudgeType, sent: false, reason: 'cooldown' });
      continue;
    }

    // Email validity
    const validity = await checkEmailValidity(supabase, c.email).catch(() => null);
    if (validity === 'bounced' || validity === 'unsubscribed') {
      results.push({ handle: c.handle, signal, nudgeType, sent: false, reason: validity ?? 'invalid' });
      continue;
    }

    // Build + send
    const ctx = buildContext(c, clock, signal);
    const { subject, html } = buildNudgeEmail({
      firstName:     ctx.firstName,
      track:         ctx.track,
      nudgeType:     nudgeType as NudgeType,
      progressPct:   ctx.progress,
      internId:      c.intern_id ?? undefined,
      handle:        c.handle    ?? undefined,
      elevationNote: ctx.elevationNote,
    });

    try {
      await heraldSend({ to: c.email, subject, html });

      await Promise.all([
        recordEmailSent(supabase, c.email),
        logEmailSend(supabase, c.email, `nudge_${nudgeType}`, {
          segment: 'internship', subject, locale: 'en', status: 'sent',
        }),
        logNudge(c.intern_id, cohort, signal, nudgeType, {
          progress: c.progress_pct, track: c.track, handle: c.handle,
        }),
        supabase.from('activity_log').insert({
          challenger_id: c.id, type: 'nudge', event: 'nudge_sent',
          label: `Nudge sent: ${nudgeType}`, icon: '📧',
          gate_id: null, points: 0,
        }),
      ]);

      results.push({ handle: c.handle, signal, nudgeType, sent: true });

    } catch {
      results.push({ handle: c.handle, signal, nudgeType, sent: false, reason: 'send_error' });
    }
  }

  const sent    = results.filter(r => r.sent).length;
  const skipped = results.filter(r => !r.sent).length;

  notifyDiscord('', 'internship', {
    title:  `🤖 Nudge Engine — ${sent} sent · ${skipped} skipped`,
    color:  DC.intern,
    fields: [
      { name: 'Cohort',    value: cohort,                        inline: true },
      { name: 'Evaluated', value: `${challengers?.length ?? 0}`, inline: true },
      { name: 'Sent',      value: `${sent}`,                     inline: true },
      { name: 'Skipped',   value: `${skipped}`,                  inline: true },
      { name: 'Runtime',   value: `${Date.now() - t0}ms`,        inline: true },
    ],
    footer: `nudge engine v2 · ${cohort}`, timestamp: true,
  }).catch(() => {});

  return NextResponse.json({
    ok: true, cohort,
    evaluated: challengers?.length ?? 0,
    sent, skipped,
    runtime_ms: Date.now() - t0,
    results,
  }, { headers: CORS });
}
