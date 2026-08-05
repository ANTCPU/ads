import { NextRequest, NextResponse } from 'next/server';

// ─── /api/me ──────────────────────────────────────────────────────────────────
// Public GET — reads arena_session HttpOnly cookie.
// Returns the logged-in user or { user: null } if no valid session.
//
// Used by antcpu.com/cloud/ to personalise the page for returning advertisers:
//   - Swap "Start Free Trial" → "Go to Dashboard"
//   - Show returning banner with name, brand, points
//   - Personalise gateway card
//
// CORS: explicitly allows antcpu.com so credentials: 'include' works
// cross-origin from the /cloud/ page.
//
// Called from checkReturningUser() in cloud/index.html — Phase 2 uncomment.
// ─────────────────────────────────────────────────────────────────────────────

const ALLOWED_ORIGINS = [
  'https://antcpu.com',
  'https://www.antcpu.com',
  'https://antcpu-ads.vercel.app',  // allow same-origin calls too
];

function corsHeaders(origin: string | null) {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin)
    ? origin
    : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin':      allowed,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods':     'GET, OPTIONS',
    'Access-Control-Allow-Headers':     'Content-Type',
  };
}

// ── OPTIONS preflight ────────────────────────────────────────────────────────
export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin');
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(origin),
  });
}

// ── GET ──────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const origin = req.headers.get('origin');
  const headers = corsHeaders(origin);

  try {
    const cookie = req.cookies.get('arena_session');

    // No session — return null user, not an error
    if (!cookie?.value) {
      return NextResponse.json(
        { user: null },
        { status: 200, headers }
      );
    }

    // Parse session — malformed cookie returns null user
    let session: {
      email:       string;
      name:        string;
      brand:       string;
      trialStatus: string;
      role:        string;
    };

    try {
      session = JSON.parse(cookie.value);
    } catch {
      return NextResponse.json(
        { user: null },
        { status: 200, headers }
      );
    }

    // Validate minimum required fields
    if (!session.email || !session.role) {
      return NextResponse.json(
        { user: null },
        { status: 200, headers }
      );
    }

    // Return user — cloud/index.html checkReturningUser() reads this
    return NextResponse.json(
      {
        user: {
          email:       session.email,
          name:        session.name        || '',
          brand:       session.brand       || '',
          trialStatus: session.trialStatus || 'trial',
          role:        session.role,
        },
      },
      { status: 200, headers }
    );

  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'unknown error';
    return NextResponse.json(
      { user: null, error: message },
      { status: 200, headers }   // always 200 — client handles null gracefully
    );
  }
}
