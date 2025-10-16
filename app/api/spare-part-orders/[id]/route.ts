import { NextRequest, NextResponse } from 'next/server';
import { getSparePartOrderById, updateSparePartOrder, softDeleteSparePartOrder, addSparePartOrderToInventory } from '@/lib/db';
import { getCurrentServerUser, getUserRole } from '@/lib/auth';
import { snakeToCamelCase } from '@/lib/utils';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentServerUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { id } = await params;
    const order = await getSparePartOrderById(id);
    
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    
    return NextResponse.json({ data: snakeToCamelCase(order) });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentServerUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { id } = await params;
    const body = await req.json();
    const { status, items, supervisorNotes, technicianNotes } = body;
    
    // Validate status transitions based on role
    const order = await getSparePartOrderById(id);
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    
    const role = getUserRole(user);
    const isSupervisor = role === 'supervisor' || role === 'admin' || role === 'admin_x';
    const isTechnician = role === 'technician' || role === 'admin';
    
    // Supervisors can create orders and complete them
    // Technicians can update pending orders and submit them for review
    if (status === 'Pending Supervisor Review' && !isTechnician) {
      return NextResponse.json({ error: 'Only technicians can submit orders for review' }, { status: 403 });
    }
    
    if ((status === 'Completed' || status === 'Approved') && !isSupervisor) {
      return NextResponse.json({ error: 'Only supervisors can complete/approve orders' }, { status: 403 });
    }
    
    const updatedRow = await updateSparePartOrder(
      id,
      status,
      JSON.stringify(items),
      supervisorNotes,
      technicianNotes,
      user.id,
    );
    
    // When order is completed, automatically add items to spare parts inventory
    if (status === 'Completed') {
      try {
        await addSparePartOrderToInventory(id, user.id);
        console.log(`[PATCH SparePartOrder] Successfully added order ${id} to inventory`);
      } catch (error) {
        console.error(`[PATCH SparePartOrder] Failed to add order to inventory:`, error);
        // Don't fail the request, just log the error
        // The order is still marked as completed
      }
    }
    
    return NextResponse.json({ data: snakeToCamelCase(updatedRow) });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentServerUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Only supervisors can delete orders
    const role = getUserRole(user);
    if (role !== 'supervisor' && role !== 'admin' && role !== 'admin_x') {
      return NextResponse.json({ error: 'Only supervisors can delete orders' }, { status: 403 });
    }
    
    const { id } = await params;
    await softDeleteSparePartOrder(id, user.id);
    
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

