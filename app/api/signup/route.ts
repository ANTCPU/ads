// app/api/signup/route.ts
// ─── Arena Signup ─────────────────────────────────────────────────────────────
// Creates a new user in ad_signups.
// Called by VaultModal signup path — public, no auth required.
//
// Inserts: email, name, brand_name, status='trial', role='user'
// Idempotent — returns 200 if email already exists (user can sign in instead).
// Fires welcome email via /api/send-welcome after insert.
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient }              from '@supabase/supabase-js';

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

    const norm = email.trim().toLowerCase();

    // ── Idempotency check — already exists? ───────────────────────────────
    const { data: existing } = await supabase
      .from('ad_signups')
      .select('email, status')
      .eq('email', norm)
      .maybeSingle();

    if (existing) {
      // Already registered — VaultModal will complete session normally
      return NextResponse.json({ ok: true, existing: true });
    }

    // ── Insert new user ───────────────────────────────────────────────────
    const { error } = await supabase
      .from('ad_signups')
      .insert({
        email:      norm,
        name:       name.trim(),
        brand_name: (brand || name).trim(),
        status:     'trial',
        role:       'user',
        created_at: new Date().toISOString(),
      });

    if (error) {
      return NextResponse.json({ error: 'Signup failed. Try again.' }, { status: 500 });
    }

    // ── Fire welcome email — non-blocking ─────────────────────────────────
    fetch(`${BASE_URL}/api/send-welcome`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email: norm, name: name.trim() }),
    }).catch(() => {});

    return NextResponse.json({ ok: true, existing: false });

  } catch {
    return NextResponse.json({ error: 'Bad request.' }, { status: 400 });
  }
}
