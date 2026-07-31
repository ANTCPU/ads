// ============================================================
// app/api/internship/register/route.ts
// POST — Internship challenger registration
//
// Writes to 3 tables in sequence:
//   1. ad_signups  — Arena account (email-based, promo: INTERNSHIP)
//   2. ads         — Intro post (auto-active, no Aria review needed)
//   3. challengers — Challenge record (week 1, early adopter)
//
// Then: confirmation email + Discord notify
//
// Called by: /internship/join (Step 3 submit)
// See DEV.md — The Internship Arena
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { notifyDiscord } from '../../lib/discord';

// ─── Clients ─────────────────────────────────────────────────
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY);

// ─── Route ───────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { name, email, country, track } = await req.json();

    // ── Validate ────────────────────────────────────────────
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
    const brandName  = `${cleanName} — ${trackLabel}`;

    // ── Duplicate check ─────────────────────────────────────
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
    // Matches exact schema confirmed from Supabase:
    // name, email, brand_name, country, status, promo_code,
    // trial_days, trial_expiry, role
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
          month: 'long', day: 'numeric', year: 'numeric'
        }),
        role:         'user',
      })
      .select('id')
      .single();

    if (signupErr) {
      return NextResponse.json({ error: signupErr.message }, { status: 500 });
    }

    // ── 2. Write to ads ──────────────────────────────────────
    // Intro post — auto-active (no Aria review for structured
    // challenger intros). Matches confirmed ads schema.
    const { data: ad, error: adErr } = await supabase
      .from('ads')
      .insert({
        email:       cleanEmail,
        name:        cleanName,
        brand:       brandName,
        title:       `👋 ${cleanName} — ${trackLabel} Challenger · ${country}`,
        description: `I just joined the antcpu.io Human in the Loop Internship Challenge. ${trackLabel} track. Week 1 — Explorer. 31 days. Real roles. Real CV. antcpu.io`,
        url:         'https://antcpu.io/challenge/',
        category:    track === 'dev' ? 'Service Offering' : 'Brand Awareness',
        status:      'active',
        tier:        'entry',
        promo_code:  'INTERNSHIP',
        country,
        points:      0,
      })
      .select('id')
      .single();

    if (adErr) {
      // Non-fatal — log but don't block registration
      console.error('Ad insert error:', adErr.message);
    }

    // ── 3. Write to challengers ──────────────────────────────
    // All August 2026 cohort = founding members (is_early_adopter: true)
    const { error: challengerErr } = await supabase
      .from('challengers')
      .insert({
        signup_email:     cleanEmail,
        ad_id:            ad?.id ?? null,
        name:             cleanName,
        email:            cleanEmail,
        country,
        track,
        week:             1,
        points:           0,
        role_title:       'Explorer',
        is_early_adopter: true,
        status:           'active',
      });

    if (challengerErr) {
      console.error('Challenger insert error:', challengerErr.message);
    }

    // ── 4. Confirmation email ────────────────────────────────
    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:system-ui,sans-serif;color:#fff">
