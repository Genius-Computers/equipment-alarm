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

    if (nextRole && !['admin', 'supervisor', 'technician', 'end_user'].includes(nextRole)) {
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


export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const requester = await getCurrentServerUser(req);
    const role = (requester?.serverMetadata?.role ?? requester?.clientReadOnlyMetadata?.role) as string | undefined;
    if (role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await ctx.params;
    const target = await stackServerApp.getUser(id);
    if (!target) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Try hard delete first if available; otherwise fall back to revoking access
    const anyTarget = target as unknown as { delete?: () => Promise<void>; update: (u: unknown) => Promise<void> };
    const anyApp = stackServerApp as unknown as { deleteUser?: (userId: string) => Promise<void> };

    if (typeof anyTarget.delete === 'function') {
      await anyTarget.delete();
      return NextResponse.json({ ok: true });
    }
    if (typeof anyApp.deleteUser === 'function') {
      await anyApp.deleteUser(id);
      return NextResponse.json({ ok: true });
    }

    // Fallback: revoke access by clearing role (ApprovalGate will block) 
    await target.update({
      clientReadOnlyMetadata: { ...(target.clientReadOnlyMetadata), role: undefined },
      serverMetadata: { ...(target.serverMetadata), role: undefined },
    });
    return NextResponse.json({ ok: true, fallback: true });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}


