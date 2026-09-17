// app/api/agent/route.ts
// ─── DEPRECATED — redirect stubs ─────────────────────────────────────────────
// GET  moved to: /api/agents/feed  (Sep 2026)
// POST moved to: /api/agents/action (Sep 2026)
// Remove after all callers are updated.
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const url    = new URL('/api/agents/feed', req.url);
  const token  = req.nextUrl.searchParams.get('token');
  if (token) url.searchParams.set('token', token);

  const res  = await fetch(url.toString());
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function POST(req: NextRequest) {
  const body   = await req.json().catch(() => ({}));
  const token  = req.nextUrl.searchParams.get('token');
  const url    = new URL('/api/agents/action', req.url);
  if (token) url.searchParams.set('token', token);

  const res  = await fetch(url.toString(), {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
