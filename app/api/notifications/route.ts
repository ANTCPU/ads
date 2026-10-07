// app/api/notifications/route.ts
// ─── Deprecated — redirects to canonical internship notifications route ───────
// This route is no longer active. All notification reads go through:
// /api/internship/notifications
//
// Kept as a redirect to prevent 404s from any cached callers.
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const params = new URL(req.url).searchParams.toString();
  return NextResponse.redirect(
    `https://antcpu-ads.vercel.app/api/internship/notifications${params ? '?' + params : ''}`,
    { status: 301 }
  );
}
