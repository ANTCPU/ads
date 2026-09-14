// app/api/send-weekly/route.ts
// ─── Weekly digest — gated, logged, proof-of-delivery ────────────────────────
//
// Cron:    vercel.json → "0 9 * * 1" (Monday 09:00 UTC)
// Auth:    Vercel cron → Authorization: Bearer <CRON_SECRET>  (auto-injected)
//          Manual      → GET ?secret=<WEEKLY_SECRET>
//          Manual POST → body { secret: <WEEKLY_SECRET> }
//
// Gate:    checkEmailGate() per user — digest budget 70/day
//          Users < 7 days old → in-app notification instead
//
// Log:     Every run writes one row to digest_runs
//          Discord summary includes sent/gated/error counts
//          Proof: digest_runs is the source of truth for "did it fire?"
//
// Proof plan:
//   1. digest_runs row written at END of every run — check this first
//   2. Discord ping includes full counts — visible immediately
//   3. recordEmailSent() increments per-user counters — audit trail
//   4. In-app notifications fire for gated users — no silent skips
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse }  from 'next/server';
import { createClient }               from '@supabase/supabase-js';
import { notifyDiscord }              from '../../lib/discord';
import { heraldSend, heraldWrap,
         HERALD_VERSION }             from '../../lib/herald';
import { t, isRTL }                   from '../../lib/i18n';
import type { Locale }                from '../../lib/i18n';
import { checkEmailGate, recordEmailSent,
         gatedNotify, EMAIL_LIMITS }  from '../../lib/emailGate';

// ─── Service role client ──────────────────────────────────────────────────────

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ─── Types ────────────────────────────────────────────────────────────────────

type Signup = {
  name:             string;
  email:            string;
  brand_name:       string;
  status:           string;
  role:             string;
  preferred_locale: string | null;
};

type Ad = {
  id:          string;
  brand:       string;
  title:       string;
  url:         string;
  description: string;
  points:      number;
  tier:        string;
};

// ─── Quotes ───────────────────────────────────────────────────────────────────

