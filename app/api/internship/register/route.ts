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
// Called by: antcpu.io/apply/ (Step 4 submit)
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
// ... all email helper functions unchanged ...
// emailHeader, emailFooter, taskRow, arenaBlock, buildEmail
// ─────────────────────────────────────────────────────────────

// ─── Route ───────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {

    // ── Destructure full challenger object ───────────────────
    const {
      name,
      email,
      country,
      track,
      timezone,
      background,
      whyHere,
      portfolio,
      aiExp,
      availability,
      sessionId,
    } = await req.json();

    // ── Required field validation ────────────────────────────
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

    const cleanEmail = email.trim().toLowerCase();
    const cleanName  = name.trim();
    const firstName  = cleanName.split(' ')[0];
    const trackLabel = track === 'dev' ? '💻 Developer' : '📣 Marketer';
    const trackIcon  = track === 'dev' ? '💻' : '📣';
    const brandName  = `${cleanName} — ${trackLabel}`;

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
        name:         cleanName,
        email:        cleanEmail,
        brand_name:   brandName,
        country,
        status:       'active',
        promo_code:   'INTERNSHIP',
        trial_days:   31,
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
        email:      cleanEmail,
        name:       cleanName,
        brand:      brandName,
        title:      `👋 ${cleanName} — ${trackLabel} Challenger · ${country}`,
        description:`I just joined the antcpu.io Human in the Loop Internship Challenge. ${trackLabel} track. Week 1 — Explorer. 31 days. Real roles. Real CV. antcpu.io`,
        url:        'https://antcpu.io/challenge/',
        category:   track === 'dev' ? 'Service Offering' : 'Brand Awareness',
        status:     'active',
        tier:       'entry',
        promo_code: 'INTERNSHIP',
        country,
        points:     0,
      })
      .select('id')
      .single();

    if (adErr) {
      console.error('Ad insert error:', adErr.message);
    }

    // ── 3. Write to challengers ──────────────────────────────
    const day    = getChallengeDay();
    const cohort = day >= 8 ? 'september-2026' : 'august-2026';

    const { error: challengerErr } = await supabase
      .from('challengers')
      .insert({
        signup_email:     cleanEmail,
        ad_id:            ad?.id        ?? null,
        name:             cleanName,
        email:            cleanEmail,
        country,
        track,
        timezone:         timezone      ?? null,
        background:       background    ?? null,
        why_here:         whyHere       ?? null,
        portfolio:        portfolio     ?? null,
        ai_exp:           aiExp         ?? null,
        availability:     availability  ?? null,
        session_id:       sessionId     ?? null,
        week:             1,
        progress_pct:     5,
        points:           5,
        tasks_done:       1,
        submissions:      0,
        role_title:       'Explorer',
        is_early_adopter: day <= 7,
        status:           'active',
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
      from:    'ANTCPU ADS <ads@antcpu.io>',
      to:      cleanEmail,
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
      `🎒 Background: ${background ?? '—'} · AI: ${aiExp ?? '—'} · ${availability ?? '—'}/wk\n` +
      `🌐 Timezone: ${timezone ?? '—'} · Session: \`${sessionId ?? '—'}\`\n` +
      `🔗 https://antcpu-ads.vercel.app/internship/arena`
    );

    // ── 6. Return success ────────────────────────────────────
    return NextResponse.json({
      success:  true,
      signupId: signup.id,
      adId:     ad?.id ?? null,
      day,
      cohort,
    });

  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    console.error('Internship register error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
