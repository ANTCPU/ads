// app/api/doorbell/route.ts
// ─── Page view tracker ────────────────────────────────────────────────────────
// POST — records a page view to page_views table
// GET  — returns last 10 visits + total count (capped)
//
// v2 (Sep 2026):
//   — input sanitisation — page, ref, ua capped at safe lengths
//   — CORS headers — open, called from multiple antcpu properties
//   — OPTIONS handler — preflight support
//   — GET count capped — no full table scan
//   — email field captured if provided — ties view to known identity
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient }              from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Sanitise — cap all string inputs, never write raw unbounded user data
    const page  = String(body.page  || '/').slice(0, 200);
    const ref   = String(body.ref   || 'direct').slice(0, 200);
    const ts    = String(body.ts    || new Date().toISOString()).slice(0, 30);
    const ua    = String(body.ua    || 'unknown').slice(0, 300);
    const email = body.email
      ? String(body.email).trim().toLowerCase().slice(0, 200)
      : null;

    await supabase.from('page_views').insert([{ page, ref, ts, ua, email }]);

    return NextResponse.json({ received: true }, { headers: CORS });

  } catch {
    return NextResponse.json({ error: 'bad request' }, { status: 400, headers: CORS });
  }
}

export async function GET() {
  try {
    // Recent views — no full table scan, no exact count
    const { data } = await supabase
      .from('page_views')
      .select('page, ref, ts, email')
      .order('ts', { ascending: false })
      .limit(50);

    return NextResponse.json({
      recent: data || [],
    }, { headers: CORS });

  } catch {
    return NextResponse.json({ recent: [] }, { headers: CORS });
  }
}
