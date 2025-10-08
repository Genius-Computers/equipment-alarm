import { NextRequest, NextResponse } from 'next/server';
import { getDb, ensureSchema } from '@/lib/db';
import { getCurrentServerUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentServerUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { items } = body as { items: Array<{ name: string; serialNumber?: string; quantity: number; manufacturer?: string; supplier?: string }> };

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'No items provided' }, { status: 400 });
    }

    const sql = getDb();
    await ensureSchema();

    const names = items.map((i) => i.name ?? "");
    const serialNumbers = items.map((i) => i.serialNumber ?? null);
    const quantities = items.map((i) => i.quantity ?? 0);
    const manufacturers = items.map((i) => i.manufacturer ?? null);
    const suppliers = items.map((i) => i.supplier ?? null);

    const rows = await sql`
      insert into spare_parts (
        created_at, created_by,
        name, serial_number, quantity, manufacturer, supplier
      )
      select
        now(), ${user.id},
        t.name, t.serial_number, t.quantity, t.manufacturer, t.supplier
      from unnest(
        ${names}::text[],
        ${serialNumbers}::text[],
        ${quantities}::int[],
        ${manufacturers}::text[],
        ${suppliers}::text[]
      ) as t(
        name, serial_number, quantity, manufacturer, supplier
      )
      returning *`;

    return NextResponse.json({ data: rows }, { status: 201 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

