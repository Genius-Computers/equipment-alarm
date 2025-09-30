import { NextRequest, NextResponse } from 'next/server';
import { listEquipmentCache } from '@/lib/db';
import { snakeToCamelCase } from '@/lib/utils';
import { getCurrentServerUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentServerUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { rows } = await listEquipmentCache();
    // Return camelCase objects for client cache usage
    const data = rows.map((r) => snakeToCamelCase(r));
    return NextResponse.json({ data });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
