// ============================================================
// app/api/internship/register/route.ts
// POST — Internship challenger registration
//
// Writes to 3 tables in sequence:
// 1. ad_signups — Arena account (email-based, promo: INTERNSHIP)
// 2. ads — Intro post (auto-active, no Aria review needed)
// 3. challengers — Challenge record (week 1, early adopter)
//
// Then: day-aware confirmation email + Discord notify
//
// Email variants:
//   day 0    → pre-challenge (challenge starts Aug 1)
//   day 1    → standard welcome, full Week 1 ahead
//   day 2–4  → catch-up, compressed task list
//   day 5–6  → tight window, honest tone
//   day 7    → last day, do Days 1–2 now (10 min = 10%)
//   day 8+   → Week 1 closed, September cohort offer
//
// Called by: /internship/join (Step 3 submit)
// See DEV.md — The Internship Arena
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { notifyDiscord } from '../../../lib/discord';
import {
  getChallengeDay,
  getCatchUpTasks,
  getMaxAchievable,
  WEEK1_TASKS,
  type ChallengeTask,
} from '../../../lib/challengeDays';

// ─── Clients ─────────────────────────────────────────────────
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const resend = new Resend(process.env.RESEND_API_KEY);

// ─── Email helpers ────────────────────────────────────────────

const ACCENT = '#2563eb';
const BG     = '#0a0a0a';
const CARD   = '#111';
const BORDER = '#1a1a1a';

function emailHeader(trackIcon: string): string {
  return `
    <div style="text-align:center;margin-bottom:2rem">
      <div style="font-size:1.5rem;font-weight:800;color:${ACCENT}">⚡ antcpu.io</div>
      <div style="font-size:0.72rem;color:#555;margin-top:0.25rem;letter-spacing:0.1em;text-transform:uppercase">Human in the Loop · August 2026</div>
    </div>
    <div style="text-align:center;font-size:2.5rem;margin-bottom:1rem">${trackIcon}</div>
  `;
}

function emailFooter(): string {
  return `
    <div style="text-align:center;font-size:0.72rem;color:#333;border-top:1px solid ${BORDER};padding-top:1rem;margin-top:1.5rem">
      ⚡ antcpu.io · <a href="mailto:ads@antcpu.io" style="color:#555">ads@antcpu.io</a><br>
      <a href="https://antcpu-ads.vercel.app" style="color:#555">antcpu-ads.vercel.app</a>
    </div>
  `;
}

function taskRow(t: ChallengeTask, track: string, highlight = false): string {
  const eduLink = t.edu?.[track as 'dev' | 'marketing'];
  return `
    <div style="padding:0.75rem 0;border-bottom:1px solid ${BORDER}">
      <div style="display:flex;gap:0.75rem;align-items:flex-start">
        <div style="font-size:0.7rem;font-weight:800;color:${highlight ? ACCENT : '#555'};min-width:40px;padding-top:2px">Day ${t.day}</div>
        <div style="flex:1">
          <div style="font-weight:700;font-size:0.88rem;color:#fff;margin-bottom:0.2rem">${t.title}</div>
          <div style="font-size:0.75rem;color:#555">${t.time} · +${t.pct}%</div>
          ${eduLink ? `<div style="margin-top:0.3rem"><a href="${eduLink.url}" style="font-size:0.72rem;color:${ACCENT};text-decoration:none">🎓 ${eduLink.label} →</a></div>` : ''}
        </div>
        <a href="${t.url}" style="font-size:0.72rem;background:${ACCENT}20;color:${ACCENT};text-decoration:none;padding:0.25rem 0.6rem;border-radius:6px;border:1px solid ${ACCENT}40;white-space:nowrap;flex-shrink:0">${t.cta}</a>
      </div>
    </div>
  `;
}

