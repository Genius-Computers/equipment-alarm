import { NextResponse } from 'next/server';

import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const token = request.cookies.get(`stack-refresh-${process.env.NEXT_PUBLIC_STACK_PROJECT_ID}`);

  const pathname = request.nextUrl.pathname;
  const isHandlerRoute = pathname.startsWith('/handler/');

  // Let Stack handler routes (sign-in, sign-up, forgot-password, etc.) handle
  // their own auth logic without our redirects to avoid loops.
  if (isHandlerRoute) {
    return NextResponse.next();
  }

  // For all other routes, require a refresh token cookie and send unauthenticated
  // users to the sign-in screen.
  if (!token) {
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
