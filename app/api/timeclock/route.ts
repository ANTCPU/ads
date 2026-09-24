// app/api/timeclock/route.ts
// ─── Timeclock API ────────────────────────────────────────────────────────────
// Proxy between nav.js and Supabase — credentials never leave the server.
//
// nav.js sends x-tc-secret header — validated here.
// Supabase service role key lives in Vercel env only — never in browser.
//
// Operations:
//   GET   — check for open session (punch_in with no punch_out)
//   POST  — punch in (close any open session first, open new one)
//   PATCH — punch out / heartbeat / auto-logout
//
// Auth: x-tc-secret header — scoped to this endpoint only.
//       Blast radius if leaked: can punch in/out on timeclock. Nothing else.
//
// CORS: restricted — antcpu.com + localhost only.
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// ── Supabase — service role — server only ─────────────────────────────────────
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ── Auth ──────────────────────────────────────────────────────────────────────
const TC_SECRET = process.env.TC_SECRET!;

// ── CORS — antcpu.com + localhost only ────────────────────────────────────────
// Timeclock is internal — no reason to allow arbitrary origins.
const ALLOWED_ORIGINS = [
  'https://antcpu.com',
  'http://localhost:3000',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
];

function corsHeaders(req: NextRequest) {
  const origin = req.headers.get('origin') || '';
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin':  allowed,
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-tc-secret',
  };
}

// ── Identity — hardcoded for now, extendable later ───────────────────────────
const IDENTITY = 'antcpu';

// ── Auth check ────────────────────────────────────────────────────────────────
function authorized(req: NextRequest): boolean {
  const secret = req.headers.get('x-tc-secret');
  if (!TC_SECRET || !secret) return false;
  return secret === TC_SECRET;
}

// ── OPTIONS — preflight ───────────────────────────────────────────────────────
export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}

// ── GET — check open session ──────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json(
      { error: 'unauthorized' },
      { status: 401, headers: corsHeaders(req) }
    );
  }

  try {
    const { data, error } = await supabase
      .from('time_clock')
      .select('*')
      .eq('identity', IDENTITY)
      .is('punch_out', null)
      .order('punch_in', { ascending: false })
      .limit(1);

    if (error) throw error;

    return NextResponse.json(
      { session: data?.[0] ?? null },
      { status: 200, headers: corsHeaders(req) }
    );

  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'unknown error';
    return NextResponse.json(
      { error: message, session: null },
      { status: 200, headers: corsHeaders(req) }
    );
  }
}

// ── POST — punch in ───────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json(
      { error: 'unauthorized' },
      { status: 401, headers: corsHeaders(req) }
    );
  }

  try {
    const now = new Date().toISOString();

    // Close any open sessions first
    await supabase
      .from('time_clock')
      .update({
        punch_out:    now,
        auto_logout:  true,
        note:         'auto-closed on new punch-in',
      })
      .eq('identity', IDENTITY)
      .is('punch_out', null);

    // Open new session
    const { data, error } = await supabase
      .from('time_clock')
      .insert({
        identity:  IDENTITY,
        source:    'nav-widget',
        punch_in:  now,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(
      { session: data },
      { status: 200, headers: corsHeaders(req) }
    );

  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'unknown error';
    return NextResponse.json(
      { error: message, session: null },
      { status: 200, headers: corsHeaders(req) }
    );
  }
}

// ── PATCH — punch out / heartbeat / auto-logout ───────────────────────────────
export async function PATCH(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json(
      { error: 'unauthorized' },
      { status: 401, headers: corsHeaders(req) }
    );
  }

  try {
    const body = await req.json() as {
      action?:       'punch_out' | 'heartbeat' | 'auto_logout';
      note?:         string;
      duration_mins?: number;
    };

    const now    = new Date().toISOString();
    const action = body.action ?? 'heartbeat';

    if (action === 'heartbeat') {
      // Update note only — keep session open
      const { error } = await supabase
        .from('time_clock')
        .update({ note: body.note ?? 'heartbeat: ' + now })
        .eq('identity', IDENTITY)
        .is('punch_out', null);

      if (error) throw error;

      return NextResponse.json(
        { ok: true, action: 'heartbeat' },
        { status: 200, headers: corsHeaders(req) }
      );
    }

    if (action === 'punch_out' || action === 'auto_logout') {
      // Get open session for duration calc
      const { data: open } = await supabase
        .from('time_clock')
        .select('id, punch_in')
        .eq('identity', IDENTITY)
        .is('punch_out', null)
        .order('punch_in', { ascending: false })
        .limit(1)
        .single();

      if (!open) {
        return NextResponse.json(
          { ok: true, action, note: 'no open session' },
          { status: 200, headers: corsHeaders(req) }
        );
      }

      const duration_mins = body.duration_mins
        ?? Math.round((Date.now() - new Date(open.punch_in).getTime()) / 60000);

      const { error } = await supabase
        .from('time_clock')
        .update({
          punch_out:     now,
          duration_mins,
          auto_logout:   action === 'auto_logout',
          note:          body.note ?? (action === 'auto_logout' ? 'auto-logout' : 'manual punch-out'),
        })
        .eq('id', open.id);

      if (error) throw error;

      return NextResponse.json(
        { ok: true, action, duration_mins },
        { status: 200, headers: corsHeaders(req) }
      );
    }

    return NextResponse.json(
      { error: 'unknown action: ' + action },
      { status: 400, headers: corsHeaders(req) }
    );

  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'unknown error';
    return NextResponse.json(
      { error: message },
      { status: 200, headers: corsHeaders(req) }
    );
  }
}
