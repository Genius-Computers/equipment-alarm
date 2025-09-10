import { NextRequest, NextResponse } from 'next/server';
import { stackServerApp } from '@/stack';
import { getCurrentServerUser } from '@/lib/auth';

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const requester = await getCurrentServerUser(req);
    const role = (requester?.serverMetadata?.role ?? requester?.clientReadOnlyMetadata?.role) as string | undefined;
    if (role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await ctx.params;
    const target = await stackServerApp.getUser(id);
    if (!target) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const body = await req.json();
    const nextRole = (body?.role as string | undefined) || undefined;

    if (nextRole && !['admin', 'supervisor', 'user'].includes(nextRole)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    await target.update({
      clientReadOnlyMetadata: { ...(target.clientReadOnlyMetadata), role: nextRole },
      serverMetadata: { ...(target.serverMetadata), role: nextRole },
    });

    return NextResponse.json({ data: { id: target.id, role: nextRole } });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}


