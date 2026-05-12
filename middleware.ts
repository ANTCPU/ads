import { NextRequest, NextResponse } from 'next/server';

const PROTECTED = [
  '/dashboard',
  '/dashboard/user',
  '/dashboard/new',
  '/dashboard/antcpu',
  '/dashboard/mapofpi',
  '/dashboard/agents',
  '/create-ad',
  '/profile',
];

export function middleware(req: NextRequest) {
  const { pathname, hostname } = req.nextUrl;

  // Allow Vercel preview deployments through
  if (hostname.endsWith('.vercel.app') && hostname !== 'antcpu-ads.vercel.app') {
    return NextResponse.next();
  }

  const isProtected = PROTECTED.some(p => pathname === p || pathname.startsWith(p + '/'));
  if (!isProtected) return NextResponse.next();

  const session = req.cookies.get('arena_session');
  const preview = req.cookies.get('arena_preview');
  if (!session?.value && !preview?.value) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/create-ad', '/profile'],
};
