import { NextRequest, NextResponse } from 'next/server';

// ─── Session Set ──────────────────────────────────────────────────────────────
// Called from persistSession() in login/page.tsx after PIN verification.
// Sets arena_session as HttpOnly — not readable by JS, survives mobile Safari.
//
// sameSite: 'none' — required for cross-origin reads from antcpu.com/cloud/
// secure: true     — required when sameSite is 'none' (browser enforced)
// Both must be set together or the cookie is rejected by the browser.
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { email, name, brand, trialStatus, role } = await req.json();

    if (!email || !role) {
      return NextResponse.json(
        { ok: false, error: 'email and role required' },
        { status: 400 }
      );
    }

    const session = JSON.stringify({ email, name, brand, trialStatus, role });
    const maxAge  = (trialStatus === 'team' || role === 'super')
      ? 90 * 86400
      :  3 * 86400;

    const res = NextResponse.json({ ok: true });
    res.cookies.set('arena_session', session, {
      httpOnly: true,
      secure:   true,        // required — sameSite: 'none' demands secure
      sameSite: 'none',      // allows cross-origin sends from antcpu.com/cloud/
      maxAge,
      path:     '/',
    });
    return res;

  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'unknown error';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
