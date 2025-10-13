import { NextRequest, NextResponse } from 'next/server';
import { createJobOrder, listJobOrdersPaginated } from '@/lib/db';
import { stackServerApp } from '@/stack';
import { isValidCampus } from '@/lib/config';

export async function GET(req: NextRequest) {
  try {
    const user = await stackServerApp.getUser();
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
    console.error('Error fetching job orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch job orders' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await stackServerApp.getUser();
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
      console.error('[Job Order] Invalid campus:', campus);
      return NextResponse.json(
        { error: `Invalid campus: "${campus}". Only Main Campus and AJA Complex are supported.` },
        { status: 400 }
      );
    }

    console.log('[Job Order] Creating for:', campus, '→', sublocation, 'with', equipmentIds.length, 'items');

    // Validate that the sublocation exists in the locations table
    const { listLocationsByCampus, listEquipmentPaginated, getNextTicketId } = await import('@/lib/db');
    
    try {
      const existingLocations = await listLocationsByCampus(campus);
      const locationExists = existingLocations.some(loc => loc.name === sublocation);
      
      if (!locationExists) {
        console.error('[Job Order] Sublocation not found in locations table:', sublocation);
        return NextResponse.json(
          { 
            error: `Sublocation "${sublocation}" does not exist in ${campus}. Please create it in the Locations module first.`,
            details: 'Location validation failed'
          },
          { status: 400 }
        );
      }
    } catch (locationError) {
      console.error('[Job Order] Error validating location:', locationError);
      return NextResponse.json(
        { 
          error: 'Failed to validate location',
          details: locationError instanceof Error ? locationError.message : 'Unknown error'
        },
        { status: 500 }
      );
    }

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
    
    console.log('[Job Order] Creating job order with number: JO' + firstTicketNumber);
    
    // Create job order directly as submitted (using first ticket number for order ID)
    const jobOrder = await createJobOrder(campus, sublocation, itemsJson, user.id, firstTicketNumber);
    
    console.log('[Job Order] Job order created, ID:', jobOrder.id, 'Number:', jobOrder.order_number);
    
    // Immediately submit it (creates service requests with provided details)
    const { submitJobOrder } = await import('@/lib/db');
    const submittedOrder = await submitJobOrder(jobOrder.id, user.id, {
      requestType,
      priority,
      scheduledAt,
      assignedTechnicianId,
      notes,
    });

    console.log('[Job Order] Successfully submitted:', submittedOrder?.order_number);

    return NextResponse.json({
      success: true,
      orderNumber: submittedOrder?.order_number,
      itemCount: items.length,
    });
  } catch (error) {
    console.error('[Job Order API] Error creating job order:', error);
    console.error('[Job Order API] Stack:', error instanceof Error ? error.stack : 'No stack');
    return NextResponse.json(
      { 
        error: 'Failed to create job order',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