const QUOTES = [
  { quote: "The best marketing doesn't feel like marketing.",                              author: 'Tom Fishburne'  },
  { quote: 'Content is fire. Social media is gasoline.',                                  author: 'Jay Baer'       },
  { quote: 'Make it simple. Make it memorable. Make it inviting to look at.',             author: 'Leo Burnett'    },
  { quote: "Your brand is what people say about you when you're not in the room.",        author: 'Jeff Bezos'     },
  { quote: "Stop interrupting what people are interested in and be what people are interested in.", author: 'Craig Davis' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function dashboardUrl(user: Signup): string {
  if (user.role === 'super' ||
      user.email === (process.env.NEXT_PUBLIC_SUPER_EMAIL || ''))
    return 'https://antcpu-ads.vercel.app/dashboard/admin';
  if (user.role === 'admin')
    return 'https://antcpu-ads.vercel.app/dashboard/users';
  return 'https://antcpu-ads.vercel.app/dashboard/user';
}

// ─── Auth check ───────────────────────────────────────────────────────────────
// Accepts two paths:
//   Vercel cron  → Authorization: Bearer <CRON_SECRET>  (injected automatically)
//   Manual GET   → ?secret=<WEEKLY_SECRET>
//   Manual POST  → body.secret === WEEKLY_SECRET (handled in POST directly)

function isAuthorizedCron(req: NextRequest): boolean {
  const auth       = req.headers.get('authorization') || '';
  const cronSecret = process.env.CRON_SECRET || '';
  return !!(cronSecret && auth === `Bearer ${cronSecret}`);
}

function isAuthorizedManual(req: NextRequest): boolean {
  const secret = req.nextUrl.searchParams.get('secret') || '';
  return !!(secret && secret === process.env.WEEKLY_SECRET);
}

// ─── Core digest runner ───────────────────────────────────────────────────────

async function runDigest(triggeredBy: 'cron' | 'manual'): Promise<NextResponse> {
  const startMs  = Date.now();
  const week     = new Date().toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });

  // ── Counters — written to digest_runs at end ──────────────────────────────
  let totalEligible = 0;
  let sent          = 0;
  let gatedTooNew   = 0;
  let gatedDailyCap = 0;
  let gatedMonthly  = 0;
  let notified      = 0;
  let errors        = 0;
  const notes: string[] = [];

  try {
    // ── Fetch all active users ──────────────────────────────────────────────
    const { data: signups, error: fetchErr } = await supabase
      .from('ad_signups')
      .select('name, email, brand_name, status, role, preferred_locale')
      .in('status', ['team', 'trial']);

    if (fetchErr) {
      notes.push(`fetch_error: ${fetchErr.message}`);
      await logRun({ week, triggeredBy, totalEligible, sent, gatedTooNew,
        gatedDailyCap, gatedMonthly, notified, errors: 1,
        durationMs: Date.now() - startMs, notes });
      return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    }

    if (!signups?.length) {
      notes.push('no_eligible_users');
      await logRun({ week, triggeredBy, totalEligible: 0, sent: 0,
        gatedTooNew: 0, gatedDailyCap: 0, gatedMonthly: 0,
        notified: 0, errors: 0, durationMs: Date.now() - startMs, notes });
      return NextResponse.json({ sent: 0, reason: 'no_eligible_users' });
    }

    totalEligible = signups.length;

    // ── Fetch top 3 ads for leaderboard ────────────────────────────────────
    const { data: topAds } = await supabase
      .from('ads')
      .select('id, brand, title, url, description, points, tier')
      .eq('status', 'active')
      .order('points', { ascending: false })
      .limit(3);

    const quote = QUOTES[Math.floor(Math.random() * QUOTES.length)];

    // ── Per-user loop ───────────────────────────────────────────────────────
    for (const user of signups as Signup[]) {
      const locale    = (user.preferred_locale || 'en') as Locale;
      const firstName = user.name?.split(' ')[0] || 'there';
      const isTeam    = user.status === 'team';
      const myDash    = dashboardUrl(user);

      // Gate check
      const gate = await checkEmailGate(supabase, user.email, 'digest');

      if (!gate.allow) {
        // Always fire in-app so user still gets the weekly signal
        await gatedNotify(
          supabase, user.email,
          `⚡ ${t(locale, 'weekly_digest_label')} · ${week}`,
          t(locale, 'weekly_greeting'),
          'info'
        );
        notified++;

        // Track gate reason for the run log
        if (gate.reason === 'too_new')    gatedTooNew++;
        if (gate.reason === 'daily_cap')  gatedDailyCap++;
        if (gate.reason === 'monthly_cap') gatedMonthly++;
        continue;
      }

      // Build leaderboard HTML
      const leaderboardHtml = (topAds || []).map((ad: Ad, i: number) => `
        <div style="display:flex;align-items:center;gap:12px;padding:12px 0;
          border-bottom:1px solid #1a1a1a;">
          <span style="font-size:1.4rem">${['🥇','🥈','🥉'][i]}</span>
          <div style="flex:1">
            <div style="font-weight:700;color:#fff">${ad.brand}</div>
            <div style="font-size:0.82rem;color:#888">${ad.title}</div>
          </div>
          <a href="${ad.url}"
            style="font-size:0.78rem;color:#f0883e;text-decoration:none;
            font-weight:700">
            ${t(locale, 'partner_visit_cta')} →
          </a>
        </div>
      `).join('');

      const body = `
        <!-- Greeting -->
        <div style="font-size:1rem;color:#aaa;margin-bottom:1.5rem">
          Hey ${firstName} 👋 — ${t(locale, 'weekly_greeting')}
        </div>

        <!-- Leaderboard -->
        <div style="background:#111;border:1px solid #1a1a1a;
          border-radius:12px;padding:1.25rem;margin-bottom:1.5rem">
          <div style="font-size:0.7rem;color:#555;font-weight:700;
            letter-spacing:0.1em;text-transform:uppercase;
            margin-bottom:0.75rem">
            🏆 ${t(locale, 'weekly_leaderboard')}
          </div>
          ${leaderboardHtml ||
            `<div style="color:#555;font-size:0.85rem">
              ${t(locale, 'arena_empty')}
            </div>`}
          <a href="${myDash}"
            style="display:inline-block;margin-top:1rem;background:#f0883e;
            color:#000;text-decoration:none;font-weight:700;font-size:0.85rem;
            padding:0.6rem 1.25rem;border-radius:8px">
            ${t(locale, 'arena_join_cta')}
          </a>
        </div>

        <!-- Featured partner -->
        <div style="background:#111;border:1px solid #D4AF3730;
          border-radius:12px;padding:1.25rem;margin-bottom:1.5rem">
          <div style="font-size:0.7rem;color:#555;font-weight:700;
            letter-spacing:0.1em;text-transform:uppercase;
            margin-bottom:0.75rem">
            ⚡ ${t(locale, 'partner_section_label')}
          </div>
          <div style="display:flex;align-items:center;gap:0.75rem;
            margin-bottom:0.75rem">
            <span style="font-size:1.5rem">🗺️</span>
            <div>
              <div style="font-weight:800;color:#fff">Map of Pi</div>
              <div style="font-size:0.75rem;color:#D4AF37">
                ${t(locale, 'partner_section_label')}
              </div>
            </div>
          </div>
          <div style="font-size:0.85rem;color:#aaa;margin-bottom:1rem">
            ${t(locale, 'partner_affil')}
          </div>
          <div style="font-size:0.78rem;color:#555;margin-bottom:1rem">
            ✓ 2.1M+ ${t(locale, 'partner_users_label')}<br>
            ✓ 148,000 ${t(locale, 'partner_sellers_label')}<br>
            ✓ 173,000+ ${t(locale, 'partner_tx_label')}<br>
          </div>
          <a href="https://mapofpi.com/"
            style="display:inline-block;background:#D4AF37;color:#000;
            text-decoration:none;font-weight:700;font-size:0.85rem;
            padding:0.6rem 1.25rem;border-radius:8px">
            ${t(locale, 'partner_visit_cta')} →
          </a>
        </div>

        <!-- Tip -->
        <div style="background:#111;border:1px solid #1a1a1a;
          border-radius:12px;padding:1.25rem;margin-bottom:1.5rem">
          <div style="font-size:0.7rem;color:#555;font-weight:700;
            letter-spacing:0.1em;text-transform:uppercase;
            margin-bottom:0.5rem">
            💡 ${t(locale, 'weekly_tip_label')}
          </div>
          <div style="font-size:0.88rem;color:#aaa;line-height:1.6">
            ${t(locale, 'weekly_tip_body')}
          </div>
        </div>

        <!-- Quote -->
        <div style="border-left:3px solid #f0883e;padding:0.75rem 1rem;
          margin-bottom:1.5rem">
          <div style="font-size:0.88rem;color:#aaa;font-style:italic">
            "${quote.quote}"
          </div>
          <div style="font-size:0.75rem;color:#555;margin-top:0.4rem">
            — ${quote.author}
          </div>
        </div>

        <!-- Status badge -->
        <div style="text-align:center;margin-bottom:1.5rem">
          <span style="background:${isTeam ? '#7928ca15' : '#0070f315'};
            color:${isTeam ? '#7928ca' : '#0070f3'};
            border:1px solid ${isTeam ? '#7928ca30' : '#0070f330'};
            border-radius:999px;padding:0.3rem 1rem;
            font-size:0.75rem;font-weight:700">
            ${isTeam
              ? `🔵 ${t(locale, 'weekly_status_team')}`
              : `🟢 ${t(locale, 'plan_trial_name')}`}
          </span>
        </div>

        <!-- Discord CTA -->
        <div style="text-align:center;margin-bottom:2rem">
          <a href="https://discord.gg/antcpu"
            style="display:inline-block;background:transparent;
            border:1px solid #333;color:#aaa;text-decoration:none;
            font-weight:600;font-size:0.85rem;
            padding:0.6rem 1.25rem;border-radius:8px">
            💬 ${t(locale, 'arena_nudge_cta')}
          </a>
        </div>
      `;

      const html = heraldWrap(
        locale, body,
        `${t(locale, 'weekly_digest_label')} · ${week} · ${HERALD_VERSION}`
      );

      try {
        await heraldSend({
          to:      user.email,
          subject: `⚡ ANTCPU ADS — ${t(locale, 'weekly_digest_label')} · ${week}`,
          html,
          locale,
        });
        await recordEmailSent(supabase, user.email);
        sent++;
      } catch (sendErr: unknown) {
        // Log the failure but continue the loop — never abort the batch
        const msg = sendErr instanceof Error ? sendErr.message : 'unknown';
        notes.push(`send_fail:${user.email}:${msg}`);
        errors++;
      }
    }

  } catch (loopErr: unknown) {
    const msg = loopErr instanceof Error ? loopErr.message : 'unknown';
    notes.push(`loop_error:${msg}`);
    errors++;
  }

  const durationMs = Date.now() - startMs;

  // ── Write run log — always, even on partial failure ───────────────────────
  await logRun({
    week, triggeredBy, totalEligible, sent,
    gatedTooNew, gatedDailyCap, gatedMonthly,
    notified, errors, durationMs, notes,
  });

  // ── Discord summary — full counts visible immediately ─────────────────────
  await notifyDiscord(
    `📧 Weekly digest · **${week}** · triggered: ${triggeredBy}\n` +
    `✅ sent: ${sent} · 📭 gated: ${gatedTooNew + gatedDailyCap + gatedMonthly}` +
    ` (new: ${gatedTooNew} · cap: ${gatedDailyCap} · monthly: ${gatedMonthly})\n` +
    `✉️ in-app: ${notified} · ❌ errors: ${errors} · ⏱ ${durationMs}ms\n` +
    `👥 eligible: ${totalEligible} · budget: ${EMAIL_LIMITS.DAILY_DIGEST}/day`
  );

  return NextResponse.json({
    sent, notified, errors,
    gated: { too_new: gatedTooNew, daily_cap: gatedDailyCap, monthly: gatedMonthly },
    total_eligible: totalEligible,
    duration_ms: durationMs,
    week,
  });
}

