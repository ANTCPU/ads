// ============================================================
// app/api/cron/nudge/route.ts
// GET — Daily nudge cron for internship challengers
//
// Schedule: daily at 10:00 UTC (vercel.json)
// Secured:  CRON_SECRET header — Vercel injects automatically
//
// Architecture — thin orchestrator:
//   This route does NOT build emails or notification copy.
//   All email logic lives in /api/internship/nudge (545 lines).
//   This route: checks budget → gets tiers from herald →
//   decides channel per challenger → delegates → logs.
//
// Channel routing per challenger:
//   email_ok = true, open_count > 0 OR send_count < 3
//     → POST /api/internship/nudge  (full email + activity log)
//   email_ok = false OR (send_count >= 3 AND open_count = 0)
//     → INSERT app_notifications    (in-app bell only)
//   unsubscribed_at IS NOT NULL OR bounce_count >= 2
//     → skip entirely — fully opted out
//
// Priority order (email budget consumed top-down):
//   1. hard_d1      — registered, never returned (5%)
//   2. hard_d2      — profile done, never touched Arena (10%)
//   3. week2_unlock — Week 1 done, Week 2 just opened (25%+)
//   4. soft         — stalled 15–24%, >48hrs gone
//   5. light        — active <25%, seen <24hrs
//                     → app_notifications only, never email
//
// Dedup: challengers.nudge_sent_at
//   Skip if nudged within NUDGE_COOLDOWN_DAYS (7).
//   Seeded to now() before first deploy to protect budget.
//
// Budget: EMAIL_LIMITS.DAILY_TRANSACTIONAL (30 on free plan)
//   Upgrade Resend plan → update EMAIL_LIMITS → done.
//   Mid-queue budget exhaustion → remaining go to app_only.
//
// Admin visibility:
//   Every run seeds notifications table (Antony's bell).
//   Fatal errors also seed notifications + Discord.
//
// v2 (Oct 2026):
//   — Full rewrite — v1 never sent emails (broken loop bug)
//   — Delegates to /api/internship/nudge — no duplicate logic
//   — Channel routing via email_prefs (open_count, send_count)
//   — Dedup via challengers.nudge_sent_at not email_sends
//   — app_notifications for challengers, notifications for admin
//   — try/catch on all Supabase writes — no .catch() chaining
//   — CORS + OPTIONS + numbered steps + full file standard
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient }              from '@supabase/supabase-js';
import { notifyDiscord, DC }         from '../../../lib/discord';
import { EMAIL_LIMITS }              from '../../../lib/emailGate';

// ─── Clients ──────────────────────────────────────────────────
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ─── Constants ────────────────────────────────────────────────
const BASE_URL    = process.env.NEXT_PUBLIC_APP_URL || 'https://antcpu-ads.vercel.app';
const CRON_SECRET = process.env.CRON_SECRET         || '';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL         || 'antcpu@gmail.com';

// Minimum days between nudges per challenger
// Seeded to now() on first deploy — protects budget on day one
const NUDGE_COOLDOWN_DAYS = 7;

// After this many sends with zero opens → switch to app_only
// Inbox ignorer — email is wasted, use the bell instead
const APP_ONLY_THRESHOLD = 3;

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Cache-Control':                'no-store',
};

// ─── Types ────────────────────────────────────────────────────
type NudgeItem = {
  email:        string;
  intern_id:    string;
  handle:       string;
  first_name:   string;
  track:        string;
  progress_pct: number;
  nudge_type:   string;
  nudge_sent_at: string | null;
};

type EmailPref = {
  email_ok:        boolean;
  unsubscribed_at: string | null;
  bounce_count:    number;
  open_count:      number;
  send_count:      number;
} | null;

type Channel = 'email' | 'app_only' | 'skip';

// ─── Helpers ──────────────────────────────────────────────────
const ok  = (data: object)         => NextResponse.json(data,           { headers: CORS });
const err = (msg: string, s = 500) => NextResponse.json({ error: msg }, { status: s, headers: CORS });

// Resolve send channel from email_prefs behaviour data.
// No pref row = brand new user → default to email.
function resolveChannel(pref: EmailPref): Channel {
  if (!pref)                                                    return 'email';
  if (pref.unsubscribed_at)                                     return 'skip';
  if (!pref.email_ok && pref.bounce_count >= 2)                 return 'skip';
  if (!pref.email_ok)                                           return 'app_only';
  if (pref.send_count >= APP_ONLY_THRESHOLD && pref.open_count === 0)
                                                                return 'app_only';
  return 'email';
}

