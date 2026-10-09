// ============================================================
// app/api/cron/nudge/route.ts
// GET — Daily nudge cron for internship challengers
//
// Schedule: daily at 10:00 UTC (vercel.json)
// Secured:  CRON_SECRET header — Vercel passes automatically
//
// Architecture:
//   This is a thin orchestrator — it does NOT build emails.
//   All email logic lives in /api/internship/nudge.
//   This route: checks budget → gets tiers → routes each
//   challenger to the right channel → logs summary.
//
// Channel routing per challenger:
//   email_ok = true  + send_count < 3 OR open_count > 0
//     → POST /api/internship/nudge  (email + activity log)
//   email_ok = false OR (send_count >= 3 AND open_count = 0)
//     → INSERT app_notifications    (in-app only)
//   unsubscribed_at IS NOT NULL OR bounced
//     → skip entirely
//
// Priority order (email budget consumed in this order):
//   1. hard_d1     — registered, never returned (5%)
//   2. hard_d2     — profile done, never touched Arena (10%)
//   3. week2_unlock — Week 1 done, Week 2 just opened (25%+)
//   4. soft        — stalled 15-24%, >48hrs gone
//   5. light       — active <25%, seen <24hrs → app only, no email
//
// Dedup: challengers.nudge_sent_at — skip if nudged < 7 days ago
// Budget: EMAIL_LIMITS.DAILY_TRANSACTIONAL from emailGate.ts
//
// v2 (Oct 2026):
//   — Full rewrite — previous version never sent emails (bug)
//   — Routes to app_notifications for non-email users
//   — Checks email_prefs before every send
//   — Dedup via challengers.nudge_sent_at (not email_sends)
//   — Calls /api/internship/nudge — no duplicate email logic
//   — Seeds admin notification on completion
//   — CORS + OPTIONS + numbered steps + file standard applied
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
const CRON_SECRET = process.env.CRON_SECRET || '';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'antcpu@gmail.com';

// 7 days — minimum gap between nudges per challenger
const NUDGE_COOLDOWN_DAYS = 7;

// Threshold: 3+ sends with 0 opens = switch to app-only
const APP_ONLY_SEND_THRESHOLD = 3;

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Cache-Control':                'no-store',
};

// ─── Types ────────────────────────────────────────────────────
type NudgeItem = {
  email:       string;
  intern_id:   string;
  handle:      string;
  first_name:  string;
  track:       string;
  progress_pct: number;
  nudge_type:  string;
  nudge_sent_at: string | null;
  country:     string;
};

type ChannelDecision = 'email' | 'app_only' | 'skip';

// ─── Helpers ──────────────────────────────────────────────────
const ok  = (data: object)         => NextResponse.json(data,           { headers: CORS });
const err = (msg: string, s = 500) => NextResponse.json({ error: msg }, { status: s, headers: CORS });

// Decide channel based on email_prefs behaviour data
function resolveChannel(pref: {
  email_ok:        boolean;
  unsubscribed_at: string | null;
  bounce_count:    number;
  open_count:      number;
  send_count:      number;
} | null): ChannelDecision {
  if (!pref) return 'email'; // no pref row = new user, default to email

  // Hard stops — never contact
  if (pref.unsubscribed_at)                                    return 'skip';
  if (!pref.email_ok && pref.bounce_count >= 2)                return 'skip';

  // Soft stop — email blocked, app only
  if (!pref.email_ok)                                          return 'app_only';

  // Behavioural: 3+ sends, zero opens = inbox ignorer → app only
  if (pref.send_count >= APP_ONLY_SEND_THRESHOLD
    && pref.open_count === 0)                                  return 'app_only';

  return 'email';
}

// ─── OPTIONS ──────────────────────────────────────────────────
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