// ─── logRun ───────────────────────────────────────────────────────────────────
// Writes one row to digest_runs — permanent record of every execution.
// Never throws — log failure must not affect the response.

async function logRun(p: {
  week:          string;
  triggeredBy:   string;
  totalEligible: number;
  sent:          number;
  gatedTooNew:   number;
  gatedDailyCap: number;
  gatedMonthly:  number;
  notified:      number;
  errors:        number;
  durationMs:    number;
  notes:         string[];
}): Promise<void> {
  try {
    await supabase.from('digest_runs').insert([{
      week_label:      p.week,
      triggered_by:    p.triggeredBy,
      total_eligible:  p.totalEligible,
      sent:            p.sent,
      gated_too_new:   p.gatedTooNew,
      gated_daily_cap: p.gatedDailyCap,
      gated_monthly:   p.gatedMonthly,
      notified:        p.notified,
      errors:          p.errors,
      duration_ms:     p.durationMs,
      notes:           p.notes.length ? p.notes.join(' | ') : null,
    }]);
  } catch {
    // Silent — log failure never blocks the response
  }
}

// ─── POST — manual trigger ────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { secret } = await req.json();
    if (secret !== process.env.WEEKLY_SECRET) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    return runDigest('manual');
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── GET — Vercel cron + manual ───────────────────────────────────────────────
// Vercel cron injects Authorization: Bearer <CRON_SECRET> automatically.
// Manual: GET ?secret=<WEEKLY_SECRET>

export async function GET(req: NextRequest) {
  const authorized = isAuthorizedCron(req) || isAuthorizedManual(req);
  if (!authorized) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  return runDigest(isAuthorizedCron(req) ? 'cron' : 'manual');
}
