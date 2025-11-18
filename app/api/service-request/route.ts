import { NextRequest, NextResponse } from 'next/server';
import { insertServiceRequest, listServiceRequestPaginated, getNextTicketId, findOrCreateSparePart } from '@/lib/db';
import { camelToSnakeCase, formatStackUserLight, snakeToCamelCase } from '@/lib/utils';
import { ServiceRequestApprovalStatus, ServiceRequestWorkStatus } from '@/lib/types';
import { getCurrentServerUser, getUserRole } from '@/lib/auth';
import { stackServerApp } from '@/stack';
import type { SparePartNeeded } from '@/lib/types/service-request';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentServerUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { searchParams } = new URL(req.url);
    
    // If ?nextTicket=true, return next ticket id for preview
    if (searchParams.get('nextTicket') === 'true') {
      try {
        const next = await getNextTicketId(new Date());
        return NextResponse.json({ data: { nextTicketId: next } });
      } catch (error) {
        console.error('Error getting next ticket ID:', error);
        return NextResponse.json({ error: 'Failed to get next ticket ID' }, { status: 500 });
      }
    }
    
    const page = Number(searchParams.get('page') ?? '1');
    const pageSize = Number(searchParams.get('pageSize') ?? '10');
    const scopeParam = searchParams.get('scope');
    const scope = scopeParam === 'pending' || scopeParam === 'completed' ? scopeParam : undefined;
    const assignedToParam = searchParams.get('assignedTo');
    const assignedToTechnicianId = assignedToParam === 'me' ? user.id : undefined;
    const equipmentId = searchParams.get('equipmentId') || undefined;
    const priority = searchParams.get('priority') || undefined; // expected: 'low' | 'medium' | 'high' | 'all'
    let approval = searchParams.get('approval') || undefined; // expected: 'pending' | 'approved' | 'rejected' | 'all'
    const requestType = searchParams.get('requestType') || undefined; // expected: ServiceRequestType or 'all'
    
    // Role-based filtering: Technicians only see approved requests
    const userRole = getUserRole(user);
    if (userRole === 'technician') {
      // Technicians can only see approved requests
      approval = 'approved';
    }
    // Supervisors and admins see all requests (no override)
    
    console.log('[Service Request GET] Fetching with params:', { page, pageSize, scope, priority, approval, requestType, assignedTo: assignedToParam, userRole });
    const { rows, total } = await listServiceRequestPaginated(page, pageSize, scope, assignedToTechnicianId, equipmentId, priority, approval, requestType);
    console.log('[Service Request GET] Found:', rows.length, 'rows, total:', total);

    // Fetch only needed technicians, in parallel
    const techIds = Array.from(new Set((rows.map((r) => r.assigned_technician_id).filter(Boolean) as string[])));
    const techMap = new Map<string, unknown>();
    await Promise.all(
      techIds.map(async (id) => {
        try {
          const technician = await stackServerApp.getUser(id);
          if (technician) techMap.set(id, formatStackUserLight(technician));
        } catch {
          // ignore individual fetch failures
        }
      })
    );

    const data = rows.map((r) => {
      const base = snakeToCamelCase(r);
      const technician = r.assigned_technician_id ? techMap.get(r.assigned_technician_id) ?? null : null;
      return { ...base, technician };
    });

    return NextResponse.json({ data, meta: { page, pageSize, total, scope: scope ?? 'all' } });
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
    // All authenticated users can create service requests
    const body = await req.json();

    // Process spare parts and auto-create custom ones in inventory
    let processedSpareParts = body.sparePartsNeeded;
    if (body.sparePartsNeeded && Array.isArray(body.sparePartsNeeded)) {
      console.log('[POST ServiceRequest] Processing spare parts:', body.sparePartsNeeded.length, 'parts');
      processedSpareParts = await Promise.all(
        body.sparePartsNeeded.map(async (part: SparePartNeeded, index: number) => {
          console.log(`[POST ServiceRequest] Part ${index}:`, { 
            part: part.part, 
            sparePartId: part.sparePartId,
            manufacturer: part.manufacturer,
            source: part.source 
          });
          
          // If it's a custom part (no sparePartId), create it in inventory
          if (!part.sparePartId && part.part) {
            console.log('[POST ServiceRequest] Custom part detected, creating in inventory...');
            try {
              const sparePartId = await findOrCreateSparePart(
                part.part,
                part.manufacturer,
                part.source, // source becomes supplier in inventory
                user.id
              );
              console.log('[POST ServiceRequest] Successfully linked part to inventory ID:', sparePartId);
              return { ...part, sparePartId, sparePartName: part.part };
            } catch (error) {
              console.error('[POST ServiceRequest] Failed to create spare part:', error);
              return part; // Return original if creation fails
            }
          }
          return part;
        })
      );
      console.log('[POST ServiceRequest] Finished processing spare parts');
    }

    // Enforce defaults for new requests
    const input = {
      ...body,
      sparePartsNeeded: processedSpareParts,
      // allow client to send assignedTechnicianId; defaults to undefined
      approvalStatus: body.approvalStatus ?? ServiceRequestApprovalStatus.PENDING,
      workStatus: body.workStatus ?? ServiceRequestWorkStatus.PENDING
    };
    const newRow = await insertServiceRequest(
      camelToSnakeCase(input) as Parameters<typeof insertServiceRequest>[0],
      user.id,
    );
    return NextResponse.json({ data: snakeToCamelCase(newRow) }, { status: 201 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}


