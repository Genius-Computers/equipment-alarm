import { NextRequest, NextResponse } from 'next/server';
import { getServiceRequestsBySparePartId } from '@/lib/db';
import { snakeToCamelCase } from '@/lib/utils';
import { getCurrentServerUser } from '@/lib/auth';

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const user = await getCurrentServerUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[API /spare-parts/[id]/service-requests] Fetching service requests for spare part ID:', id);
    const rows = await getServiceRequestsBySparePartId(id);
    console.log('[API /spare-parts/[id]/service-requests] Raw rows:', rows.length);
    const data = rows.map((r) => snakeToCamelCase(r));
    console.log('[API /spare-parts/[id]/service-requests] Returning', data.length, 'service requests');

    return NextResponse.json({ data });
  } catch (error: unknown) {
    console.error('[API /spare-parts/[id]/service-requests] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

