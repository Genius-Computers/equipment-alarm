import { NextRequest, NextResponse } from 'next/server';
import { createJobOrder, listJobOrdersPaginated } from '@/lib/db';
import { getCurrentServerUser } from '@/lib/auth';
import { isValidCampus } from '@/lib/config';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentServerUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '10', 10);
    const status = searchParams.get('status') || undefined;

    const result = await listJobOrdersPaginated(page, pageSize, status);

    // Parse items from JSON string (or use as-is if already object)
    const data = result.data.map(order => ({
      id: order.id,
      orderNumber: order.order_number,
      campus: order.campus,
      sublocation: order.sublocation,
      items: typeof order.items === 'string' ? JSON.parse(order.items) : order.items,
      status: order.status,
      submittedBy: order.submitted_by,
      submittedAt: order.submitted_at,
      createdAt: order.created_at,
    }));

    return NextResponse.json({
      ...result,
      data,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentServerUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { 
      campus, 
      sublocation, 
      equipmentIds, 
      requestType, 
      priority, 
      scheduledAt,
      assignedTechnicianId,
      assignedTechnicianIds: rawAssignedTechnicianIds,
      notes
    } = body;

    if (!campus || !sublocation || !equipmentIds || !Array.isArray(equipmentIds)) {
      return NextResponse.json(
        { error: 'Invalid request body - missing campus, sublocation, or equipmentIds' },
        { status: 400 }
      );
    }

    if (!requestType || !priority || !scheduledAt) {
      return NextResponse.json(
        { error: 'Invalid request body - missing requestType, priority, or scheduledAt' },
        { status: 400 }
      );
    }

    // Validate campus
    if (!isValidCampus(campus)) {
      return NextResponse.json(
        { error: `Invalid campus: "${campus}". Only Main Campus and AJA Complex are supported.` },
        { status: 400 }
      );
    }

    // Note: sublocation is now the location name (from the new locations table)
    // No validation needed - it's just a reference to what location the equipment is in
    const { listEquipmentPaginated, getNextTicketId } = await import('@/lib/db');

    // Fetch equipment details for the items
    
    const equipmentResult = await listEquipmentPaginated(1, 10000);
    
    // Note: listEquipmentPaginated returns { rows, total } not { data, total }
    const dbEquipment = equipmentResult?.rows || [];

    if (!dbEquipment || !Array.isArray(dbEquipment) || dbEquipment.length === 0) {
      return NextResponse.json(
        { error: 'No equipment found in database' },
        { status: 500 }
      );
    }

    const items = [];
    let firstTicketNumber = '';
    
    for (const eqId of equipmentIds) {
      const equipment = dbEquipment.find(eq => eq.id === eqId);
      
      if (equipment) {
        // Generate a ticket number for each equipment
        const ticketNumber = await getNextTicketId();
        
        // Save the first ticket number for the job order ID
        if (!firstTicketNumber) {
          firstTicketNumber = ticketNumber;
        }
        
        items.push({
          equipmentId: equipment.id,
          equipmentName: equipment.name,
          partNumber: equipment.part_number || '',
          serialNumber: equipment.serial_number || '',
          ticketNumber,
        });
      }
    }

    if (items.length === 0) {
      return NextResponse.json(
        { error: 'No valid equipment items found' },
        { status: 400 }
      );
    }

    const itemsJson = JSON.stringify(items);

    // Normalize technicians: support both legacy single assignedTechnicianId and new assignedTechnicianIds[]
    const normalizedAssignedTechnicianIds: string[] = Array.isArray(rawAssignedTechnicianIds)
      ? rawAssignedTechnicianIds.filter((id: unknown) => typeof id === 'string' && id.trim().length > 0)
      : (typeof assignedTechnicianId === 'string' && assignedTechnicianId !== 'unassigned' && assignedTechnicianId.trim().length > 0
        ? [assignedTechnicianId]
        : []);
    
    // Create job order directly as submitted (using first ticket number for order ID)
    // Retry up to 3 times if we hit a duplicate key error
    let jobOrder;
    let retries = 3;
    while (retries > 0) {
      try {
        jobOrder = await createJobOrder(campus, sublocation, itemsJson, user.id, firstTicketNumber);
        break;
      } catch (error) {
        if (error instanceof Error && error.message.includes('duplicate key') && retries > 1) {
          console.warn('[Job Order] Duplicate order number detected, regenerating...');
          // Generate a new first ticket number
          firstTicketNumber = await getNextTicketId();
          retries--;
          // Small delay to avoid race conditions
          await new Promise(resolve => setTimeout(resolve, 100));
        } else {
          throw error;
        }
      }
    }
    
    if (!jobOrder) {
      throw new Error('Failed to create job order after retries');
    }
    
    // Immediately submit it (creates service requests with provided details)
    const { submitJobOrder } = await import('@/lib/db');
    const submittedOrder = await submitJobOrder(jobOrder.id, user.id, {
      requestType,
      priority,
      scheduledAt,
      assignedTechnicianIds: normalizedAssignedTechnicianIds,
      notes,
    });

    return NextResponse.json({
      success: true,
      orderNumber: submittedOrder?.order_number,
      itemCount: items.length,
    });
  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Failed to create job order',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

