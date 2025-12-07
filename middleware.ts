import { NextResponse } from 'next/server';

import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isHandlerRoute = pathname.startsWith('/handler/');

  // Let Stack handler routes (sign-in, sign-up, forgot-password, etc.) handle
  // their own auth logic without our redirects to avoid loops.
  if (isHandlerRoute) {
    return NextResponse.next();
  }

  // Consider the user "authenticated" at middleware level if we see any
  // Stack-related auth cookie. This is deliberately broad to avoid
  // false negatives due to project ID or cookie name changes.
  const hasStackSessionCookie = request.cookies
    .getAll()
    .some((c) => c.name.startsWith('stack-'));

  // For all other routes, require a Stack auth cookie and send unauthenticated
  // users to the sign-in screen.
  if (!hasStackSessionCookie) {
    return NextResponse.redirect(new URL('/handler/sign-in', request.url));
  }

  return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match only page routes, excluding:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - login
         * - otp
         * - any file extensions (images, css, js, etc.)
         */
        '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)',
    ],
};
