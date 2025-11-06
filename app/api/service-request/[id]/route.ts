import { NextRequest, NextResponse } from 'next/server';
import { getServiceRequestById, updateServiceRequest, findOrCreateSparePart } from '@/lib/db';
import { snakeToCamelCase, formatStackUserLight } from '@/lib/utils';
import { ServiceRequestApprovalStatus, ServiceRequestWorkStatus } from '@/lib/types';
import { ensureRole, getCurrentServerUser } from '@/lib/auth';
import { APPROVER_ROLES } from '@/lib/types/user';
import { stackServerApp } from '@/stack';
import type { SparePartNeeded } from '@/lib/types/service-request';

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentServerUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const row = await getServiceRequestById(id);
    if (!row) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    // Enrich technician
    let technician: unknown = null;
    if (row.assigned_technician_id) {
      try {
        const u = await stackServerApp.getUser(row.assigned_technician_id);
        technician = formatStackUserLight(u);
      } catch {
        // ignore
      }
    }
    const data = { ...snakeToCamelCase(row), technician };
    return NextResponse.json({ data });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentServerUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await context.params;
    const body = await req.json();

    const current = await getServiceRequestById(id);
    if (!current) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Determine which fields are being updated
    const providedKeys = Object.keys(body ?? {});
    // Distinguish editable groups
    const basicKeys = ['equipmentId', 'assignedTechnicianId', 'requestType', 'scheduledAt'];
    const technicianDetailKeys = ['problemDescription', 'technicalAssessment', 'recommendation', 'sparePartsNeeded'];
    const includesBasic = providedKeys.some((k) => basicKeys.includes(k));
    const includesTechDetails = providedKeys.some((k) => technicianDetailKeys.includes(k));
    const includesApproval = providedKeys.includes('approvalStatus');
    const includesWork = providedKeys.includes('workStatus');

    // RBAC helper for approver roles (supervisor, admin_x)
    let isApproverUser = false;
    try {
      ensureRole(user, APPROVER_ROLES);
      isApproverUser = true;
    } catch {
      // not an approver
      isApproverUser = false;
    }

    // Basic fields (assignment/schedule/type)
    // Policy:
    // - Non-approvers: may edit ONLY while both approval and work are pending
    // - Approvers: may edit while work is pending (even if approval is approved). Block after completion
    if (includesBasic) {
      const workPending = current.work_status === ServiceRequestWorkStatus.PENDING;
      const nonApproverAllowed = (current.approval_status === ServiceRequestApprovalStatus.PENDING) && workPending;
      const approverAllowed = isApproverUser && workPending;
      if (!(nonApproverAllowed || approverAllowed)) {
        return NextResponse.json({ error: 'Basic fields can only be edited while work is pending' }, { status: 409 });
      }
    }

    // Technician details can be edited while work is pending, and either approval is approved OR user is approver
    if (includesTechDetails) {
      const workPending = current.work_status === ServiceRequestWorkStatus.PENDING;
      const approvalAllows = current.approval_status === ServiceRequestApprovalStatus.APPROVED || isApproverUser;
      if (!workPending || !approvalAllows) {
        return NextResponse.json({ error: 'Details can only be edited when work is pending and after approval' }, { status: 409 });
      }
    }

    // Rule: approval status transition allowed only from pending
    if (includesApproval && current.approval_status !== ServiceRequestApprovalStatus.PENDING) {
      return NextResponse.json({ error: 'Approval status can only change from pending' }, { status: 409 });
    }

    // RBAC: only approver roles can change approval status
    if (includesApproval) {
      try {
        ensureRole(user, APPROVER_ROLES);
      } catch {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Rule: work status can be edited until the request is completed
    if (includesWork && current.work_status === ServiceRequestWorkStatus.COMPLETED) {
      return NextResponse.json({ error: 'Work status cannot change after completion' }, { status: 409 });
    }

    // Process spare parts and auto-create custom ones in inventory
    let processedSpareParts = body.sparePartsNeeded ?? current.spare_parts_needed;
    if (body.sparePartsNeeded && Array.isArray(body.sparePartsNeeded)) {
      console.log('[PATCH ServiceRequest] Processing spare parts:', body.sparePartsNeeded.length, 'parts');
      processedSpareParts = await Promise.all(
        body.sparePartsNeeded.map(async (part: SparePartNeeded, index: number) => {
          console.log(`[PATCH ServiceRequest] Part ${index}:`, { 
            part: part.part, 
            sparePartId: part.sparePartId,
            manufacturer: part.manufacturer,
            source: part.source 
          });
          
          // If it's a custom part (no sparePartId), create it in inventory
          if (!part.sparePartId && part.part) {
            console.log('[PATCH ServiceRequest] Custom part detected, creating in inventory...');
            try {
              const sparePartId = await findOrCreateSparePart(
                part.part,
                part.manufacturer,
                part.source, // source becomes supplier in inventory
                user.id
              );
              console.log('[PATCH ServiceRequest] Successfully linked part to inventory ID:', sparePartId);
              return { ...part, sparePartId, sparePartName: part.part };
            } catch (error) {
              console.error('[PATCH ServiceRequest] Failed to create spare part:', error);
              return part; // Return original if creation fails
            }
          }
          return part;
        })
      );
      console.log('[PATCH ServiceRequest] Finished processing spare parts');
    }

    // Normalize empty string to null for UUID fields
    const normalizedAssignedTechnicianId = (typeof body.assignedTechnicianId === 'string' && body.assignedTechnicianId.trim() === '')
      ? null
      : (body.assignedTechnicianId ?? current.assigned_technician_id);

    const payload = {
      equipment_id: body.equipmentId ?? current.equipment_id,
      assigned_technician_id: normalizedAssignedTechnicianId,
      request_type: body.requestType ?? current.request_type,
      scheduled_at: body.scheduledAt ?? current.scheduled_at,
      priority: body.priority ?? current.priority,
      approval_status: body.approvalStatus ?? current.approval_status,
      work_status: body.workStatus ?? current.work_status,
      problem_description: body.problemDescription ?? current.problem_description,
      technical_assessment: body.technicalAssessment ?? current.technical_assessment,
      recommendation: body.recommendation ?? current.recommendation,
      spare_parts_needed: processedSpareParts,
      approval_note: body.approvalNote ?? current.approval_note,
    } as const;

    const row = await updateServiceRequest(id, payload as Parameters<typeof updateServiceRequest>[1], user.id);
    // enrich technician
    let technician: unknown = null;
    if (row.assigned_technician_id) {
      try {
        const u = await stackServerApp.getUser(row.assigned_technician_id);
        technician = formatStackUserLight(u);
      } catch {
        // ignore
      }
    }
    const data = { ...snakeToCamelCase(row), technician };
    return NextResponse.json({ data });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}