// Build a NudgeItem array from a herald tier
function buildItems(tier: any[], nudge_type: string): NudgeItem[] {
  return (tier || []).map((c: any) => ({
    email:         c.email,
    intern_id:     c.intern_id    || '',
    handle:        c.handle       || c.first_name || 'challenger',
    first_name:    c.first_name   || 'there',
    track:         c.track        || 'dev',
    progress_pct:  c.progress_pct || 0,
    nudge_type,
    nudge_sent_at: c.nudge_sent_at || null,
  }));
}

// ─── OPTIONS ──────────────────────────────────────────────────
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

// ─── GET ──────────────────────────────────────────────────────
export async function GET(req: NextRequest) {

  // ── 1. Auth — Vercel cron injects CRON_SECRET as Bearer ───
  const authHeader = req.headers.get('authorization');
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return err('Unauthorized', 401);
  }

  const startedAt = new Date().toISOString();
  const today     = new Date().toISOString().slice(0, 10);

  try {

    // ── 2. Check daily email budget ───────────────────────────
    // Count emails already sent today across ALL routes
    // (welcome, weekly, nudge — all share the same 30/day pool)
    const { count: sentToday } = await supabase
      .from('email_sends')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'sent')
      .gte('created_at', `${today}T00:00:00.000Z`);

    const alreadySent = sentToday  || 0;
    const dailyBudget = EMAIL_LIMITS.DAILY_TRANSACTIONAL;
    let   remaining   = Math.max(0, dailyBudget - alreadySent);

    if (remaining === 0) {
      await notifyDiscord('', 'internship', {
        title:  '📧 Nudge Cron — Budget Exhausted',
        color:  DC.grey,
        fields: [
          { name: 'Sent Today', value: `${alreadySent}`, inline: true },
          { name: 'Budget',     value: `${dailyBudget}`, inline: true },
          { name: 'Remaining',  value: '0',              inline: true },
        ],
        footer:    `cron/nudge · ${today}`,
        timestamp: true,
      });

      return ok({
        ok:         true,
        sent:       0,
        skipped:    0,
        reason:     'daily_budget_exhausted',
        budget:     dailyBudget,
        sent_today: alreadySent,
      });
    }

    // ── 3. Fetch nudge tiers from herald ──────────────────────
    // Herald computes tiers from challengers table in real time
    const heraldRes = await fetch(`${BASE_URL}/api/herald`, {
      headers: { 'Content-Type': 'application/json' },
      cache:   'no-store',
    });

    if (!heraldRes.ok) {
      throw new Error(`Herald fetch failed: ${heraldRes.status}`);
    }

    const { internship } = await heraldRes.json();

    if (!internship) {
      return ok({ ok: true, sent: 0, reason: 'no_internship_data' });
    }

    // ── 4. Build priority queue — email tiers only ────────────
    // light tier is handled separately — always app_only
    const cooldownCutoff = new Date(
      Date.now() - NUDGE_COOLDOWN_DAYS * 86_400_000
    ).toISOString();

    const queue: NudgeItem[] = [
      ...buildItems(internship.hard_d1,      'hard_d1'),      // P1
      ...buildItems(internship.hard_d2,      'hard_d2'),      // P2
      ...buildItems(internship.week2_unlock, 'week2_unlock'), // P3
      ...buildItems(internship.soft,         'soft'),         // P4
    ];

    // ── 5. Process queue ──────────────────────────────────────
    let emailSent = 0;
    let appSent   = 0;
    let skipped   = 0;
    const errors: string[] = [];

    for (const item of queue) {

      // ── 5a. Dedup — skip if nudged within cooldown ─────────
      if (item.nudge_sent_at && item.nudge_sent_at > cooldownCutoff) {
        skipped++;
        continue;
      }

      // ── 5b. Read email_prefs — resolve channel ─────────────
      const { data: pref } = await supabase
        .from('email_prefs')
        .select('email_ok, unsubscribed_at, bounce_count, open_count, send_count')
        .eq('email', item.email)
        .maybeSingle();

      const channel = resolveChannel(pref as EmailPref);

      // ── 5c. Skip — fully opted out ─────────────────────────
      if (channel === 'skip') {
        skipped++;
        continue;
      }

      // ── 5d. App only — inbox ignorer or email blocked ──────
      if (channel === 'app_only') {
        try {
          await supabase.from('app_notifications').insert({
            email:        item.email,
            handle:       item.handle,
            type:         'nudge',
            title:        '⚡ Your next task is waiting',
            body:         `You're at ${item.progress_pct}%. Week 2 is now open — keep going.`,
            action_url:   item.track === 'marketing'
                            ? `${BASE_URL}/marketing`
                            : `${BASE_URL}/dev`,
            action_label: 'Continue →',
            cohort:       internship.cohort,
            lang:         'en',
          });
          appSent++;
        } catch { /* silent — non-critical */ }
        continue;
      }

      // ── 5e. Budget exhausted mid-queue → app_only fallback ─
      if (remaining <= 0) {
        try {
          await supabase.from('app_notifications').insert({
            email:        item.email,
            handle:       item.handle,
            type:         'nudge',
            title:        '⚡ Your next task is waiting',
            body:         `You're at ${item.progress_pct}%. Week 2 is now open.`,
            action_url:   `${BASE_URL}/dev`,
            action_label: 'Continue →',
            cohort:       internship.cohort,
            lang:         'en',
          });
          appSent++;
        } catch { /* silent — non-critical */ }
        continue;
      }

      // ── 5f. Email — delegate to internship/nudge ──────────
      // internship/nudge owns: email build, heraldSend,
      // recordEmailSent, logEmailSend, activity_log, Discord
      try {
        const nudgeRes = await fetch(`${BASE_URL}/api/internship/nudge`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            email:      item.email,
            nudge_type: item.nudge_type,
          }),
        });

        if (!nudgeRes.ok) {
          const body = await nudgeRes.json().catch(() => ({}));
          throw new Error((body as any)?.error || `nudge POST ${nudgeRes.status}`);
        }

        emailSent++;
        remaining--;

      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'unknown';
        errors.push(`${item.handle}: ${msg}`);
      }
    }

    // ── 6. Light tier — always app_only, never email ──────────
    // Active challengers seen in last 24hrs — gentle bell only
    const lightTier = internship.light || [];
    for (const c of lightTier) {
      try {
        await supabase.from('app_notifications').insert({
          email:        c.email,
          handle:       c.handle || c.first_name,
          type:         'nudge',
          title:        '⚡ Keep going — you\'re close',
          body:         `You're at ${c.progress_pct || 0}%. All Week 1 tasks are still open.`,
          action_url:   c.track === 'marketing'
                          ? `${BASE_URL}/marketing`
                          : `${BASE_URL}/dev`,
          action_label: 'Continue →',
          cohort:       internship.cohort,
          lang:         'en',
        });
        appSent++;
      } catch { /* silent — non-critical */ }
    }

    // ── 7. Seed admin notification — your ops bell ────────────
    try {
      await supabase.from('notifications').insert({
        email:   ADMIN_EMAIL,
        type:    'info',
        title:   `📧 Nudge Cron — ${emailSent} emails · ${appSent} in-app`,
        message: `Queue: ${queue.length} + ${lightTier.length} light. ` +
                 `Email: ${emailSent}. App: ${appSent}. Skipped: ${skipped}. ` +
                 `Budget: ${alreadySent + emailSent}/${dailyBudget}. ` +
                 (errors.length ? `Errors: ${errors.length}.` : 'Clean run.'),
        cohort:  internship.cohort,
        read:    false,
      });
    } catch { /* silent — non-critical */ }

    // ── 8. Discord summary ─────────────────────────────────────
    await notifyDiscord('', 'internship', {
      title:  `📧 Nudge Cron — ${emailSent} sent`,
      color:  emailSent > 0 ? DC.green : DC.grey,
      fields: [
        { name: 'Email Sent',  value: `${emailSent}`,                         inline: true },
        { name: 'In-App',      value: `${appSent}`,                           inline: true },
        { name: 'Skipped',     value: `${skipped}`,                           inline: true },
        { name: 'Budget Used', value: `${alreadySent + emailSent}/${dailyBudget}`, inline: true },
        { name: 'Remaining',   value: `${remaining}`,                         inline: true },
        { name: 'Queue',       value: `${queue.length} + ${lightTier.length} light`, inline: true },
        ...(errors.length > 0 ? [{
          name:   `Errors (${errors.length})`,
          value:  errors.slice(0, 5).join('\n'),
          inline: false,
        }] : []),
      ],
      footer:    `cron/nudge · ${today}`,
      timestamp: true,
    });

    // ── 9. Return summary ──────────────────────────────────────
    return ok({
      ok:               true,
      email_sent:       emailSent,
      app_sent:         appSent,
      skipped,
      queue_size:       queue.length,
      light_size:       lightTier.length,
      budget:           dailyBudget,
      sent_today_total: alreadySent + emailSent,
      remaining_after:  remaining,
      cohort:           internship.cohort,
      errors:           errors.length > 0 ? errors : undefined,
    });

  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    console.error('[cron/nudge] fatal error:', message);

    // Seed admin notification on fatal error
    try {
      await supabase.from('notifications').insert({
        email:   ADMIN_EMAIL,
        type:    'alert',
        title:   '🔴 Nudge Cron — Fatal Error',
        message: message,
        read:    false,
      });
    } catch { /* silent */ }

    await notifyDiscord('', 'internship', {
      title:     '🔴 Nudge Cron — Fatal Error',
      color:     DC.red,
      fields:    [{ name: 'Error', value: message, inline: false }],
      footer:    `cron/nudge · ${startedAt}`,
      timestamp: true,
    });

    return err(message);
  }
}
