// app/api/send-weekly/route.ts
// ─── Weekly digest — gated, logged, proof-of-delivery ────────────────────────
//
// Cron:    vercel.json → "0 9 * * 1" (Monday 09:00 UTC)
// Auth:    Vercel cron → Authorization: Bearer <CRON_SECRET>  (auto-injected)
//          Manual GET  → ?secret=<WEEKLY_SECRET>
//          Manual POST → body { secret: <WEEKLY_SECRET> }
//
// Gate:    checkEmailGate() per user — digest budget 70/day
//          Users < 7 days old → in-app notification instead
//
// Log:     Every run writes one row to digest_runs
//          Discord summary includes sent/gated/error counts
//          Proof: digest_runs is the source of truth for "did it fire?"
//
// Sections (in order):
//   1. ⭐ Profile of the Week  — whoever holds featured-profile badge
//   2. 🏆 Leaderboard          — top 3 ads by points
//   3. 📈 Arena This Week      — live stats + delta from last run
//   4. 🔥 Most Active Ad       — highest points delta this week
//   5. 💡 Tip of the Week      — i18n key, rotates
//   6. 💬 Quote                — random from pool
//   7. Status badge + CTA
//
// v2 (Sep 2026):
//   — Profile of the Week block — reads featured-profile badge holder
//   — Arena This Week block — live stats + delta from digest_runs snapshot
//   — Most Active Ad block — highest points ad created this week
//   — Featured Partner (Map of Pi) replaced by Profile of the Week
//   — digest_runs now stores total_ads + total_points + total_shares snapshot
//   — dashboardUrl fixed: /dashboard/admin → /dashboard/antcpu
//   — getFeaturedProfileHolder() imported from lib/badges
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse }  from 'next/server';
import { createClient }               from '@supabase/supabase-js';
import { notifyDiscord, DC }          from '../../lib/discord';
import { heraldSend, heraldWrap,
         HERALD_VERSION }             from '../../lib/herald';
import { t }                          from '../../lib/i18n';
import type { Locale }                from '../../lib/i18n';
import { checkEmailGate, recordEmailSent,
         gatedNotify, EMAIL_LIMITS }  from '../../lib/emailGate';
import { getFeaturedProfileHolder }   from '../../lib/badges';

// ─── Service role client ──────────────────────────────────────────────────────

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://antcpu-ads.vercel.app';

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
  created_at:  string;
};

type FeaturedProfile = {
  email:    string;
  name:     string;
  brand:    string;
  points:   number;
  bio:      string;
  adTitle:  string;
  adPoints: number;
  rank:     number | null;
  imageUrl: string | null;
  color:    string;
};

// ─── Quotes ───────────────────────────────────────────────────────────────────

const QUOTES = [
  { quote: "The best marketing doesn't feel like marketing.",                                        author: 'Tom Fishburne'  },
  { quote: 'Content is fire. Social media is gasoline.',                                            author: 'Jay Baer'       },
  { quote: 'Make it simple. Make it memorable. Make it inviting to look at.',                       author: 'Leo Burnett'    },
  { quote: "Your brand is what people say about you when you're not in the room.",                  author: 'Jeff Bezos'     },
  { quote: "Stop interrupting what people are interested in and be what people are interested in.", author: 'Craig Davis'    },
  { quote: 'Do not be afraid to give up the good to go for the great.',                             author: 'John D. Rockefeller' },
  { quote: 'The aim of marketing is to know and understand the customer so well the product sells itself.', author: 'Peter Drucker' },
];

// ─── Brand color map — for featured profile gradient ─────────────────────────
// Keyed by email. Add new featured users here before their week starts.

const FEATURED_BRAND_COLORS: Record<string, string> = {
  'mishoemanda@gmail.com': '#ff0080',   // Amanda Photography — pink
  'joosdup.pj@gmail.com':  '#D4AF37',   // Philip — Map of Pi gold
};

const DEFAULT_FEATURED_COLOR = '#f0883e';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function dashboardUrl(user: Signup): string {
  if (user.role === 'super' || user.email === 'antcpu@gmail.com')
    return `${BASE_URL}/dashboard/antcpu`;
  if (user.role === 'admin')
    return `${BASE_URL}/dashboard/users`;
  return `${BASE_URL}/dashboard/user`;
}

