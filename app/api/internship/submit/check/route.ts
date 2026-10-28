// ============================================================
// app/api/internship/submit/check/route.ts
// GET ?url= — Server-side URL verifier (avoids client CORS)
//
// Returns:
//   { ok: true,  status: 200, reachable: true  }
//   { ok: false, status: 404, reachable: false }
//   { ok: false, status: 0,   reachable: false, error: '...' }
//
// Used by SubmitClient to verify PLAN.md + campaign URLs
// ============================================================

import { NextRequest, NextResponse } from 'next/server';

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control':                'no-store',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get('url')?.trim();

  if (!url) {
    return NextResponse.json(
      { ok: false, reachable: false, error: 'url param required' },
      { status: 400, headers: CORS }
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json(
      { ok: false, reachable: false, status: 0, error: 'Invalid URL' },
      { headers: CORS }
    );
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return NextResponse.json(
      { ok: false, reachable: false, status: 0, error: 'Only http/https allowed' },
      { headers: CORS }
    );
  }

  try {
    const controller = new AbortController();
    const timeout    = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(parsed.toString(), {
      method:  'HEAD',
      signal:  controller.signal,
      headers: { 'User-Agent': 'antcpu-submit-checker/1.0' },
      redirect: 'follow',
    });

    clearTimeout(timeout);

    const reachable = res.status >= 200 && res.status < 400;
    const isGithub  = parsed.hostname.includes('github.com') ||
                      parsed.hostname.includes('raw.githubusercontent.com');
    const isPlan    = parsed.pathname.toLowerCase().includes('plan') &&
                      parsed.pathname.toLowerCase().endsWith('.md');

    return NextResponse.json(
      { ok: reachable, reachable, status: res.status, is_github: isGithub, is_plan: isPlan, url: parsed.toString() },
      { headers: CORS }
    );

  } catch (err: unknown) {
    const msg       = err instanceof Error ? err.message : 'Fetch failed';
    const isTimeout = msg.includes('abort') || msg.includes('timeout');

    return NextResponse.json(
      { ok: false, reachable: false, status: 0, error: isTimeout ? 'Request timed out' : msg, url: parsed.toString() },
      { headers: CORS }
    );
  }
}
