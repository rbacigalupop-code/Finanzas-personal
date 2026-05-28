import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';

/** Paths that never require authentication */
const PUBLIC_PREFIXES = ['/login', '/api/auth/'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public routes through
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  const user = await verifyToken(token);
  if (!user) {
    const res = NextResponse.redirect(new URL('/login', req.url));
    res.cookies.delete(COOKIE_NAME);
    return res;
  }

  // Inject user info into request headers for API routes
  const headers = new Headers(req.headers);
  headers.set('x-user-id',    String(user.userId));
  headers.set('x-user-name',  user.username);
  headers.set('x-user-dn',    user.displayName);
  headers.set('x-user-admin', user.isAdmin ? '1' : '0');

  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: [
    /*
     * Match everything except:
     * - _next/static (static files)
     * - _next/image  (image optimization)
     * - favicon.ico, icons/, manifest.json (PWA assets)
     */
    '/((?!_next/static|_next/image|favicon\\.ico|icons|manifest\\.json).*)',
  ],
};