function arenaBlock(): string {
  return `
    <div style="background:${CARD};border:1px solid ${ACCENT}30;border-radius:12px;padding:1.25rem;margin-top:1.25rem">
      <div style="font-size:0.7rem;color:#555;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:0.5rem">⚡ You're in the Arena</div>
      <div style="font-size:0.85rem;color:#aaa;margin-bottom:0.75rem">Your intro ad is live right now. Share it to earn your first points.</div>
      <div style="display:flex;gap:0.75rem;flex-wrap:wrap">
        <a href="https://antcpu-ads.vercel.app/internship/arena" style="display:inline-block;background:${ACCENT};color:#fff;text-decoration:none;font-weight:700;font-size:0.82rem;padding:0.6rem 1.25rem;border-radius:8px">Challenger Board →</a>
        <a href="https://antcpu-ads.vercel.app/arena" style="display:inline-block;background:${ACCENT}15;color:${ACCENT};text-decoration:none;font-weight:600;font-size:0.82rem;padding:0.6rem 1.25rem;border-radius:8px;border:1px solid ${ACCENT}30">Full Arena →</a>
      </div>
    </div>
  `;
}

// ─── Day-aware email builder ──────────────────────────────────

function buildEmail(params: {
  firstName: string;
  trackLabel: string;
  trackIcon: string;
  track: string;
  country: string;
  day: number;
}): { subject: string; html: string } {
  const { firstName, trackLabel, trackIcon, track, country, day } = params;
  const maxPct = getMaxAchievable(Math.max(1, day));
  const catchUp = getCatchUpTasks(Math.max(1, day));
  const isDev = track === 'dev';
  const eduWeek1 = isDev
    ? { label: 'Build Your First Website', url: 'https://antcpu.com/edu/classes/build-your-first-website/' }
    : { label: 'Logo Creation Basics', url: 'https://antcpu.com/edu/classes/logo-creation-basics/' };

  const wrap = (body: string) => `
    <!DOCTYPE html><html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
    <body style="margin:0;padding:0;background:${BG};font-family:system-ui,sans-serif;color:#fff">
    <div style="max-width:560px;margin:0 auto;padding:2rem 1.5rem">
      ${emailHeader(trackIcon)}
      ${body}
      ${arenaBlock()}
      ${emailFooter()}
    </div></body></html>
  `;

  // ── Pre-challenge (day 0) ──────────────────────────────────
  if (day === 0) {
    return {
      subject: `⚡ You're registered, ${firstName} — challenge starts August 1`,
      html: wrap(`
        <div style="background:${CARD};border:1px solid ${BORDER};border-radius:16px;padding:2rem;text-align:center;margin-bottom:1.5rem">
          <div style="font-size:1.4rem;font-weight:800;margin-bottom:0.5rem">You're registered, ${firstName}.</div>
          <div style="font-size:0.88rem;color:#aaa;margin-bottom:1.5rem">
            <strong style="color:#fff">${trackLabel}</strong> · <strong style="color:#fff">${country}</strong><br>
            Week 1 — Explorer · Founding Member ⭐
          </div>
          <div style="font-size:0.85rem;color:#555;margin-bottom:1.5rem">The challenge starts <strong style="color:#fff">August 1 at midnight EDT</strong>. Your dashboard unlocks automatically.</div>
          <a href="https://antcpu.io/challenge/" style="display:inline-block;background:${ACCENT};color:#fff;text-decoration:none;font-weight:800;font-size:0.9rem;padding:0.75rem 1.75rem;border-radius:10px">Preview Week 1 Tasks →</a>
        </div>
        <div style="background:${CARD};border:1px solid ${BORDER};border-radius:12px;padding:1.25rem">
          <div style="font-size:0.7rem;color:#555;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:0.75rem">Get a head start</div>
          <div style="padding:0.6rem 0;border-bottom:1px solid ${BORDER}">
            <a href="${eduWeek1.url}" style="font-size:0.85rem;color:${ACCENT};text-decoration:none">🎓 ${eduWeek1.label} — start now, free →</a>
            <div style="font-size:0.75rem;color:#555;margin-top:0.2rem">Week 1 EDU class for ${isDev ? 'Dev' : 'Marketing'} track. No signup needed.</div>
          </div>
        </div>
      `),
    };
  }

  // ── Day 1 — standard welcome ───────────────────────────────
  if (day === 1) {
    return {
      subject: `⚡ You're in, ${firstName} — Week 1 starts now`,
      html: wrap(`
        <div style="background:${CARD};border:1px solid ${BORDER};border-radius:16px;padding:2rem;text-align:center;margin-bottom:1.5rem">
          <div style="font-size:1.4rem;font-weight:800;margin-bottom:0.5rem">You're in, ${firstName}.</div>
          <div style="font-size:0.88rem;color:#aaa;margin-bottom:1.5rem">
            <strong style="color:#fff">${trackLabel}</strong> · <strong style="color:#fff">${country}</strong><br>
            Week 1 — Explorer · Founding Member ⭐
          </div>
          <a href="https://antcpu.io/challenge/" style="display:inline-block;background:${ACCENT};color:#fff;text-decoration:none;font-weight:800;font-size:0.9rem;padding:0.75rem 1.75rem;border-radius:10px">View Week 1 Tasks →</a>
        </div>
        <div style="background:${CARD};border:1px solid ${BORDER};border-radius:12px;padding:1.25rem;margin-bottom:1.25rem">
          <div style="font-size:0.7rem;color:#555;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:0.5rem">This week — Days 1–7</div>
          ${WEEK1_TASKS.map(t => taskRow(t, track, t.day === 1)).join('')}
        </div>
        <div style="background:${CARD};border:1px solid ${BORDER};border-radius:12px;padding:1.25rem">
          <div style="font-size:0.7rem;color:#555;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:0.5rem">🎓 Start learning today</div>
          <a href="${eduWeek1.url}" style="font-size:0.88rem;color:${ACCENT};text-decoration:none;font-weight:600">${eduWeek1.label} →</a>
          <div style="font-size:0.75rem;color:#555;margin-top:0.2rem">Free · No signup · Live sessions 1pm + 6pm EST Mon–Fri</div>
        </div>
      `),
    };
  }

  // ── Days 2–4 — catch-up, still very doable ─────────────────
  if (day >= 2 && day <= 4) {
    const missed = WEEK1_TASKS.filter(t => t.day < day);
    const missedMin = missed.reduce((s, t) => s + parseInt(t.time), 0);
    return {
      subject: `⚡ You're in, ${firstName} — you can still hit Week 1 by Sunday`,
      html: wrap(`
        <div style="background:${CARD};border:1px solid ${BORDER};border-radius:16px;padding:2rem;margin-bottom:1.5rem">
          <div style="font-size:1.4rem;font-weight:800;margin-bottom:0.5rem">You're in, ${firstName}.</div>
          <div style="font-size:0.88rem;color:#aaa;margin-bottom:0.75rem">
            <strong style="color:#fff">${trackLabel}</strong> · <strong style="color:#fff">${country}</strong> · Founding Member ⭐
          </div>
          <div style="background:#1a2a1a;border:1px solid #22c55e30;border-radius:8px;padding:0.75rem 1rem;font-size:0.85rem;color:#22c55e;margin-bottom:1rem">
            ✅ You joined on Day ${day}. You can still reach <strong>${maxPct}%</strong> by Sunday — that's the Explorer role on your CV.
          </div>
          ${missed.length > 0 ? `
          <div style="font-size:0.78rem;color:#555;margin-bottom:0.5rem">
            Days 1–${day - 1} take ~${missedMin} minutes combined. Do them first, then continue from today.
          </div>` : ''}
        </div>
        <div style="background:${CARD};border:1px solid ${BORDER};border-radius:12px;padding:1.25rem;margin-bottom:1.25rem">
          <div style="font-size:0.7rem;color:#555;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:0.5rem">Your catch-up path</div>
          ${catchUp.map((t, i) => taskRow(t, track, i === 0)).join('')}
        </div>
        <div style="background:${CARD};border:1px solid ${BORDER};border-radius:12px;padding:1.25rem">
          <div style="font-size:0.7rem;color:#555;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:0.5rem">🎓 ${isDev ? 'Dev' : 'Marketing'} class — start today</div>
          <a href="${eduWeek1.url}" style="font-size:0.88rem;color:${ACCENT};text-decoration:none;font-weight:600">${eduWeek1.label} →</a>
          <div style="font-size:0.75rem;color:#555;margin-top:0.2rem">Free · No signup · Directly feeds your Week 1 + Week 2 work</div>
        </div>
      `),
    };
  }

  // ── Days 5–6 — tight but honest ────────────────────────────
  if (day === 5 || day === 6) {
    const daysLeft = 8 - day;
    return {
      subject: `⚡ You're in, ${firstName} — ${daysLeft} day${daysLeft > 1 ? 's' : ''} left in Week 1`,
      html: wrap(`
        <div style="background:${CARD};border:1px solid ${BORDER};border-radius:16px;padding:2rem;margin-bottom:1.5rem">
          <div style="font-size:1.4rem;font-weight:800;margin-bottom:0.5rem">You're in, ${firstName}.</div>
          <div style="font-size:0.88rem;color:#aaa;margin-bottom:0.75rem">
            <strong style="color:#fff">${trackLabel}</strong> · <strong style="color:#fff">${country}</strong> · Founding Member ⭐
          </div>
          <div style="background:#1a1500;border:1px solid #f59e0b30;border-radius:8px;padding:0.75rem 1rem;font-size:0.85rem;color:#f59e0b;margin-bottom:1rem">
            ⏱ Week 1 closes Sunday Aug 7. You have ${daysLeft} day${daysLeft > 1 ? 's' : ''} left. Here's the fastest path to ${maxPct}%.
          </div>
        </div>
        <div style="background:${CARD};border:1px solid ${BORDER};border-radius:12px;padding:1.25rem;margin-bottom:1.25rem">
          <div style="font-size:0.7rem;color:#555;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:0.5rem">What you can still complete</div>
          ${catchUp.map((t, i) => taskRow(t, track, i === 0)).join('')}
        </div>
        <div style="background:${CARD};border:1px solid #333;border-radius:12px;padding:1rem;font-size:0.82rem;color:#555">
          Can't complete Week 1? You're still in the Arena and September cohort opens September 1 — you'll be first through the gate.
          <div style="margin-top:0.5rem"><a href="https://antcpu-ads.vercel.app/internship/waitlist" style="color:${ACCENT};text-decoration:none">September cohort →</a></div>
        </div>
      `),
    };
  }

  // ── Day 7 — last day ───────────────────────────────────────
  if (day === 7) {
    return {
      subject: `⚡ You're in, ${firstName} — today is the last day of Week 1`,
      html: wrap(`
        <div style="background:${CARD};border:1px solid ${BORDER};border-radius:16px;padding:2rem;margin-bottom:1.5rem">
          <div style="font-size:1.4rem;font-weight:800;margin-bottom:0.5rem">You're in, ${firstName}.</div>
          <div style="font-size:0.88rem;color:#aaa;margin-bottom:0.75rem">
            <strong style="color:#fff">${trackLabel}</strong> · <strong style="color:#fff">${country}</strong> · Founding Member ⭐
          </div>
          <div style="background:#1a0a00;border:1px solid #ef444430;border-radius:8px;padding:0.75rem 1rem;font-size:0.85rem;color:#ef4444;margin-bottom:1rem">
            🔴 Today is the last day of Week 1. Do Days 1–2 right now — that's 10 minutes and 10% + the Explorer role on your CV.
          </div>
        </div>
        <div style="background:${CARD};border:1px solid ${BORDER};border-radius:12px;padding:1.25rem;margin-bottom:1.25rem">
          <div style="font-size:0.7rem;color:#555;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:0.5rem">Do these now — 10 minutes</div>
          ${taskRow(WEEK1_TASKS[0], track, true)}
          ${taskRow(WEEK1_TASKS[1], track, false)}
          <div style="padding:0.75rem 0;font-size:0.78rem;color:#555">
            If you have more time — complete Days 3–7 for up to ${maxPct}% total.
          </div>
          ${catchUp.slice(2).map(t => taskRow(t, track, false)).join('')}
        </div>
        <div style="background:${CARD};border:1px solid #333;border-radius:12px;padding:1rem;font-size:0.82rem;color:#555">
          Week 2 starts tomorrow. September cohort opens September 1 for anyone who wants a full month.
          <div style="margin-top:0.5rem"><a href="https://antcpu-ads.vercel.app/internship/waitlist" style="color:${ACCENT};text-decoration:none">September cohort →</a></div>
        </div>
      `),
    };
  }

  // ── Day 8+ — Week 1 closed, September cohort ───────────────
  return {
    subject: `⚡ You're in the Arena, ${firstName} — September cohort is open`,
    html: wrap(`
      <div style="background:${CARD};border:1px solid ${BORDER};border-radius:16px;padding:2rem;text-align:center;margin-bottom:1.5rem">
        <div style="font-size:1.4rem;font-weight:800;margin-bottom:0.5rem">You're in, ${firstName}.</div>
        <div style="font-size:0.88rem;color:#aaa;margin-bottom:0.75rem">
          <strong style="color:#fff">${trackLabel}</strong> · <strong style="color:#fff">${country}</strong>
        </div>
        <div style="background:#111;border:1px solid #333;border-radius:8px;padding:0.75rem 1rem;font-size:0.85rem;color:#aaa;margin-bottom:1.5rem;text-align:left">
          Week 1 closed August 7. Your Arena intro ad is live and you're on the challenger board.<br><br>
          <strong style="color:#fff">September cohort opens September 1</strong> — you'll be first through the gate with full Week 1 ahead of you.
        </div>
        <div style="display:flex;gap:0.75rem;justify-content:center;flex-wrap:wrap">
          <a href="https://antcpu-ads.vercel.app/internship/waitlist" style="display:inline-block;background:${ACCENT};color:#fff;text-decoration:none;font-weight:800;font-size:0.9rem;padding:0.75rem 1.5rem;border-radius:10px">September Cohort →</a>
          <a href="https://antcpu-ads.vercel.app/internship/arena" style="display:inline-block;background:#1a1a1a;color:#fff;text-decoration:none;font-weight:700;font-size:0.9rem;padding:0.75rem 1.5rem;border-radius:10px;border:1px solid #333">Challenger Board →</a>
        </div>
      </div>
      <div style="background:${CARD};border:1px solid ${BORDER};border-radius:12px;padding:1.25rem">
        <div style="font-size:0.7rem;color:#555;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:0.75rem">While you wait — Week 1 preview</div>
        ${WEEK1_TASKS.map(t => taskRow(t, track, false)).join('')}
        <div style="padding:0.75rem 0;font-size:0.78rem;color:#555">These tasks open September 1. You'll know exactly what to do from day one.</div>
      </div>
    `),
  };
}

