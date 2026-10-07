// ============================================================
// app/api/cron/nudge/route.ts
// GET — Daily nudge cron for internship challengers
//
// Schedule: daily at 10:00 UTC (vercel.json)
// Secured:  CRON_SECRET header check
//
// Logic:
//   1. Read today's email send count from email_sends
//   2. Calculate remaining daily budget
//   3. GET /api/herald → internship nudge tiers
//   4. Send nudges in priority order until budget exhausted
//   5. Light tier — in-app notification only, no email
//   6. Log summary to Discord
//
// Budget: reads EMAIL_LIMITS from emailGate — never hardcoded.
//   Upgrade Resend plan → update EMAIL_LIMITS → done.
//
// Priority: hard_d1 → hard_d2 → week2_unlock → soft
//   light:  in-app notification only, no email
//
// v1.1 (Oct 2026):
//   — Fixed structural bug: Discord summary + return were
//     inside the for loop — cron exited after first iteration
//     sending 0 emails every run
//   — Light tier in-app loop moved outside email send loop
//   — sent/skipped counters now accumulate correctly
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient }              from '@supabase/supabase-js';
import { notifyDiscord, DC }         from '../../../lib/discord';
import { EMAIL_LIMITS }              from '../../../lib/emailGate';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BASE_URL    = process.env.NEXT_PUBLIC_APP_URL || 'https://antcpu-ads.vercel.app';
const CRON_SECRET = process.env.CRON_SECRET || '';