<div style="max-width:560px;margin:0 auto;padding:2rem 1.5rem">

  <!-- Header -->
  <div style="text-align:center;margin-bottom:2rem">
    <div style="font-size:1.5rem;font-weight:800;color:#2563eb">⚡ antcpu.io</div>
    <div style="font-size:0.72rem;color:#555;margin-top:0.25rem;letter-spacing:0.1em;text-transform:uppercase">Human in the Loop · August 2026</div>
  </div>

  <!-- Hero -->
  <div style="background:#111;border:1px solid #1a1a1a;border-radius:16px;padding:2rem;margin-bottom:1.5rem;text-align:center">
    <div style="font-size:2rem;margin-bottom:0.75rem">${track === 'dev' ? '💻' : '📣'}</div>
    <div style="font-size:1.4rem;font-weight:800;margin-bottom:0.5rem">You're in, ${firstName}.</div>
    <div style="font-size:0.88rem;color:#aaa;margin-bottom:1.5rem">
      <strong style="color:#fff">${trackLabel}</strong> · <strong style="color:#fff">${country}</strong><br>
      Week 1 — Explorer · Founding Member ⭐
    </div>
    <div style="display:flex;gap:0.75rem;justify-content:center;flex-wrap:wrap">
      <a href="https://antcpu.io/challenge/" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;font-weight:800;font-size:0.9rem;padding:0.75rem 1.5rem;border-radius:10px">
        Week 1 Tasks →
      </a>
      <a href="https://antcpu-ads.vercel.app/internship/arena" style="display:inline-block;background:#1a1a1a;color:#fff;text-decoration:none;font-weight:700;font-size:0.9rem;padding:0.75rem 1.5rem;border-radius:10px;border:1px solid #333">
        Challenger Board →
      </a>
    </div>
  </div>

  <!-- What happens next -->
  <div style="background:#111;border:1px solid #1a1a1a;border-radius:12px;padding:1.25rem;margin-bottom:1.5rem">
    <div style="font-size:0.7rem;color:#555;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:1rem">What Happens Now</div>
    ${[
      { n: '01', title: 'Your intro ad is live', desc: 'You\'re already in the Arena. Find yourself at antcpu-ads.vercel.app/internship/arena' },
      { n: '02', title: 'Week 1 starts today', desc: 'Explorer phase. Complete your first task at antcpu.io/challenge/' },
      { n: '03', title: 'You\'re a founding member', desc: 'August 2026 cohort. Early adopter status. This is the first cohort.' },
    ].map(s => `
    <div style="display:flex;gap:1rem;padding:0.75rem 0;border-bottom:1px solid #1a1a1a">
      <div style="font-size:0.7rem;font-weight:800;color:#2563eb;min-width:24px;padding-top:2px">${s.n}</div>
      <div>
        <div style="font-weight:700;font-size:0.88rem;margin-bottom:0.2rem">${s.title}</div>
        <div style="font-size:0.78rem;color:#555;line-height:1.5">${s.desc}</div>
      </div>
    </div>
    `).join('')}
  </div>

  <!-- Arena link -->
  <div style="background:#111;border:1px solid #2563eb30;border-radius:12px;padding:1.25rem;margin-bottom:1.5rem">
    <div style="font-size:0.7rem;color:#555;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:0.5rem">⚡ You're in the Arena</div>
    <div style="font-size:0.88rem;color:#aaa;margin-bottom:0.75rem">Your intro ad is live right now. Share it to earn your first points.</div>
    <a href="https://antcpu-ads.vercel.app/arena" style="display:inline-block;background:#2563eb15;color:#2563eb;text-decoration:none;font-weight:700;font-size:0.85rem;padding:0.6rem 1.25rem;border-radius:8px;border:1px solid #2563eb30">
      View the Arena →
    </a>
  </div>

  <!-- Footer -->
  <div style="text-align:center;font-size:0.72rem;color:#333;border-top:1px solid #1a1a1a;padding-top:1rem">
    ⚡ antcpu.io · <a href="mailto:ads@antcpu.io" style="color:#555">ads@antcpu.io</a><br>
    <a href="https://antcpu-ads.vercel.app" style="color:#555">antcpu-ads.vercel.app</a>
  </div>

</div>
</body>
</html>`;

    // Fire and forget — never blocks registration
    resend.emails.send({
      from:    'ANTCPU ADS <ads@antcpu.io>',
      to:      cleanEmail,
      subject: `⚡ You're in, ${firstName} — Week 1 starts now`,
      html,
    }).catch(e => console.error('Resend error:', e));

    // ── 5. Discord notify ────────────────────────────────────
    await notifyDiscord(
      `🎯 **New Challenger** — ${cleanName} · ${trackLabel} · ${country}\n📧 ${cleanEmail} · Week 1 · Explorer · Founding Member ⭐\n🔗 https://antcpu-ads.vercel.app/internship/arena`
    );

    // ── 6. Return success ────────────────────────────────────
    return NextResponse.json({
      success:  true,
      signupId: signup.id,
      adId:     ad?.id ?? null,
    });

  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    console.error('Internship register error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
