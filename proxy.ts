import { NextRequest, NextResponse } from 'next/server';

// Admin-only routes — session required AND email checked inside the page
const ADMIN_ONLY = [
  '/dashboard/users',
  '/dashboard/antcpu',
  '/dashboard/agents',
  '/dashboard/admin',
  '/dashboard/new',
];

// Session-required routes — any logged-in user
const PROTECTED = [
  '/dashboard',
  '/create-ad',
  '/profile',
];

export function proxy(req: NextRequest) {
  const { pathname, hostname } = req.nextUrl;

  // Allow Vercel preview deployments through
  if (hostname.endsWith('.vercel.app') && hostname !== 'antcpu-ads.vercel.app') {
    return NextResponse.next();
  }

  // /profile/[id] is PUBLIC — anyone can view a shared profile link
  // Only /profile (the editor, exact match) requires a session
  if (pathname.startsWith('/profile/')) {
    return NextResponse.next();
  }

  // Check if route needs a session
  const needsSession =
    PROTECTED.some(p =>
      pathname === p || pathname.startsWith(p + '/')
    );

  if (!needsSession) return NextResponse.next();

  const session = req.cookies.get('arena_session');
  const preview = req.cookies.get('arena_preview');
  const testToken = req.nextUrl.searchParams.get('token');

  // autotest pass-through — token in URL bypasses middleware
  if (testToken === 'antcpu-test-2026') {
    const res = NextResponse.next();
    const expires = new Date(Date.now() + 90 * 864e5).toUTCString();
    res.cookies.set('arena_session', encodeURIComponent(JSON.stringify({
      name: 'Autotest', email: 'test@antcpu.com',
      brand: 'ANTCPU TEST', trialStatus: 'team'
    })), { path: '/', expires: new Date(Date.now() + 90 * 864e5), sameSite: 'lax' });
    res.cookies.set('arena_preview', 'test', {
      path: '/', expires: new Date(Date.now() + 90 * 864e5), sameSite: 'lax'
    });
    return res;
  }

  if (!session?.value && !preview?.value) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/create-ad',
    '/profile',
    '/profile/:path*',
  ],
};
