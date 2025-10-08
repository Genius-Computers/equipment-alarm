import { NextRequest, NextResponse } from 'next/server';
import { insertSparePart, listSparePartsPaginated } from '@/lib/db';
import { camelToSnakeCase, snakeToCamelCase } from '@/lib/utils';
import { getCurrentServerUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentServerUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const all = searchParams.get('all') === 'true';
    
    if (all) {
      // Return all spare parts without pagination for dropdowns
      const { rows } = await listSparePartsPaginated(1, 10000);
      const mapped = rows.map((r) => snakeToCamelCase(r));
      return NextResponse.json({ data: mapped });
    }

    const page = Number(searchParams.get('page') ?? '1');
    const pageSize = Number(searchParams.get('pageSize') ?? '10');
    const q = searchParams.get('q') || undefined;

    const { rows, total } = await listSparePartsPaginated(page, pageSize, q);

    const mapped = rows.map((r) => snakeToCamelCase(r));

    return NextResponse.json({
      data: mapped,
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
    const newRow = await insertSparePart(
      camelToSnakeCase(body) as Parameters<typeof insertSparePart>[0],
      user.id,
    );
    return NextResponse.json({ data: snakeToCamelCase(newRow) }, { status: 201 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}


