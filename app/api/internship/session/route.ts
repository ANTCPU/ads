// ============================================================
// app/api/internship/session/route.ts
// POST — Challenger presence ping
//
// Called from: antcpu.io/dashboard/, /dev/, /marketing/
// Frequency:   every 5 minutes while page is open
//
// Updates:
//   sessions.last_seen     — presence tracking
//   challengers.last_seen  — flag recalculation source
//   challengers.last_seen_at — duplicate col, keep in sync
//
// Also captures ip_country from Vercel header on first ping
// if sessions.ip_country is still null.
//
// Does NOT create sessions — register/route.ts owns that.
// Does NOT advance progress — progress/route.ts owns that.
// Does NOT write activity_log — too noisy for a ping.
//
// Returns: { ok, handle, last_seen } — lightweight
//
// v1 (Oct 2026):
//   — New file — session route was missing entirely
//   — Fixes sessions_active = 0 (all sessions frozen at signup)
//   — Fixes last_seen never updating on return visits
//   — Fixes flag recalculation having stale hrs_since data
//   — Captures ip_country from x-vercel-ip-country if null
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient }              from '@supabase/supabase-js';

// ─── Client ───────────────────────────────────────────────────
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ─── CORS ─────────────────────────────────────────────────────
const CORS = {
  'Access-Control-Allow-Origin':  'https://antcpu.io',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control':                'no-store',
};

// ─── Helpers ──────────────────────────────────────────────────
const ok  = (data: object)         => NextResponse.json(data,           { headers: CORS });
const err = (msg: string, s = 400) => NextResponse.json({ error: msg }, { status: s, headers: CORS });

// ─── OPTIONS ──────────────────────────────────────────────────
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

// ─── POST ─────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {

    // ── 1. Parse body ────────────────────────────────────────
    const body = await req.json();
    const { intern_id, session_id } = body;

    if (!intern_id) return err('intern_id required');

    // ── 2. Resolve challenger ────────────────────────────────
    const { data: challenger } = await supabase
  .from('challengers')
  .select('id, handle, intern_id')
  .eq('intern_id', intern_id)
  .eq('status', 'active')
  .maybeSingle();

    if (!challenger) return err('Challenger not found', 404);

    const now = new Date().toISOString();

    // ── 3. Update challengers.last_seen ──────────────────────
    // This is what flag recalculation reads for hrs_since
    try {
      await supabase
        .from('challengers')
        .update({
          last_seen:    now,
          last_seen_at: now,
          updated_at:   now,
        })
        .eq('intern_id', intern_id);
    } catch { /* non-fatal */ }

    // ── 4. Update sessions.last_seen ─────────────────────────
    // session_id passed from frontend cookie/localStorage
    // If no session_id — update by intern_id (most recent session)
    try {
      const sessionQuery = supabase
        .from('sessions')
        .update({ last_seen: now });

      if (session_id) {
        await sessionQuery.eq('id', session_id);
      } else {
        await sessionQuery
          .eq('intern_id', intern_id)
          .order('created_at', { ascending: false })
          .limit(1);
      }
    } catch { /* non-fatal */ }

    // ── 5. Capture ip_country if still null ──────────────────
    // Vercel injects x-vercel-ip-country on every request
    // Only write once — don't overwrite a known value
    const ipCountry = req.headers.get('x-vercel-ip-country');

    if (ipCountry) {
      try {
        await supabase
          .from('sessions')
          .update({ ip_country: ipCountry })
          .eq('intern_id', intern_id)
          .is('ip_country', null);
      } catch { /* non-fatal */ }
    }

    // ── 6. Return lightweight confirmation ───────────────────
    return ok({
      ok:        true,
      handle:    challenger.handle,
      intern_id,
      last_seen: now,
    });

  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    console.error('[internship/session] POST error:', message);
    return err(message, 500);
  }
}
