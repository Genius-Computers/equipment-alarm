import { NextRequest, NextResponse } from 'next/server';
import { createSparePartOrder, listSparePartOrders } from '@/lib/db';
import { getCurrentServerUser, getUserRole } from '@/lib/auth';
import { snakeToCamelCase } from '@/lib/utils';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentServerUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get('status') || undefined;

    const rows = await listSparePartOrders(statusFilter);
    const mapped = rows.map((r) => snakeToCamelCase(r));

    return NextResponse.json({ data: mapped });
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
    
    // Check if user is a supervisor
    const role = getUserRole(user);
    if (role !== 'supervisor' && role !== 'admin' && role !== 'admin_x') {
      return NextResponse.json({ error: 'Only supervisors can create orders' }, { status: 403 });
    }
    
    const body = await req.json();
    const { items, supervisorNotes } = body;
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Items are required' }, { status: 400 });
    }
    
    const newRow = await createSparePartOrder(
      JSON.stringify(items),
      supervisorNotes,
      user.id,
    );
    
    return NextResponse.json({ data: snakeToCamelCase(newRow) }, { status: 201 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

