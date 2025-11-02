import { NextRequest, NextResponse } from 'next/server';
import { ensureSchema } from '@/lib/db/schema';
import { getDb } from '@/lib/db/connection';
import { getCurrentServerUser, ensureRole } from '@/lib/auth';
import { getNextTicketId } from '@/lib/db/service-requests';

export async function POST(req: NextRequest) {
  try {
    await ensureSchema();

    const user = await getCurrentServerUser(req);
    ensureRole(user, ['admin', 'admin_x']);

    const body = await req.json().catch(() => ({}) as Record<string, unknown>);
    const confirm: string | undefined = body?.confirm as string | undefined;
    const scope: 'all' | 'current-year' = body?.scope === 'current-year' ? 'current-year' : 'all';

    if (confirm !== 'RESET') {
      return NextResponse.json(
        { success: false, message: "Missing or invalid confirmation. Send { confirm: 'RESET' }." },
        { status: 400 }
      );
    }

    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { success: false, message: 'This endpoint is disabled in production.' },
        { status: 403 }
      );
    }

    const sql = getDb();

    await sql`begin`;
    try {
      if (scope === 'current-year') {
        const yy = String(new Date().getFullYear()).slice(-2);
        await sql`delete from service_request where ticket_id like ${yy + '-%'};`;
      } else {
        await sql`delete from service_request;`;
      }

      await sql`delete from job_orders;`;

      await sql`commit`;
    } catch (error) {
      await sql`rollback`;
      throw error;
    }

    const nextTicket = await getNextTicketId(new Date());

    return NextResponse.json({
      success: true,
      message: 'Service requests and job orders cleared.',
      nextTicketPreview: nextTicket,
    });
  } catch (error) {
    console.error('[ADMIN RESET] Failed:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Reset failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'POST to this endpoint with { confirm: "RESET" } to clear job orders and service requests. Admin only. Disabled in production.',
  });
}



