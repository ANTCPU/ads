import { NextRequest, NextResponse } from 'next/server';

// ─── Route tiers ──────────────────────────────────────────────────────────────
const SUPER_ONLY = [
  '/dashboard/admin',
  '/dashboard/antcpu',
  '/dashboard/agents',
  '/dashboard/users',
];

const PROTECTED = [
  '/dashboard',
  '/create-ad',
  '/profile',
];

// ─── Middleware ───────────────────────────────────────────────────────────────
export function middleware(req: NextRequest) {
  const { pathname, hostname } = req.nextUrl;

  // Allow Vercel preview deployments through
  if (hostname.endsWith('.vercel.app') && hostname !== 'antcpu-ads.vercel.app') {
    return NextResponse.next();
  }

  // /profile/[id] is PUBLIC — shared profile links work without login
  if (pathname.startsWith('/profile/')) {
    return NextResponse.next();
  }

  // Autotest pass-through — token in URL bypasses middleware
  const testToken = req.nextUrl.searchParams.get('token');
  if (testToken === 'antcpu-test-2026') {
    const res = NextResponse.next();
    res.cookies.set('arena_session', JSON.stringify({
      name: 'Autotest', email: 'test@antcpu.com',
      brand: 'ANTCPU TEST', trialStatus: 'team', role: 'user',
    }), {
      path: '/',
      maxAge: 90 * 86400,
      sameSite: 'lax',
      httpOnly: true,
      secure: true,
    });
    return res;
  }

  const needsSession = PROTECTED.some(p =>
    pathname === p || pathname.startsWith(p + '/')
  );

  if (!needsSession) return NextResponse.next();

  // ── Read session cookie ───────────────────────────────────────────────────
  const cookie = req.cookies.get('arena_session');

  if (!cookie?.value) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  // ── Parse session + enforce role on super-only routes ────────────────────
  try {
    const session = JSON.parse(decodeURIComponent(cookie.value));

    const isSuperOnly = SUPER_ONLY.some(p =>
      pathname === p || pathname.startsWith(p + '/')
    );

    if (isSuperOnly && session.role !== 'super') {
      return NextResponse.redirect(new URL('/dashboard/user', req.url));
    }

    return NextResponse.next();

  } catch {
    // Corrupt cookie — clear and redirect to login
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    const res = NextResponse.redirect(url);
    res.cookies.set('arena_session', '', { maxAge: 0, path: '/' });
    return res;
  }
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/create-ad',
    '/profile',
    '/profile/:path*',
  ],
};