// ─── GET ──────────────────────────────────────────────────────
export async function GET(req: NextRequest) {

  // ── 1. Auth — Vercel cron passes CRON_SECRET as Bearer ────
  const authHeader = req.headers.get('authorization');
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return err('Unauthorized', 401);
  }

  const startedAt = new Date().toISOString();
  const today     = new Date().toISOString().slice(0, 10);

  try {

    // ── 2. Check daily email budget ───────────────────────────
    const { count: sentToday } = await supabase
      .from('email_sends')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'sent')
      .gte('created_at', `${today}T00:00:00.000Z`);

    const alreadySent  = sentToday || 0;
    const dailyBudget  = EMAIL_LIMITS.DAILY_TRANSACTIONAL;
    let   remaining    = Math.max(0, dailyBudget - alreadySent);

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
      }).catch(() => {});

      return ok({
        ok:         true,
        sent:       0,
        skipped:    0,
        reason:     'daily_budget_exhausted',
        budget:     dailyBudget,
        sent_today: alreadySent,
      });
    }

    // ── 3. Get nudge tiers from herald ────────────────────────
    const heraldRes = await fetch(`${BASE_URL}/api/herald`, {
      headers: { 'Content-Type': 'application/json' },
      cache:   'no-store',
    });

    if (!heraldRes.ok) {
      throw new Error(`Herald fetch failed: ${heraldRes.status}`);
    }

    const heraldData  = await heraldRes.json();
    const internship  = heraldData.internship;

    if (!internship) {
      return ok({ ok: true, sent: 0, reason: 'no_internship_data' });
    }

    // ── 4. Build priority queue — email tiers only ────────────
    // light tier handled separately — always app_only, no email
    const cooldownCutoff = new Date(
      Date.now() - NUDGE_COOLDOWN_DAYS * 86400000
    ).toISOString();

    const buildItems = (tier: any[], nudge_type: string): NudgeItem[] =>
      (tier || []).map((c: any) => ({
        email:        c.email,
        intern_id:    c.intern_id,
        handle:       c.handle       || c.first_name || 'challenger',
        first_name:   c.first_name   || 'there',
        track:        c.track        || 'dev',
        progress_pct: c.progress_pct || 0,
        nudge_type,
        nudge_sent_at: c.nudge_sent_at || null,
        country:      c.country       || '',
      }));

    const queue: NudgeItem[] = [
      ...buildItems(internship.hard_d1,      'hard_d1'),      // P1
      ...buildItems(internship.hard_d2,      'hard_d2'),      // P2
      ...buildItems(internship.week2_unlock, 'week2_unlock'), // P3
      ...buildItems(internship.soft,         'soft'),         // P4
    ];

    // ── 5. Process queue ──────────────────────────────────────
    let emailSent  = 0;
    let appSent    = 0;
    let skipped    = 0;
    const errors:  string[] = [];

    for (const item of queue) {

      // ── 5a. Dedup — nudged within cooldown window ──────────
      if (item.nudge_sent_at && item.nudge_sent_at > cooldownCutoff) {
        skipped++;
        continue;
      }

      // ── 5b. Read email_prefs for this challenger ───────────
      const { data: pref } = await supabase
        .from('email_prefs')
        .select('email_ok, unsubscribed_at, bounce_count, open_count, send_count')
        .eq('email', item.email)
        .maybeSingle();

      const channel = resolveChannel(pref);

      // ── 5c. Skip — fully opted out ─────────────────────────
      if (channel === 'skip') {
        skipped++;
        continue;
      }

      // ── 5d. App only — inbox ignorer or email blocked ──────
      if (channel === 'app_only') {
        await supabase
          .from('app_notifications')
          .insert({
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
            lang:         pref?.email_ok !== undefined ? 'en' : 'en',
          })
          .catch(() => {});

        appSent++;
        continue;
      }

      // ── 5e. Email — within budget ──────────────────────────
      if (remaining <= 0) {
        // Budget hit mid-queue — remaining go to app_only
        await supabase
          .from('app_notifications')
          .insert({
            email:        item.email,
            handle:       item.handle,
            type:         'nudge',
            title:        '⚡ Your next task is waiting',
            body:         `You're at ${item.progress_pct}%. Week 2 is now open.`,
            action_url:   `${BASE_URL}/dev`,
            action_label: 'Continue →',
            cohort:       internship.cohort,
          })
          .catch(() => {});

        appSent++;
        continue;
      }

      try {
        // ── 5f. POST to internship/nudge — owns email logic ───
        const nudgeRes = await fetch(`${BASE_URL}/api/internship/nudge`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            email:      item.email,
            nudge_type: item.nudge_type,
          }),
        });

        if (!nudgeRes.ok) {
          const nudgeErr = await nudgeRes.json().catch(() => ({}));
          throw new Error(nudgeErr?.error || `nudge POST ${nudgeRes.status}`);
        }

        emailSent++;
        remaining--;

      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'unknown';
        errors.push(`${item.handle}: ${msg}`);
      }
    }

    // ── 6. Light tier — always app_only, no email ─────────────
    const lightTier = internship.light || [];
    for (const c of lightTier) {
      await supabase
        .from('app_notifications')
        .insert({
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
        })
        .catch(() => {});

      appSent++;
    }

    // ── 7. Seed admin notification — ops visibility ────────────
    const totalProcessed = emailSent + appSent + skipped;
    await supabase
      .from('notifications')
      .insert({
        email:   ADMIN_EMAIL,
        type:    'info',
        title:   `📧 Nudge Cron — ${emailSent} emails, ${appSent} in-app`,
        message: `Queue: ${queue.length} email + ${lightTier.length} light. ` +
                 `Sent: ${emailSent} email, ${appSent} app. ` +
                 `Skipped: ${skipped}. Budget: ${alreadySent + emailSent}/${dailyBudget}. ` +
                 (errors.length ? `Errors: ${errors.length}.` : 'No errors.'),
        cohort:  internship.cohort,
        read:    false,
      })
      .catch(() => {});

    // ── 8. Discord summary ─────────────────────────────────────
    await notifyDiscord('', 'internship', {
      title:  `📧 Nudge Cron — ${emailSent} sent`,
      color:  emailSent > 0 ? DC.green : DC.grey,
      fields: [
        { name: 'Email Sent',  value: `${emailSent}`,                        inline: true },
        { name: 'In-App',      value: `${appSent}`,                          inline: true },
        { name: 'Skipped',     value: `${skipped}`,                          inline: true },
        { name: 'Budget Used', value: `${alreadySent + emailSent}/${dailyBudget}`, inline: true },
        { name: 'Remaining',   value: `${remaining}`,                        inline: true },
        { name: 'Queue',       value: `${totalProcessed} total`,             inline: true },
        ...(errors.length > 0 ? [{
          name:   'Errors',
          value:  errors.slice(0, 5).join('\n'),
          inline: false,
        }] : []),
      ],
      footer:    `cron/nudge · ${today}`,
      timestamp: true,
    }).catch(() => {});

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
    await supabase
      .from('notifications')
      .insert({
        email:   ADMIN_EMAIL,
        type:    'alert',
        title:   '🔴 Nudge Cron — Fatal Error',
        message: message,
        read:    false,
      })
      .catch(() => {});

    await notifyDiscord('', 'internship', {
      title:     '🔴 Nudge Cron — Fatal Error',
      color:     DC.red,
      fields:    [{ name: 'Error', value: message, inline: false }],
      footer:    `cron/nudge · ${startedAt}`,
      timestamp: true,
    }).catch(() => {});

    return err(message);
  }
}
