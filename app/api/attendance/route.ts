import { NextRequest, NextResponse } from 'next/server';
import { getCurrentServerUser } from '@/lib/auth';
import { logInAttendance, logOutAttendance, getTodayAttendance, getAttendanceForDate } from '@/lib/db';
import { formatStackUserLight } from '@/lib/utils';
import { canLogAttendance, UserRole } from '@/lib/types/user';

// GET: Get today's attendance for current user, or get attendance for a specific date (admin only)
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentServerUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');

    // If date is provided, return all attendance for that date (all roles except end_user)
    if (date) {
      const role: UserRole = (user.serverMetadata?.role ?? user.clientReadOnlyMetadata?.role);
      if (role === 'end_user') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      
      const records = await getAttendanceForDate(date);
      return NextResponse.json({ data: records });
    }

    // Otherwise, return today's attendance for the current user
    const attendance = await getTodayAttendance(user.id);
    return NextResponse.json({ data: attendance });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// POST: Log in or log out
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentServerUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only technicians, admins, and admin_x can log attendance
    const role: UserRole = (user.serverMetadata?.role ?? user.clientReadOnlyMetadata?.role);
    
    if (!canLogAttendance(role)) {
      return NextResponse.json({ error: 'Only technicians and admins can log attendance' }, { status: 403 });
    }

    const body = await req.json();
    const action = body.action; // 'login' or 'logout'

    if (action === 'login') {
      const userProfile = formatStackUserLight(user);
      const attendance = await logInAttendance(
        user.id,
        userProfile?.employeeId,
        userProfile?.displayName || user.primaryEmail || user.id
      );
      return NextResponse.json({ data: attendance }, { status: 201 });
    } else if (action === 'logout') {
      const attendance = await logOutAttendance(user.id);
      return NextResponse.json({ data: attendance });
    } else {
      return NextResponse.json({ error: 'Invalid action. Use "login" or "logout"' }, { status: 400 });
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

