import { NextRequest, NextResponse } from 'next/server';
import { getCurrentServerUser } from '@/lib/auth';
import { stackServerApp } from '@/stack';
import { formatStackUserLight } from '@/lib/utils';

export async function GET(req: NextRequest) {
  try {
    const me = await getCurrentServerUser(req);
    if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const data = formatStackUserLight(me);
    return NextResponse.json({ data });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const me = await getCurrentServerUser(req);
    if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const displayName = typeof body?.displayName === 'string' ? body.displayName : undefined;
    const phone = typeof body?.phone === 'string' ? body.phone : undefined;
    const designation = typeof body?.designation === 'string' ? body.designation : undefined;
    const department = typeof body?.department === 'string' ? body.department : undefined;

    if (displayName == null && phone == null && designation == null && department == null) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const user = await stackServerApp.getUser(me.id);
    if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await user.update({
      ...(displayName != null ? { displayName } : {}),
      clientReadOnlyMetadata: {
        ...(user.clientReadOnlyMetadata as Record<string, unknown> | undefined),
        ...(phone != null ? { phone } : {}),
        ...(designation != null ? { designation } : {}),
        ...(department != null ? { department } : {}),
      },
    });

    const updated = await stackServerApp.getUser(me.id);
    return NextResponse.json({ data: formatStackUserLight(updated) });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}


