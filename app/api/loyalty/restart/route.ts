import { NextRequest, NextResponse } from 'next/server';
import { createClient }              from '@supabase/supabase-js';
import { awardBadge }                from '../../../lib/badges';

// ─── Loyalty Restart ──────────────────────────────────────────────────────────
// POST { email }
//
// Soft-expiry model — trial never hard-locks.
// Points and badges are preserved. Ad stays live read-only.
//
// Qualifies for restart if ALL true:
//   1. status = 'trial'
//   2. created_at < now - 3 days (trial period elapsed)
//   3. points > 0 (has engaged — earned something)
//
// On restart:
//   → SET status = 'active', trial_extended_at = now
//   → Award loyal-member badge
//   → Send in-app notification via /api/notify
//   → Fire Discord alert (admin visibility)
//
// Idempotent — safe to call multiple times.
// If already active or not yet expired → returns { ok: true, extended: false }
// ─────────────────────────────────────────────────────────────────────────────

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://antcpu-ads.vercel.app';
const TRIAL_DAYS = 3;

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ ok: false, error: 'email required' }, { status: 400 });

    const norm = email.trim().toLowerCase();

    // ── Fetch user ────────────────────────────────────────────────────────
    const { data: user, error: fetchErr } = await supabase
      .from('ad_signups')
      .select('email, name, status, created_at, points, trial_extended_at')
      .eq('email', norm)
      .maybeSingle();

    if (fetchErr || !user) {
      return NextResponse.json({ ok: false, error: 'User not found' }, { status: 404 });
    }

    // ── Already active — nothing to do ───────────────────────────────────
    if (user.status === 'active') {
      return NextResponse.json({ ok: true, extended: false, reason: 'already_active' });
    }

    // ── Check trial elapsed ───────────────────────────────────────────────
    const createdAt  = new Date(user.created_at);
    const now        = new Date();
    const daysSince  = (now.getTime() - createdAt.getTime()) / 86_400_000;

    if (daysSince < TRIAL_DAYS) {
      return NextResponse.json({ ok: true, extended: false, reason: 'trial_still_active' });
    }

    // ── Check engagement — must have points ───────────────────────────────
    if ((user.points || 0) === 0) {
      return NextResponse.json({ ok: true, extended: false, reason: 'no_engagement' });
    }

    // ── Restart — extend trial ────────────────────────────────────────────
    const { error: updateErr } = await supabase
      .from('ad_signups')
      .update({
        status:             'active',
        trial_extended_at:  now.toISOString(),
      })
      .eq('email', norm);

    if (updateErr) {
      return NextResponse.json({ ok: false, error: updateErr.message }, { status: 500 });
    }

    // ── Award loyal-member badge ──────────────────────────────────────────
    await awardBadge(supabase, norm, 'loyal-member');

    // ── In-app notification ───────────────────────────────────────────────
    const firstName = user.name?.split(' ')[0] || 'there';
    fetch(`${BASE_URL}/api/notify`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email:   norm,
        type:    'points',
        title:   '⚡ Trial Extended — 7 More Days',
        message: `Your points kept your ad alive, ${firstName}. You've earned a 7-day extension and the Loyal Member badge. Keep sharing to climb the Arena.`,
      }),
    }).catch(() => {});

    // ── Discord alert — admin visibility ─────────────────────────────────
    fetch(`${BASE_URL}/api/discord-notify`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: '',
        event:   'general',
        embed: {
          title:  '🔄 Loyalty Restart',
          color:  0xD4AF37,
          fields: [
            { name: 'User',   value: norm,                      inline: true  },
            { name: 'Points', value: String(user.points || 0),  inline: true  },
            { name: 'Days',   value: `${Math.floor(daysSince)}d elapsed`, inline: true },
          ],
          footer:    'ANTCPU ADS · Loyalty Engine',
          timestamp: true,
        },
      }),
    }).catch(() => {});

    return NextResponse.json({
      ok:      true,
      extended: true,
      badge:   'loyal-member',
      points:  user.points || 0,
    });

  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'unknown error';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
