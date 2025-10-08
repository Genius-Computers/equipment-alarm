import { NextRequest, NextResponse } from 'next/server';
import { updateSparePart, softDeleteSparePart } from '@/lib/db';
import { snakeToCamelCase } from '@/lib/utils';
import { getCurrentServerUser } from '@/lib/auth';

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const user = await getCurrentServerUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json();

    const row = await updateSparePart(id, {
      name: body.name,
      serial_number: body.serialNumber,
      quantity: body.quantity,
      manufacturer: body.manufacturer,
      supplier: body.supplier
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


