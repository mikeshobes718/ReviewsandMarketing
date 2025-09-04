import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  // Gate app pages that should require auth
  const protectedPaths = [
    '/dashboard',
  ];
  if (protectedPaths.some((p) => pathname.startsWith(p))) {
    const token = req.cookies.get('idToken')?.value;
    if (!token) {
      const url = req.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('next', pathname);
      return NextResponse.redirect(url);
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard'],
};
