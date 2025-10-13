import { NextRequest, NextResponse } from 'next/server';
import { getJobOrderById } from '@/lib/db';
import { stackServerApp } from '@/stack';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await stackServerApp.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const jobOrder = await getJobOrderById(id);

    if (!jobOrder) {
      return NextResponse.json({ error: 'Job order not found' }, { status: 404 });
    }

    // Parse items if it's a string, otherwise use as-is (JSONB returns as object)
    const parsedItems = typeof jobOrder.items === 'string' 
      ? JSON.parse(jobOrder.items) 
      : jobOrder.items;

    return NextResponse.json({
      id: jobOrder.id,
      orderNumber: jobOrder.order_number,
      campus: jobOrder.campus,
      sublocation: jobOrder.sublocation,
      items: parsedItems,
      status: jobOrder.status,
      submittedBy: jobOrder.submitted_by,
      submittedAt: jobOrder.submitted_at,
      createdAt: jobOrder.created_at,
    });
  } catch (error) {
    console.error('Error fetching job order:', error);
    return NextResponse.json(
      { error: 'Failed to fetch job order' },
      { status: 500 }
    );
  }
}

// PATCH endpoint removed - job orders are created as submitted directly

