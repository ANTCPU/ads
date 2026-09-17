// app/api/signup/route.ts
// ─── Arena Signup ─────────────────────────────────────────────────────────────
// Creates a new user in ad_signups.
// Called by VaultModal signup path — public, no auth required.
//
// v3 (Sep 2026):
//   — arena-original badge awarded on every new join (idempotent, fire-and-forget)
//   — in-app notification fires on badge award — loyalty loop trigger
//   — Discord Source field now reads from request body, falls back to 'organic'
//
// v2 (Sep 2026):
//   — Discord notification on new signup — rich embed, new_signup event
//   — send-welcome called with full payload (name, brand, trialStatus, role)
//   — Idempotent — existing email returns ok:true so VaultModal proceeds
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient }              from '@supabase/supabase-js';
import { notifyDiscord, DC }         from '../../lib/discord';
import { awardBadge }                from '../../lib/badges';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://antcpu-ads.vercel.app';

export async function POST(req: NextRequest) {
  try {
    const { email, name, brand, source } = await req.json();

    if (!email || !name) {
      return NextResponse.json({ error: 'Email and name required.' }, { status: 400 });
    }

    const norm        = email.trim().toLowerCase();
    const cleanName   = name.trim();
    const cleanBrand  = (brand || name).trim();
    const cleanSource = (source || 'organic').trim();

    // ── Idempotency check ─────────────────────────────────────────────────
    // Existing user — VaultModal completeSession() handles the rest.
    // Do NOT re-award badge or re-send welcome on repeat calls.

    const { data: existing } = await supabase
      .from('ad_signups')
      .select('email, status')
      .eq('email', norm)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ ok: true, existing: true });
    }

    // ── Insert new user ───────────────────────────────────────────────────

    const { error } = await supabase
      .from('ad_signups')
      .insert({
        email:      norm,
        name:       cleanName,
        brand_name: cleanBrand,
        status:     'trial',
        role:       'user',
        created_at: new Date().toISOString(),
      });

    if (error) {
      return NextResponse.json({ error: 'Signup failed. Try again.' }, { status: 500 });
    }

    // ── Arena Original badge ──────────────────────────────────────────────
    // Awarded once, on first join, forever.
    // There is only one Arena. This marks the founding members.
    // awardBadge is idempotent — safe on retry, never duplicates.

    awardBadge(supabase, norm, 'arena-original').catch(() => {});

    // ── In-app notification — loyalty loop trigger ────────────────────────
    // First thing the user sees when they open their envelope.
    // Drives them to their profile → sees badge → feels invested → shares.

    fetch(`${BASE_URL}/api/notify`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email:   norm,
        type:    'info',
        title:   '🔥 Arena Original badge awarded',
        message: 'You joined before 100 members. There is only one Arena — and you were here first.',
      }),
    }).catch(() => {});

    // ── Discord — rich embed, new_signup event ────────────────────────────

    notifyDiscord('', 'new_signup', {
      title:  '🆕 New Arena Member',
      color:  DC.green,
      fields: [
        { name: 'Name',   value: cleanName,   inline: true  },
        { name: 'Brand',  value: cleanBrand,  inline: true  },
        { name: 'Source', value: cleanSource, inline: true  },
        { name: 'Email',  value: norm,        inline: false },
      ],
      footer:    'ANTCPU ADS · Signup',
      timestamp: true,
    }).catch(() => {});

    // ── Welcome email — full payload ──────────────────────────────────────

    fetch(`${BASE_URL}/api/send-welcome`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email:            norm,
        name:             cleanName,
        brand:            cleanBrand,
        trialStatus:      'trial',
        role:             'user',
        preferred_locale: 'en',
      }),
    }).catch(() => {});

    return NextResponse.json({ ok: true, existing: false });

  } catch {
    return NextResponse.json({ error: 'Bad request.' }, { status: 400 });
  }
}