export async function GET(req: NextRequest) {

  // ── Auth ───────────────────────────────────────────────────
  const authHeader = req.headers.get('authorization');
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startedAt = new Date().toISOString();
  const today     = new Date().toISOString().slice(0, 10);

  try {

    // ── Step 1: How many emails sent today already ─────────────
    const { count: sentToday } = await supabase
      .from('email_sends')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'sent')
      .gte('created_at', `${today}T00:00:00.000Z`);

    const alreadySent  = sentToday  || 0;
    const dailyBudget  = EMAIL_LIMITS.DAILY_TRANSACTIONAL;
    const remaining    = Math.max(0, dailyBudget - alreadySent);

    if (remaining === 0) {
      await notifyDiscord('', 'internship', {
        title:  '📧 Nudge Cron — Budget Exhausted',
        color:  DC.grey,
        fields: [
          { name: 'Sent Today', value: `${alreadySent}`, inline: true },
          { name: 'Budget',     value: `${dailyBudget}`, inline: true },
          { name: 'Remaining',  value: '0',              inline: true },
        ],
        footer:    'cron/nudge · skipped',
        timestamp: true,
      }).catch(() => {});

      return NextResponse.json({
        ok:         true,
        sent:       0,
        skipped:    0,
        reason:     'daily_budget_exhausted',
        budget:     dailyBudget,
        sent_today: alreadySent,
      });
    }

    // ── Step 2: Get nudge lists from herald ────────────────────
    const heraldRes = await fetch(`${BASE_URL}/api/herald`, {
      headers: { 'Content-Type': 'application/json' },
    });

    if (!heraldRes.ok) {
      throw new Error(`Herald fetch failed: ${heraldRes.status}`);
    }

    const heraldData  = await heraldRes.json();
    const internship  = heraldData.internship;

    if (!internship) {
      return NextResponse.json({ ok: true, sent: 0, reason: 'no_internship_data' });
    }

    // ── Step 3: Build send queue — priority order ──────────────
    type QueueItem = {
      email:        string;
      nudge_type:   string;
      first_name:   string;
      track:        string;
      progress_pct: number;
    };

    const queue: QueueItem[] = [
      // Priority 1 — registered, never came back
      ...(internship.hard_d1 || []).map((c: any) => ({
        email:        c.email,
        nudge_type:   'hard_d1',
        first_name:   c.first_name   || 'there',
        track:        c.track        || 'dev',
        progress_pct: c.progress_pct || 5,
      })),
      // Priority 2 — profile done, hasn't touched Arena
      ...(internship.hard_d2 || []).map((c: any) => ({
        email:        c.email,
        nudge_type:   'hard_d2',
        first_name:   c.first_name   || 'there',
        track:        c.track        || 'dev',
        progress_pct: c.progress_pct || 10,
      })),
      // Priority 3 — Week 1 done, Week 2 not started
      ...(internship.week2_unlock || []).map((c: any) => ({
        email:        c.email,
        nudge_type:   'week2_unlock',
        first_name:   c.first_name   || 'there',
        track:        c.track        || 'dev',
        progress_pct: c.progress_pct || 25,
      })),
      // Priority 4 — stalled before Week 1 complete
      ...(internship.soft || []).map((c: any) => ({
        email:        c.email,
        nudge_type:   'soft',
        first_name:   c.first_name   || 'there',
        track:        c.track        || 'dev',
        progress_pct: c.progress_pct || 15,
      })),
    ];

    // ── Step 4: Send up to remaining budget ────────────────────
    const batch  = queue.slice(0, remaining);
    let sent     = 0;
    let skipped  = 0;
    const errors: string[] = [];

    // ← v1.1 FIX: loop runs to completion before Discord summary
    for (const item of batch) {
      try {
        const res = await fetch(`${BASE_URL}/api/internship/nudge`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email:        item.email,
            nudge_type:   item.nudge_type,
            first_name:   item.first_name,
            track:        item.track,
            progress_pct: item.progress_pct,
          }),
        });

        const data = await res.json();

        if (data.sent === true) {
          sent++;
        } else {
          skipped++;
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'unknown';
        errors.push(`${item.email}: ${msg}`);
        skipped++;
      }
    }

    // ── Step 5: Light tier — in-app only, no email ─────────────
    // ← v1.1 FIX: moved outside email loop — runs after all emails
    const lightTier  = internship.light || [];
    let inAppSent    = 0;

    for (const c of lightTier) {
      try {
        await supabase.from('notifications').insert({
          email:   c.email,
          type:    'nudge',
          title:   '⚡ Your next task is waiting',
          message: `You're at ${c.progress_pct || 0}%. ` +
            `All Week 1 tasks are open — ` +
            (c.track === 'marketing'
              ? 'go to your Marketing Workspace.'
              : 'go to your Dev Workspace.'),
          link:  c.track === 'marketing'
            ? '/marketing/'
            : '/dev/',
          read:  false,
        });
        inAppSent++;
      } catch { /* silent — non-critical */ }
    }

    // ── Step 6: Discord summary ────────────────────────────────
    // ← v1.1 FIX: moved outside both loops — fires once at end
    const remaining_after = Math.max(0, remaining - sent);

    await notifyDiscord('', 'internship', {
      title:  `📧 Nudge Cron — ${sent} sent`,
      color:  sent > 0 ? DC.green : DC.grey,
      fields: [
        { name: 'Sent',        value: `${sent}`,                       inline: true },
        { name: 'Skipped',     value: `${skipped}`,                    inline: true },
        { name: 'In-App',      value: `${inAppSent}`,                  inline: true },
        { name: 'Budget Used', value: `${alreadySent + sent}/${dailyBudget}`, inline: true },
        { name: 'Remaining',   value: `${remaining_after}`,            inline: true },
        { name: 'Queue Size',  value: `${queue.length}`,               inline: true },
        ...(errors.length > 0 ? [{
          name:   'Errors',
          value:  `${errors.length} failed`,
          inline: false,
        }] : []),
      ],
      footer:    `cron/nudge · ${today}`,
      timestamp: true,
    }).catch(() => {});

    // ── Step 7: Return ─────────────────────────────────────────
    // ← v1.1 FIX: single return at end of function
    return NextResponse.json({
      ok:               true,
      sent,
      skipped,
      in_app_sent:      inAppSent,
      queue_size:       queue.length,
      budget:           dailyBudget,
      sent_today_total: alreadySent + sent,
      remaining_after,
      errors:           errors.length > 0 ? errors : undefined,
    });

  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    console.error('[cron/nudge] error:', message);

    await notifyDiscord('', 'internship', {
      title:  '🔴 Nudge Cron — Error',
      color:  DC.red,
      fields: [{ name: 'Error', value: message, inline: false }],
      footer:    `cron/nudge · ${startedAt}`,
      timestamp: true,
    }).catch(() => {});

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
