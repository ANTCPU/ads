// ─── Pi Auth Route ────────────────────────────────────────────────────────────
// POST /api/pi/auth
// Called client-side after Pi.authenticate() succeeds.
// Verifies token → upserts ad_signups → sets session cookie.
// Parallel to /api/user-auth — same session output shape.
// Placeholder — not yet implemented.
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { PiMeResponse, PiAuthResult } from '../../lib/pi/types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  // TODO: const { accessToken, user } = await req.json()
  // TODO: verify token — GET https://api.minepi.com/v2/me Bearer <accessToken>
  // TODO: confirm response uid matches user.uid — reject if mismatch
  // TODO: upsert ad_signups on pi_uid
  //       insert → role: 'trial', auth_method: 'pi', status: 'arena'
  //       update → refresh pi_username, pi_wallet_address
  // TODO: set HttpOnly session cookie via /api/session/set
  // TODO: return PiAuthResult shape

  return NextResponse.json({ ok: false, error: 'Not implemented' }, { status: 501 });
}
