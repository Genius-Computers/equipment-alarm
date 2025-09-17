import { NextRequest, NextResponse } from 'next/server';
import { insertEquipment, listEquipmentPaginated } from '@/lib/db';
import { camelToSnakeCase, snakeToCamelCase } from '@/lib/utils';
import { getCurrentServerUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Number(searchParams.get('page') ?? '1');
    const pageSize = Number(searchParams.get('pageSize') ?? '50');
    const { rows, total } = await listEquipmentPaginated(page, pageSize);
    return NextResponse.json({
      data: rows.map((r) => snakeToCamelCase(r)),
      meta: { page, pageSize, total }
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentServerUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json();
    const newRow = await insertEquipment(
      camelToSnakeCase(body) as Parameters<typeof insertEquipment>[0],
      user.id,
    );
    return NextResponse.json({ data: snakeToCamelCase(newRow) }, { status: 201 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}


