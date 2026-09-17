// app/api/signup/route.ts
// ─── Arena Signup ─────────────────────────────────────────────────────────────
// Creates a new user in ad_signups.
// Called by VaultModal signup path — public, no auth required.
//
// v2 (Sep 2026):
//   — Discord notification on new signup — rich embed, new_signup event
//   — send-welcome called with full payload (name, brand, trialStatus, role)
//   — Idempotent — existing email returns ok:true so VaultModal proceeds
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient }              from '@supabase/supabase-js';
import { notifyDiscord, DC }         from '../../lib/discord';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://antcpu-ads.vercel.app';

export async function POST(req: NextRequest) {
  try {
    const { email, name, brand } = await req.json();

    if (!email || !name) {
      return NextResponse.json({ error: 'Email and name required.' }, { status: 400 });
    }

    const norm       = email.trim().toLowerCase();
    const cleanName  = name.trim();
    const cleanBrand = (brand || name).trim();

    // ── Idempotency check ─────────────────────────────────────────────────
    const { data: existing } = await supabase
      .from('ad_signups')
      .select('email, status')
      .eq('email', norm)
      .maybeSingle();

    if (existing) {
      // Already registered — VaultModal completeSession() handles the rest
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

    // ── Discord — rich embed, new_signup event ────────────────────────────
    notifyDiscord('', 'new_signup', {
      title:  '🆕 New Arena Member',
      color:  DC.green,
      fields: [
        { name: 'Name',   value: cleanName,  inline: true  },
        { name: 'Brand',  value: cleanBrand, inline: true  },
        { name: 'Source', value: '/mapofpi', inline: true  },
        { name: 'Email',  value: norm,       inline: false },
      ],
      footer:    'ANTCPU ADS · Signup',
      timestamp: true,
    }).catch(() => {});

    // ── Welcome email — full payload ──────────────────────────────────────
    fetch(`${BASE_URL}/api/send-welcome`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
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
