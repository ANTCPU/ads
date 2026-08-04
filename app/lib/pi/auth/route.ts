// ─── Pi Auth Route ────────────────────────────────────────────────────────────
// POST /api/pi/auth
// Called by the client after Pi.authenticate() succeeds.
// Verifies token → upserts ad_signups → sets session cookie.
// Parallel to /api/user-auth — same session output shape.
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { PiMeResponse, PiAuthResult } from '../../lib/pi/types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  // TODO: const { accessToken, user } = await req.json();

  // TODO: verify token — GET https://api.minepi.com/v2/me
  //       with Authorization: Bearer <accessToken>
  //       cast response as PiMeResponse
  //       if uid mismatch → return 401

  // TODO: upsert ad_signups
  //       match on pi_uid
  //       on insert → role: 'trial', auth_method: 'pi', status: 'arena'
  //       on update → refresh pi_username, pi_wallet_address

  // TODO: set HttpOnly session cookie
  //       call /api/session/set with ArenaSession shape
  //       same cookie logic as /api/user-auth

  // TODO: return PiAuthResult

  return NextResponse.json({ ok: false, error: 'Not implemented' }, { status: 501 });
}
