import { NextResponse } from 'next/server';

import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
    const token = request.cookies.get(`stack-refresh-${process.env.NEXT_PUBLIC_STACK_PROJECT_ID}`);


    // Allow unauthenticated access to Stack handler routes (e.g., forgot-password, verification)
    const isHandlerRoute = request.nextUrl.pathname.startsWith('/handler/');

    if (!token && !isHandlerRoute) {
        return NextResponse.redirect(new URL('/handler/sign-in', request.url));
    }
    // if has token and is at login screen then route to home

    if (token && (request.nextUrl.pathname === '/handler/sign-in' || request.nextUrl.pathname === '/handler/sign-up')) {
        return NextResponse.redirect(new URL('/', request.url));
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
