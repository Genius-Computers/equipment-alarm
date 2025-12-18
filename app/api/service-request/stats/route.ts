import { NextRequest, NextResponse } from 'next/server';
import { getCurrentServerUser, getUserRole } from '@/lib/auth';
import { getServiceRequestStats } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentServerUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const scopeParam = searchParams.get('scope');
    const scope = scopeParam === 'pending' || scopeParam === 'completed' ? scopeParam : undefined;

    const role = getUserRole(user);
    const stats = await getServiceRequestStats(scope, user.id, role === 'technician');

    return NextResponse.json({ data: stats });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}









