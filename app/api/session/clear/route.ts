import { NextResponse } from 'next/server';

// ─── Session Clear ────────────────────────────────────────────────────────────
// Called from clearSessionCookie() in lib/session.ts on logout.
// Clears the HttpOnly arena_session cookie server-side.
// ─────────────────────────────────────────────────────────────────────────────

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set('arena_session', '', {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   0,
    path:     '/',
  });
  return res;
}
