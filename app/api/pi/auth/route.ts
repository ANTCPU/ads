// ─── Pi Auth Route ────────────────────────────────────────────────────────────
// POST /api/pi/auth
// Called client-side after Pi.authenticate() succeeds.
// Verifies token → upserts ad_signups → sets session cookie.
// Parallel to /api/user-auth — same session output shape.
// Placeholder — not yet implemented.
// ─────────────────────────────────────────────────────────────────────────────

// app/api/pi/auth/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const PI_API_KEY = process.env.PI_API_KEY!;

export async function POST(req: NextRequest) {
  try {
    const { accessToken, uid, username } = await req.json();

    if (!accessToken || !uid) {
      return NextResponse.json({ error: 'Missing token or uid' }, { status: 400 });
    }

    // 1. Verify token server-side with Pi Platform API
    const piRes = await fetch('https://api.minepi.com/v2/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-Pi-App-Key': PI_API_KEY,
      },
    });

    if (!piRes.ok) {
      return NextResponse.json({ error: 'Pi token verification failed' }, { status: 401 });
    }

    const piUser = await piRes.json();

    // 2. Confirm uid matches — prevents token swap attacks
    if (piUser.uid !== uid) {
      return NextResponse.json({ error: 'UID mismatch' }, { status: 401 });
    }

    const email = `pi_${uid}@pi.antcpu.com`; // synthetic email for Pi users
    const now   = new Date().toISOString();

    // 3. Upsert into ad_signups
    const { data: existing } = await supabase
      .from('ad_signups')
      .select('email, role, status, name, brand_name, trial_status')
      .eq('pi_uid', uid)
      .maybeSingle();

    if (existing) {
      // Returning Pi user — refresh username + wallet
      await supabase
        .from('ad_signups')
        .update({
          pi_username: piUser.username || username,
          pi_wallet_address: piUser.wallet_address || null,
          last_login: now,
        })
        .eq('pi_uid', uid);
    } else {
      // New Pi user — create account
      await supabase.from('ad_signups').insert({
        email,
        name: piUser.username || username || 'Pi Pioneer',
        brand_name: piUser.username || username || 'Pi Pioneer',
        role: 'user',
        status: 'arena',
        trial_status: 'trial',
        auth_method: 'pi',
        pi_uid: uid,
        pi_username: piUser.username || username,
        pi_wallet_address: piUser.wallet_address || null,
        created_at: now,
        last_login: now,
      });
    }

    // 4. Build session object — same shape as email login
    const sessionUser = {
      email:       existing?.email || email,
      name:        existing?.name  || piUser.username || username || 'Pi Pioneer',
      brand:       existing?.brand_name || piUser.username || username || 'Pi Pioneer',
      role:        existing?.role  || 'user',
      trialStatus: existing?.trial_status || 'trial',
      authMethod:  'pi',
      piUsername:  piUser.username || username,
    };

    // 5. Set session cookie — same as email login
    await fetch(`${req.nextUrl.origin}/api/session/set`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sessionUser),
    });

    return NextResponse.json({ ok: true, user: sessionUser });

  } catch (err) {
    console.error('[Pi Auth]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
