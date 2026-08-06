// app/api/pi/auth/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { notifyDiscord } from '../../../lib/discord';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const PI_API_KEY = process.env.PI_API_KEY!;
const BASE_URL   = process.env.NEXT_PUBLIC_APP_URL || 'https://antcpu-ads.vercel.app';

export async function POST(req: NextRequest) {
  try {
    const { accessToken, uid, username } = await req.json();

    // ── Guard ──────────────────────────────────────────────────────────────
    if (!accessToken || !uid) {
      notifyDiscord(`⚠️ **Pi Auth** — missing token or uid\n**uid:** ${uid || 'none'}`);
      return NextResponse.json({ error: 'Missing token or uid' }, { status: 400 });
    }

    notifyDiscord(`π **Pi Auth attempt**\n**username:** ${username || '?'}\n**uid:** ${uid}`);

    // ── 1. Verify token with Pi Platform ──────────────────────────────────
    const piRes = await fetch('https://api.minepi.com/v2/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-Pi-App-Key':  PI_API_KEY,
      },
    });

    if (!piRes.ok) {
      const errText = await piRes.text().catch(() => piRes.status.toString());
      notifyDiscord(`❌ **Pi Auth failed** — Pi /v2/me rejected\n**uid:** ${uid}\n**status:** ${piRes.status}\n**body:** ${errText}`);
      return NextResponse.json({ error: 'Pi token verification failed' }, { status: 401 });
    }

    const piUser = await piRes.json();

    // ── 2. UID guard — prevents token swap attacks ─────────────────────────
    if (piUser.uid !== uid) {
      notifyDiscord(`🚨 **Pi Auth UID mismatch**\n**claimed:** ${uid}\n**verified:** ${piUser.uid}`);
      return NextResponse.json({ error: 'UID mismatch' }, { status: 401 });
    }

    const piUsername     = piUser.username || username || 'Pi Pioneer';
    const piWallet       = piUser.wallet_address || null;
    const syntheticEmail = `pi_${uid}@pi.antcpu.com`;
    const now            = new Date().toISOString();

    // ── 3. Upsert ad_signups ───────────────────────────────────────────────
    const { data: existing } = await supabase
      .from('ad_signups')
      .select('email, role, status, name, brand_name, points')
      .eq('pi_uid', uid)
      .maybeSingle();

    if (existing) {
      // Returning Pi user — refresh Pi fields + last_login
      await supabase
        .from('ad_signups')
        .update({
          pi_username:       piUsername,
          pi_wallet_address: piWallet,
          last_login:        now,
        })
        .eq('pi_uid', uid);

      notifyDiscord(`✅ **Pi Login — returning user**\n**username:** ${piUsername}\n**email:** ${existing.email}\n**pts:** ${existing.points || 0}`);

    } else {
      // New Pi user — create account
      await supabase.from('ad_signups').insert({
        email:             syntheticEmail,
        name:              piUsername,
        brand_name:        piUsername,
        role:              'user',
        status:            'trial',
        auth_method:       'pi',
        pi_uid:            uid,
        pi_username:       piUsername,
        pi_wallet_address: piWallet,
        created_at:        now,
        last_login:        now,
      });

      notifyDiscord(`🆕 **Pi Login — new user**\n**username:** ${piUsername}\n**uid:** ${uid}\n**wallet:** ${piWallet || 'none'}`);

      // Fire welcome notification in-app
      fetch(`${BASE_URL}/api/notify`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email:   syntheticEmail,
          type:    'nudge',
          title:   '🎉 Welcome to the Arena, Pi Pioneer',
          message: `You're in. Create your first ad and Aria will have it live within hours. Every share earns points — the ladder starts now.`,
        }),
      }).catch(() => {});
    }

    // ── 4. Build session — minimal, matches session/set expectations ───────
    const sessionUser = {
      email:       existing?.email || syntheticEmail,
      name:        existing?.name  || piUsername,
      brand:       existing?.brand_name || piUsername,
      trialStatus: existing?.status || 'trial',
      role:        existing?.role   || 'user',
    };

    // ── 5. Set HttpOnly session cookie ─────────────────────────────────────
    const cookieRes = await fetch(`${BASE_URL}/api/session/set`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(sessionUser),
    });

    if (!cookieRes.ok) {
      notifyDiscord(`⚠️ **Pi Auth** — session/set failed\n**username:** ${piUsername}\n**status:** ${cookieRes.status}`);
      // Non-fatal — client still gets the user object and sets localStorage
    }

    // ── 6. Return session + Pi identity to client ──────────────────────────
    return NextResponse.json({
      ok:   true,
      user: {
        ...sessionUser,
        pi_uid:            uid,
        pi_username:       piUsername,
        pi_wallet_address: piWallet,
        auth_method:       'pi',
      },
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    notifyDiscord(`💥 **Pi Auth — unhandled error**\n${msg}`);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
