import { NextRequest, NextResponse } from 'next/server';
import { updateSparePart, softDeleteSparePart, getDb, ensureSchema } from '@/lib/db';
import { snakeToCamelCase } from '@/lib/utils';
import { getCurrentServerUser } from '@/lib/auth';
import { DbSparePart } from '@/lib/types';

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const user = await getCurrentServerUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json();

    // Fetch current spare part to merge partial updates
    const sql = getDb();
    await ensureSchema();
    const [current] = await sql`
      select * from spare_parts
      where id = ${id} and deleted_at is null
      limit 1
    `;
    
    if (!current) {
      return NextResponse.json({ error: 'Spare part not found' }, { status: 404 });
    }

    const currentPart = current as unknown as DbSparePart;

    const row = await updateSparePart(id, {
      name: body.name ?? currentPart.name,
      serial_number: body.serialNumber !== undefined ? body.serialNumber : currentPart.serial_number,
      quantity: body.quantity !== undefined ? body.quantity : currentPart.quantity,
      manufacturer: body.manufacturer !== undefined ? body.manufacturer : currentPart.manufacturer,
      supplier: body.supplier !== undefined ? body.supplier : currentPart.supplier,
    }, user.id);
    const camel = snakeToCamelCase(row);
    return NextResponse.json({ data: camel });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const user = await getCurrentServerUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const row = await softDeleteSparePart(id, user.id);
    if (!row) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}


