// ============================================================
// app/api/internship/challenger/profile/route.ts
// POST — Update challenger profile fields (Day 2 form)
// Writes to: challengers table (base table, not view)
// Called by: antcpu.io/dev/ and antcpu.io/marketing/
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const CORS = {
  'Access-Control-Allow-Origin':  'https://antcpu.io',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS });
}

export async function POST(req: NextRequest) {
  try {

    /* ── Parse body ─────────────────────────────── */
    const body = await req.json();

    const {
      challenger_id,
      github_handle,
      stack,
      ai_tool,
      timezone,
      portfolio,
      country,
      channels
    } = body;

    /* ── Validate ───────────────────────────────── */
    if (!challenger_id) {
      return NextResponse.json(
        { error: 'challenger_id is required' },
        { status: 400, headers: CORS }
      );
    }

    /* ── Build update payload ───────────────────── */
    // Only include fields that were sent and non-empty.
    // Never overwrite an existing value with blank.
    const updates: Record<string, string> = {};

    if (github_handle?.trim()) updates.github_handle = github_handle.trim();
    if (stack?.trim())         updates.stack          = stack.trim();
    if (ai_tool?.trim())       updates.ai_tool        = ai_tool.trim();
    if (timezone?.trim())      updates.timezone       = timezone.trim();
    if (portfolio?.trim())     updates.portfolio      = portfolio.trim();
    if (country?.trim())       updates.country        = country.trim();
    if (channels?.trim())      updates.channels       = channels.trim();

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400, headers: CORS }
      );
    }

    /* ── Write to challengers base table ────────── */
    // Try UUID id first, fall back to intern_id string.
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      .test(challenger_id);

    const { data, error } = isUuid
      ? await supabase
          .from('challengers')
          .update(updates)
          .eq('id', challenger_id)
          .select('id, intern_id, first_name, track, github_handle, stack, ai_tool, timezone, portfolio, country, channels, progress_pct, completed_gates')
          .single()
      : await supabase
          .from('challengers')
          .update(updates)
          .eq('intern_id', challenger_id)
          .select('id, intern_id, first_name, track, github_handle, stack, ai_tool, timezone, portfolio, country, channels, progress_pct, completed_gates')
          .single();

    if (error) throw error;

    if (!data) {
      return NextResponse.json(
        { error: 'Challenger not found' },
        { status: 404, headers: CORS }
      );
    }

    /* ── Return updated challenger ──────────────── */
    return NextResponse.json(
      { ok: true, challenger: data },
      { status: 200, headers: CORS }
    );

  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    console.error('[challenger/profile] POST error:', message);
    return NextResponse.json(
      { error: message },
      { status: 500, headers: CORS }
    );
  }
}
