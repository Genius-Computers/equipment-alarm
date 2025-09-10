import { NextRequest, NextResponse } from 'next/server';
import { insertEquipment, listEquipment } from '@/lib/db';
import { camelToSnakeCase, snakeToCamelCase } from '@/lib/utils';

export async function GET() {
  try {
    const rows = await listEquipment();
    return NextResponse.json({ data: rows.map(snakeToCamelCase) });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const newRow = await insertEquipment(camelToSnakeCase(body) as Parameters<typeof insertEquipment>[0]);
    return NextResponse.json({ data: snakeToCamelCase(newRow) }, { status: 201 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}


