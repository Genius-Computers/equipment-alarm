import { NextRequest, NextResponse } from 'next/server';
import { getCurrentServerUser } from '@/lib/auth';
import { softDeleteLocation, getLocationById, getDb } from '@/lib/db';
import { snakeToCamelCase } from '@/lib/utils';

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const user = await getCurrentServerUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const location = await getLocationById(id);
    if (!location) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    }

    // Check if location has any equipment
    const sql = getDb();
    const equipmentCount = await sql`
      select count(*) as count
      from equipment
      where location = ${location.campus}
        and sub_location = ${location.name}
        and deleted_at is null
    `;
    
    const count = (equipmentCount[0] as { count: number }).count;
    if (count > 0) {
      return NextResponse.json({ 
        error: `Cannot delete location "${location.name}" because it contains ${count} equipment item(s). Please move or remove the equipment first.` 
      }, { status: 400 });
    }

    await softDeleteLocation(id, user.id);
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const user = await getCurrentServerUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const location = await getLocationById(id);
    if (!location) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    }

    const mapped = snakeToCamelCase(location);
    return NextResponse.json({ data: mapped });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}


