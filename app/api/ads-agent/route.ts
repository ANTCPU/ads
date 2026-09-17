// app/api/ads-agent/route.ts
// ─── DEPRECATED — redirect stub ───────────────────────────────────────────────
// Moved to: /api/agents/run (Sep 2026)
// This stub forwards all POST requests to the new route.
// Remove after all callers are updated to /api/agents/run.
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const url  = new URL('/api/agents/run', req.url);

  const res = await fetch(url.toString(), {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