// ─── Route ───────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { name, email, country, track } = await req.json();

    if (!name?.trim() || !email?.trim() || !country?.trim() || !track) {
      return NextResponse.json(
        { error: 'Name, email, country and track are required.' },
        { status: 400 }
      );
    }

    if (!['dev', 'marketing'].includes(track)) {
      return NextResponse.json(
        { error: 'Track must be dev or marketing.' },
        { status: 400 }
      );
    }

    const cleanEmail  = email.trim().toLowerCase();
    const cleanName   = name.trim();
    const firstName   = cleanName.split(' ')[0];
    const trackLabel  = track === 'dev' ? '💻 Developer' : '📣 Marketer';
    const trackIcon   = track === 'dev' ? '💻' : '📣';
    const brandName   = `${cleanName} — ${trackLabel}`;

    // ── Duplicate check ──────────────────────────────────────
    const { data: existing } = await supabase
      .from('ad_signups')
      .select('id')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: 'This email is already registered in the Arena.' },
        { status: 409 }
      );
    }

    // ── 1. Write to ad_signups ───────────────────────────────
    const trialExpiry = new Date();
    trialExpiry.setDate(trialExpiry.getDate() + 31);

    const { data: signup, error: signupErr } = await supabase
      .from('ad_signups')
      .insert({
        name: cleanName,
        email: cleanEmail,
        brand_name: brandName,
        country,
        status: 'active',
        promo_code: 'INTERNSHIP',
        trial_days: 31,
        trial_expiry: trialExpiry.toLocaleDateString('en-US', {
          month: 'long', day: 'numeric', year: 'numeric',
        }),
        role: 'user',
      })
      .select('id')
      .single();

    if (signupErr) {
      return NextResponse.json({ error: signupErr.message }, { status: 500 });
    }

    // ── 2. Write to ads ──────────────────────────────────────
    const { data: ad, error: adErr } = await supabase
      .from('ads')
      .insert({
        email: cleanEmail,
        name: cleanName,
        brand: brandName,
        title: `👋 ${cleanName} — ${trackLabel} Challenger · ${country}`,
        description: `I just joined the antcpu.io Human in the Loop Internship Challenge. ${trackLabel} track. Week 1 — Explorer. 31 days. Real roles. Real CV. antcpu.io`,
        url: 'https://antcpu.io/challenge/',
        category: track === 'dev' ? 'Service Offering' : 'Brand Awareness',
        status: 'active',
        tier: 'entry',
        promo_code: 'INTERNSHIP',
        country,
        points: 0,
      })
      .select('id')
      .single();

    if (adErr) {
      console.error('Ad insert error:', adErr.message);
    }

    // ── 3. Write to challengers ──────────────────────────────
    const day = getChallengeDay();
    const cohort = day >= 8 ? 'september-2026' : 'august-2026';

    const { error: challengerErr } = await supabase
      .from('challengers')
      .insert({
        signup_email: cleanEmail,
        ad_id: ad?.id ?? null,
        name: cleanName,
        email: cleanEmail,
        country,
        track,
        week: 1,
        points: 0,
        role_title: 'Explorer',
        is_early_adopter: day <= 7,
        status: 'active',
        cohort,
      });

    if (challengerErr) {
      console.error('Challenger insert error:', challengerErr.message);
    }

    // ── 4. Day-aware confirmation email ──────────────────────
    const { subject, html } = buildEmail({
      firstName, trackLabel, trackIcon, track, country, day,
    });

    resend.emails.send({
      from: 'ANTCPU ADS <ads@antcpu.io>',
      to: cleanEmail,
      subject,
      html,
    }).catch(e => console.error('Resend error:', e));

    // ── 5. Discord notify ────────────────────────────────────
    const dayLabel = day === 0 ? 'pre-launch'
      : day <= 7  ? `Day ${day} · Week 1`
      : `Day ${day} · September cohort`;

    await notifyDiscord(
      `🎯 **New Challenger** — ${cleanName} · ${trackLabel} · ${country}\n` +
      `📧 ${cleanEmail} · ${dayLabel} · ${cohort === 'august-2026' ? 'Founding Member ⭐' : 'September Cohort'}\n` +
      `🔗 https://antcpu-ads.vercel.app/internship/arena`
    );

    // ── 6. Return success ────────────────────────────────────
    return NextResponse.json({
      success: true,
      signupId: signup.id,
      adId: ad?.id ?? null,
      day,
      cohort,
    });

  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    console.error('Internship register error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
