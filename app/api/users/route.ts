import { NextRequest, NextResponse } from 'next/server';
import { stackServerApp } from '@/stack';
import { canCreateUsers } from '@/lib/types/user';
import { getCurrentServerUser } from '@/lib/auth';
import { formatStackUserLight } from '@/lib/utils';

export async function POST(req: NextRequest) {
  try {
    const requester = await getCurrentServerUser(req);
    const role = (requester?.serverMetadata?.role ?? requester?.clientReadOnlyMetadata?.role) as string | undefined;

    // Bootstrap: allow first user creation if no users exist yet
    let allow = false;
    try {
      const users = await stackServerApp.listUsers({ limit: 1 });
      allow = (users?.length ?? 0) === 0;
    } catch {
      // ignore and fall back to normal checks
    }

    if (!allow && !canCreateUsers(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { email, password, displayName, role: newUserRole } = body ?? {};
    if (!email || !newUserRole) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const user = await stackServerApp.createUser({
      primaryEmail: email,
      // If password is omitted, user will set it via Forgot Password flow
      password: password || undefined,
      displayName,
      serverMetadata: { role: newUserRole },
      clientReadOnlyMetadata: { role: newUserRole },
      primaryEmailAuthEnabled: true,
      primaryEmailVerified: false,
    });

    return NextResponse.json({
      data: {
        id: user.id,
        email: user.primaryEmail,
        role: newUserRole,
        // Admins can share this page with the new user to set a password
        nextStepUrl: `/handler/forgot-password`,
      }
    }, { status: 201 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const requester = await getCurrentServerUser(req);
    if (!requester) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const onlyTechnicians = searchParams.get('onlyTechnicians') === 'true';

    const role = (requester?.serverMetadata?.role ?? requester?.clientReadOnlyMetadata?.role) as string | undefined;

    // Allow any authenticated user to list technicians (role === 'user')
    if (onlyTechnicians) {
      const users = await stackServerApp.listUsers({ limit: 100 });
      const data = users
        .map((u) => (formatStackUserLight(u)))
        .filter((u) => u && u.role === 'user');
      return NextResponse.json({ data });
    }

    // Otherwise, only admins can list all users
    if (!canCreateUsers(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const users = await stackServerApp.listUsers({ limit: 100 });
    const data = users.map((u) => (formatStackUserLight(u)));
    return NextResponse.json({ data });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}


