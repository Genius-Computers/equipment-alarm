import { NextRequest, NextResponse } from 'next/server';
import { stackServerApp } from '@/stack';
import { canManageUsers } from '@/lib/types/user';
import { getCurrentServerUser } from '@/lib/auth';
import { formatStackUserLight } from '@/lib/utils';

export async function POST(req: NextRequest) {
  try {
    const requester = await getCurrentServerUser(req);
    const requesterRole = (requester?.serverMetadata?.role ?? requester?.clientReadOnlyMetadata?.role) as string | undefined;
    const canManage = canManageUsers(requesterRole);

    const body = await req.json();
    const { email, password, displayName, role: requestedRole } = body ?? {};
    if (!email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // For public sign-ups, enforce password strength if password provided
    if (!canManage && password) {
      const strong = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
      if (!strong.test(password)) {
        return NextResponse.json({ error: 'Password must be 8+ chars with letter and number' }, { status: 400 });
      }
    }

    // Public self-signup: no role assigned; Admins/Supervisors can assign role on creation
    const assignedRole = canManage ? requestedRole : undefined;

    const user = await stackServerApp.createUser({
      primaryEmail: email,
      // If password is omitted, user will set it via Forgot Password flow
      password: password || undefined,
      displayName,
      serverMetadata: assignedRole ? { role: assignedRole } : undefined,
      clientReadOnlyMetadata: assignedRole ? { role: assignedRole } : undefined,
      primaryEmailAuthEnabled: true,
      primaryEmailVerified: false,
    });

    return NextResponse.json({
      data: {
        id: user.id,
        email: user.primaryEmail,
        role: assignedRole ?? null,
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

    // Allow any authenticated user to list technicians (role === 'technician' or 'admin')
    if (onlyTechnicians) {
      const users = await stackServerApp.listUsers({ limit: 100 });
      const data = users
        .map((u) => (formatStackUserLight(u)))
        .filter((u) => u && (u.role === 'technician' || u.role === 'admin'));
      return NextResponse.json({ data });
    }

    // Otherwise, only admins and supervisors can list all users
    if (!canManageUsers(role)) {
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