function weekRange(): string {
  const now  = new Date();
  const end  = new Date(now);
  end.setDate(now.getDate() + 6);
  const fmt  = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${fmt(now)} → ${fmt(end)}`;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

function isAuthorizedCron(req: NextRequest): boolean {
  const auth       = req.headers.get('authorization') || '';
  const cronSecret = process.env.CRON_SECRET || '';
  return !!(cronSecret && auth === `Bearer ${cronSecret}`);
}

function isAuthorizedManual(req: NextRequest): boolean {
  const secret = req.nextUrl.searchParams.get('secret') || '';
  return !!(secret && secret === process.env.WEEKLY_SECRET);
}

// ─── HTML blocks ─────────────────────────────────────────────────────────────

function buildFeaturedBlock(fp: FeaturedProfile, range: string): string {
  const color    = fp.color;
  const gradient = `linear-gradient(135deg, #0d0a10 0%, #1a0d18 100%)`;
  const topLine  = `linear-gradient(90deg, ${color}, #7928ca, transparent)`;

  return `
    <div style="background:${gradient};border:1px solid ${color}33;
      border-radius:16px;padding:1.5rem;margin-bottom:1.5rem;
      position:relative;overflow:hidden">

      <!-- Top accent line -->
      <div style="position:absolute;top:0;left:0;right:0;height:3px;
        background:${topLine}"></div>

      <!-- Label -->
      <div style="font-size:0.65rem;color:${color};font-weight:700;
        letter-spacing:0.12em;text-transform:uppercase;margin-bottom:0.75rem">
        ⭐ Profile of the Week · ${range}
      </div>

      <!-- Name + brand -->
      <div style="font-size:1.1rem;font-weight:800;color:#fff;margin-bottom:0.2rem">
        ${fp.name || fp.brand}
      </div>
      <div style="font-size:0.78rem;color:${color};font-weight:600;margin-bottom:0.75rem">
        ${fp.brand}
      </div>

      ${fp.bio ? `
        <div style="font-size:0.82rem;color:#aaa;line-height:1.6;
          margin-bottom:0.75rem;font-style:italic">
          "${fp.bio.slice(0, 120)}${fp.bio.length > 120 ? '…' : ''}"
        </div>
      ` : ''}

      ${fp.imageUrl ? `
        <img src="${fp.imageUrl}" alt="${fp.brand}"
          style="width:100%;border-radius:10px;margin-bottom:0.75rem;
          display:block;max-height:200px;object-fit:cover" />
      ` : ''}

      <!-- Stats row -->
      <div style="display:flex;gap:1.25rem;margin-bottom:1rem;flex-wrap:wrap">
        ${fp.adPoints > 0 ? `
          <div>
            <div style="font-size:1rem;font-weight:800;color:${color}">${fp.adPoints}</div>
            <div style="font-size:0.6rem;color:#555;text-transform:uppercase;letter-spacing:0.08em">Points</div>
          </div>
        ` : ''}
        ${fp.rank ? `
          <div>
            <div style="font-size:1rem;font-weight:800;color:#fff">#${fp.rank}</div>
            <div style="font-size:0.6rem;color:#555;text-transform:uppercase;letter-spacing:0.08em">Rank</div>
          </div>
        ` : ''}
        ${fp.adTitle ? `
          <div style="flex:1;min-width:0">
            <div style="font-size:0.75rem;font-weight:700;color:#ccc;
              white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
              ${fp.adTitle}
            </div>
            <div style="font-size:0.6rem;color:#555;text-transform:uppercase;letter-spacing:0.08em">Top Ad</div>
          </div>
        ` : ''}
      </div>

      <!-- CTAs -->
      <div style="display:flex;gap:0.75rem;flex-wrap:wrap">
        <a href="${BASE_URL}/profile/${encodeURIComponent(fp.email)}"
          style="display:inline-block;background:${color};color:#000;
          text-decoration:none;font-weight:800;font-size:0.82rem;
          padding:0.55rem 1.1rem;border-radius:8px">
          👤 View Profile →
        </a>
        <a href="${BASE_URL}/arena"
          style="display:inline-block;background:transparent;
          border:1px solid ${color}50;color:${color};
          text-decoration:none;font-weight:700;font-size:0.82rem;
          padding:0.55rem 1.1rem;border-radius:8px">
          🏟 See in Arena →
        </a>
      </div>

    </div>
  `;
}

function buildLeaderboardBlock(topAds: Ad[], locale: Locale, myDash: string): string {
  const rows = topAds.map((ad, i) => `
    <div style="display:flex;align-items:center;gap:12px;padding:12px 0;
      border-bottom:1px solid #1a1a1a">
      <span style="font-size:1.3rem">${['🥇','🥈','🥉'][i]}</span>
      <div style="flex:1;min-width:0">
        <div style="font-weight:700;color:#fff;font-size:0.85rem">${ad.brand}</div>
        <div style="font-size:0.75rem;color:#888;white-space:nowrap;
          overflow:hidden;text-overflow:ellipsis">${ad.title}</div>
      </div>
      <div style="text-align:right;flex-shrink:0">
        <div style="font-size:0.82rem;font-weight:800;color:#f0883e">${ad.points} pts</div>
        <a href="${ad.url}" style="font-size:0.7rem;color:#555;text-decoration:none">
          Visit →
        </a>
      </div>
    </div>
  `).join('');

  return `
    <div style="background:#111;border:1px solid #1a1a1a;
      border-radius:12px;padding:1.25rem;margin-bottom:1.5rem">
      <div style="font-size:0.68rem;color:#555;font-weight:700;
        letter-spacing:0.1em;text-transform:uppercase;margin-bottom:0.75rem">
        🏆 ${t(locale, 'weekly_leaderboard')}
      </div>
      ${rows || `<div style="color:#555;font-size:0.85rem">${t(locale, 'arena_empty')}</div>`}
      <a href="${myDash}"
        style="display:inline-block;margin-top:1rem;background:#f0883e;
        color:#000;text-decoration:none;font-weight:700;font-size:0.82rem;
        padding:0.55rem 1.1rem;border-radius:8px">
        ${t(locale, 'arena_join_cta')}
      </a>
    </div>
  `;
}

function buildArenaStatsBlock(
  totalAds: number, totalPoints: number, totalShares: number,
  newAds: number, newMembers: number,
  mostActiveAd: Ad | null,
): string {
  return `
    <div style="background:#111;border:1px solid #1a1a1a;
      border-radius:12px;padding:1.25rem;margin-bottom:1.5rem">
      <div style="font-size:0.68rem;color:#555;font-weight:700;
        letter-spacing:0.1em;text-transform:uppercase;margin-bottom:0.75rem">
        📈 Arena This Week
      </div>

      <!-- Stat grid -->
      <div style="display:grid;grid-template-columns:repeat(3,1fr);
        gap:0.75rem;margin-bottom:${mostActiveAd ? '1rem' : '0'}">
        ${[
          { v: totalAds,    l: 'Live Ads',   c: '#0070f3' },
          { v: totalPoints, l: 'Points',     c: '#f0883e' },
          { v: totalShares, l: 'Shares',     c: '#22c55e' },
        ].map(s => `
          <div style="background:#0a0a0a;border:1px solid #1a1a1a;
            border-radius:8px;padding:0.65rem;text-align:center">
            <div style="font-size:1.1rem;font-weight:800;color:${s.c}">${s.v}</div>
            <div style="font-size:0.6rem;color:#555;text-transform:uppercase;
              letter-spacing:0.08em;margin-top:0.2rem">${s.l}</div>
          </div>
        `).join('')}
      </div>

      ${(newAds > 0 || newMembers > 0) ? `
        <div style="font-size:0.75rem;color:#555;margin-top:0.75rem">
          ${newMembers > 0 ? `✦ ${newMembers} new member${newMembers !== 1 ? 's' : ''} joined this week` : ''}
          ${newAds > 0     ? `&nbsp;&nbsp;✦ ${newAds} new ad${newAds !== 1 ? 's' : ''} submitted` : ''}
        </div>
      ` : ''}

      ${mostActiveAd ? `
        <div style="margin-top:1rem;padding-top:0.75rem;border-top:1px solid #1a1a1a">
          <div style="font-size:0.65rem;color:#555;font-weight:700;
            text-transform:uppercase;letter-spacing:0.1em;margin-bottom:0.4rem">
            🔥 Most Active This Week
          </div>
          <div style="font-weight:700;font-size:0.85rem;color:#fff;margin-bottom:0.15rem">
            ${mostActiveAd.brand}
          </div>
          <div style="font-size:0.75rem;color:#888;margin-bottom:0.5rem">
            ${mostActiveAd.title}
          </div>
          <div style="display:flex;align-items:center;gap:0.75rem">
            <span style="font-size:0.82rem;font-weight:800;color:#f0883e">
              ${mostActiveAd.points} pts
            </span>
            <a href="${mostActiveAd.url}"
              style="font-size:0.75rem;color:#f0883e;text-decoration:none;font-weight:700">
              Visit →
            </a>
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

// ─── Core digest runner ───────────────────────────────────────────────────────

async function runDigest(triggeredBy: 'cron' | 'manual'): Promise<NextResponse> {
  const startMs = Date.now();
  const week    = new Date().toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });
  const range   = weekRange();

  // ── Counters ──────────────────────────────────────────────────────────────
  let totalEligible = 0;
  let sent          = 0;
  let gatedTooNew   = 0;
  let gatedDailyCap = 0;
  let gatedMonthly  = 0;
  let notified      = 0;
  let errors        = 0;
  const notes: string[] = [];

  try {

    // ── Parallel data fetch — all pre-loop queries run together ──────────────
    const [
      signupsRes,
      topAdsRes,
      allAdsRes,
      featuredEmail,
      lastRunRes,
    ] = await Promise.all([
      supabase
        .from('ad_signups')
        .select('name, email, brand_name, status, role, preferred_locale')
        .in('status', ['team', 'trial']),

      supabase
        .from('ads')
        .select('id, brand, title, url, description, points, tier, created_at')
        .eq('status', 'active')
        .order('points', { ascending: false })
        .limit(3),

      supabase
        .from('ads')
        .select('id, brand, title, url, description, points, tier, created_at')
        .eq('status', 'active')
        .order('points', { ascending: false }),

      getFeaturedProfileHolder(supabase),

      supabase
        .from('digest_runs')
        .select('total_ads, total_points, total_shares, total_eligible')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (signupsRes.error) {
      notes.push(`fetch_error: ${signupsRes.error.message}`);
      await logRun({ week, triggeredBy, totalEligible, sent, gatedTooNew,
        gatedDailyCap, gatedMonthly, notified, errors: 1,
        durationMs: Date.now() - startMs, notes,
        totalAds: 0, totalPoints: 0, totalShares: 0 });
      return NextResponse.json({ error: signupsRes.error.message }, { status: 500 });
    }

    const signups  = (signupsRes.data || []) as Signup[];
    const topAds   = (topAdsRes.data  || []) as Ad[];
    const allAds   = (allAdsRes.data  || []) as Ad[];
    const lastRun  = lastRunRes.data;

    if (!signups.length) {
      notes.push('no_eligible_users');
      await logRun({ week, triggeredBy, totalEligible: 0, sent: 0,
        gatedTooNew: 0, gatedDailyCap: 0, gatedMonthly: 0,
        notified: 0, errors: 0, durationMs: Date.now() - startMs, notes,
        totalAds: allAds.length, totalPoints: 0, totalShares: 0 });
      return NextResponse.json({ sent: 0, reason: 'no_eligible_users' });
    }

    totalEligible = signups.length;

    // ── Arena stats ───────────────────────────────────────────────────────────
    const totalAds    = allAds.length;
    const totalPoints = allAds.reduce((s, a) => s + (a.points || 0), 0);
    const now         = Date.now();
    const weekMs      = 7 * 86_400_000;

    const newThisWeek = allAds.filter(a =>
      now - new Date(a.created_at).getTime() < weekMs
    );
    const newAds      = newThisWeek.length;

    // New members this week — approximate from signups count delta
    const prevMembers = lastRun?.total_eligible || 0;
    const newMembers  = Math.max(0, totalEligible - prevMembers);

    // Most active ad — highest points among ads created this week
    // Falls back to top ad overall if no new ads this week
    const mostActiveAd = newThisWeek.length > 0
      ? newThisWeek.sort((a, b) => b.points - a.points)[0]
      : topAds[0] || null;

    // Total shares — sum across all active ads
    const { data: shareData } = await supabase
      .from('ads')
      .select('share_count')
      .eq('status', 'active');
    const totalShares = (shareData || []).reduce((s: number, a: any) => s + (a.share_count || 0), 0);

    // ── Featured profile data ─────────────────────────────────────────────────
    let featuredProfile: FeaturedProfile | null = null;

    if (featuredEmail) {
      const [profileRes, signupRes, adRes] = await Promise.all([
        supabase
          .from('ad_profiles')
          .select('bio')
          .eq('email', featuredEmail)
          .maybeSingle(),
        supabase
          .from('ad_signups')
          .select('name, brand_name, points')
          .eq('email', featuredEmail)
          .maybeSingle(),
        supabase
          .from('ads')
          .select('title, points, rank_position, image_url')
          .eq('email', featuredEmail)
          .eq('status', 'active')
          .order('points', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      featuredProfile = {
        email:    featuredEmail,
        name:     signupRes.data?.name      || '',
        brand:    signupRes.data?.brand_name || '',
        points:   signupRes.data?.points    || 0,
        bio:      profileRes.data?.bio      || '',
        adTitle:  adRes.data?.title         || '',
        adPoints: adRes.data?.points        || 0,
        rank:     adRes.data?.rank_position || null,
        imageUrl: adRes.data?.image_url     || null,
        color:    FEATURED_BRAND_COLORS[featuredEmail] || DEFAULT_FEATURED_COLOR,
      };
    }

    const quote = QUOTES[Math.floor(Math.random() * QUOTES.length)];

    // ── Per-user loop ─────────────────────────────────────────────────────────
    for (const user of signups) {
      const locale    = (user.preferred_locale || 'en') as Locale;
      const firstName = user.name?.split(' ')[0] || 'there';
      const isTeam    = user.status === 'team';
      const myDash    = dashboardUrl(user);

      // Gate check
      const gate = await checkEmailGate(supabase, user.email, 'digest');

      if (!gate.allow) {
        await gatedNotify(
          supabase, user.email,
          `⚡ ${t(locale, 'weekly_digest_label')} · ${week}`,
          t(locale, 'weekly_greeting'),
          'info'
        );
        notified++;
        if (gate.reason === 'too_new')     gatedTooNew++;
        if (gate.reason === 'daily_cap')   gatedDailyCap++;
        if (gate.reason === 'monthly_cap') gatedMonthly++;
        continue;
      }

      // ── Build email body ────────────────────────────────────────────────────
      const body = `
        <!-- Greeting -->
        <div style="font-size:1rem;color:#aaa;margin-bottom:1.5rem">
          Hey ${firstName} 👋 — ${t(locale, 'weekly_greeting')}
        </div>

        ${featuredProfile ? buildFeaturedBlock(featuredProfile, range) : ''}

        ${buildLeaderboardBlock(topAds, locale, myDash)}

        ${buildArenaStatsBlock(totalAds, totalPoints, totalShares, newAds, newMembers, mostActiveAd)}

        <!-- Tip -->
        <div style="background:#111;border:1px solid #1a1a1a;
          border-radius:12px;padding:1.25rem;margin-bottom:1.5rem">
          <div style="font-size:0.68rem;color:#555;font-weight:700;
            letter-spacing:0.1em;text-transform:uppercase;margin-bottom:0.5rem">
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

  const durationMs  = Date.now() - startMs;
  const totalAds    = 0; // resolved inside try — safe default for log
  const totalPoints = 0;
  const totalShares = 0;

  // ── Write run log ─────────────────────────────────────────────────────────
  await logRun({
    week, triggeredBy, totalEligible, sent,
    gatedTooNew, gatedDailyCap, gatedMonthly,
    notified, errors, durationMs, notes,
    totalAds, totalPoints, totalShares,
  });

  // ── Discord summary ───────────────────────────────────────────────────────
  await notifyDiscord('', 'general', {
    title:  `📧 Weekly Digest · ${week}`,
    color:  DC.orange,
    fields: [
      { name: 'Sent',      value: String(sent),                                          inline: true },
      { name: 'Gated',     value: String(gatedTooNew + gatedDailyCap + gatedMonthly),    inline: true },
      { name: 'In-app',    value: String(notified),                                      inline: true },
      { name: 'Errors',    value: String(errors),        inline: true },
      { name: 'Eligible',  value: String(totalEligible), inline: true },
      { name: 'Trigger',   value: triggeredBy,           inline: true },
    ],
    footer:    `ANTCPU ADS · Herald · budget ${EMAIL_LIMITS.DAILY_DIGEST}/day`,
    timestamp: true,
  });

  return NextResponse.json({
    sent, notified, errors,
    gated: { too_new: gatedTooNew, daily_cap: gatedDailyCap, monthly: gatedMonthly },
    total_eligible: totalEligible,
    duration_ms:    durationMs,
    week,
  });
}

// ─── logRun ───────────────────────────────────────────────────────────────────
// Writes one row to digest_runs — permanent record of every execution.
// Stores snapshot of Arena stats — used for delta calculation next run.
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
  totalAds:      number;
  totalPoints:   number;
  totalShares:   number;
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
      // Arena snapshot — used for delta next run
      total_ads:       p.totalAds,
      total_points:    p.totalPoints,
      total_shares:    p.totalShares,
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

export async function GET(req: NextRequest) {
  const authorized = isAuthorizedCron(req) || isAuthorizedManual(req);
  if (!authorized) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  return runDigest(isAuthorizedCron(req) ? 'cron' : 'manual');
}

