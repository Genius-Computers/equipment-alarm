import { NextRequest, NextResponse } from 'next/server';
import {
  getServiceRequestById,
  updateServiceRequest,
  findOrCreateSparePart,
  updateEquipmentLastMaintenance,
} from '@/lib/db';
import { ensurePmDetailsColumn } from '@/lib/db/schema';
import { snakeToCamelCase, formatStackUserLight, getTodaySaudiDate } from '@/lib/utils';
import { ServiceRequestApprovalStatus, ServiceRequestType, ServiceRequestWorkStatus } from '@/lib/types';
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

    // Ensure pm_details column exists before proceeding
    await ensurePmDetailsColumn();

    const { id } = await context.params;
    const row = await getServiceRequestById(id);
    if (!row) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    // Enrich technician(s)
    let technician: unknown = null;
    const technicians: unknown[] = [];

    const allTechIds = new Set<string>();
    if (row.assigned_technician_id) {
      allTechIds.add(row.assigned_technician_id);
    }
    const extraIds = Array.isArray((row as unknown as { assigned_technician_ids?: string[] }).assigned_technician_ids)
      ? (row as unknown as { assigned_technician_ids?: string[] }).assigned_technician_ids!
      : [];
    for (const id of extraIds) {
      if (id) allTechIds.add(id);
    }

    for (const id of allTechIds) {
      try {
        const u = await stackServerApp.getUser(id);
        const formatted = formatStackUserLight(u);
        if (formatted) {
          if (!technician) {
            technician = formatted;
          }
          technicians.push(formatted);
        }
      } catch {
        // ignore
      }
    }

    const data = { ...snakeToCamelCase(row), technician, technicians: technicians.length > 0 ? technicians : undefined };
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
    
    // Ensure pm_details column exists before proceeding
    await ensurePmDetailsColumn();
    
    const { id } = await context.params;
    const body = await req.json();

    const current = await getServiceRequestById(id);
    if (!current) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Determine assignment information (single and multiple technicians)
    const extraAssignedIds = Array.isArray(
      (current as unknown as { assigned_technician_ids?: string[] }).assigned_technician_ids,
    )
      ? ((current as unknown as { assigned_technician_ids?: string[] }).assigned_technician_ids as string[])
      : [];
    const isAssignedTechnician =
      current.assigned_technician_id === user.id || extraAssignedIds.includes(user.id);

    // Determine which fields are being updated
    const providedKeys = Object.keys(body ?? {});
    // Distinguish editable groups
    const basicKeys = ['equipmentId', 'assignedTechnicianId', 'requestType', 'scheduledAt'];
    const technicianDetailKeys = ['problemDescription', 'technicalAssessment', 'recommendation', 'sparePartsNeeded', 'pmDetails'];
    const includesBasic = providedKeys.some((k) => basicKeys.includes(k));
    const includesTechDetails = providedKeys.some((k) => technicianDetailKeys.includes(k));
    const includesApproval = providedKeys.includes('approvalStatus');
    const includesWork = providedKeys.includes('workStatus');
    const includesExtraTechnicians = providedKeys.includes('assignedTechnicianIds');

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
    // - Non-approvers:
    //   - For regular (non-PM) requests: may edit ONLY after the request is approved,
    //     while work is pending, and only if they are assigned to the request.
    //   - For PM requests: may self-assign an unassigned request while work is pending.
    // - Approvers: may edit while work is pending (even if approval is already approved). Block after completion.
    if (includesBasic) {
      const workPending = current.work_status === ServiceRequestWorkStatus.PENDING;
      const isPmRequest = current.request_type === ServiceRequestType.PREVENTIVE_MAINTENANCE;

      let nonApproverAllowed = false;

      if (isPmRequest) {
        const isSelfAssign =
          Object.prototype.hasOwnProperty.call(body, 'assignedTechnicianId') &&
          typeof body.assignedTechnicianId === 'string' &&
          body.assignedTechnicianId === user.id;
        const wasUnassigned = !current.assigned_technician_id;
        // Allow technicians (non-approvers) to self-assign unassigned PM requests while work is pending
        nonApproverAllowed = workPending && isSelfAssign && wasUnassigned;
      } else {
        // Regular (non-PM): technicians can only edit after supervisor/admin_x approval.
        // Special case: allow self-assign on approved, unassigned requests while work is pending.
        const isSelfAssignRegular =
          Object.prototype.hasOwnProperty.call(body, 'assignedTechnicianId') &&
          typeof body.assignedTechnicianId === 'string' &&
          body.assignedTechnicianId === user.id &&
          !current.assigned_technician_id;

        const isApproved = current.approval_status === ServiceRequestApprovalStatus.APPROVED;

        if (isSelfAssignRegular) {
          nonApproverAllowed = isApproved && workPending;
        } else {
          nonApproverAllowed = isApproved && workPending && isAssignedTechnician;
        }
      }

      const approverAllowed = isApproverUser && workPending;

      if (!(nonApproverAllowed || approverAllowed)) {
        return NextResponse.json(
          { error: 'Basic fields can only be edited while work is pending' },
          { status: 409 },
        );
      }
    }

    // Technician details can be edited while work is pending, and either approval is approved OR user is approver.
    // PM requests are auto-approved - technicians can edit immediately.
    // Additionally, for non-approvers we require the user to be an assigned technician on the request.
    if (includesTechDetails) {
      const workPending = current.work_status === ServiceRequestWorkStatus.PENDING;
      const isPmRequest = current.request_type === ServiceRequestType.PREVENTIVE_MAINTENANCE;
      const approvalAllows = isPmRequest || current.approval_status === ServiceRequestApprovalStatus.APPROVED || isApproverUser;
      const actorAllowed = isApproverUser || isAssignedTechnician;

      if (!actorAllowed) {
        return NextResponse.json(
          { error: 'Only assigned technicians or supervisors can edit service request details' },
          { status: 403 },
        );
      }

      if (!workPending || !approvalAllows) {
        return NextResponse.json(
          { error: 'Details can only be edited when work is pending and after approval' },
          { status: 409 },
        );
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

    // Rule: work status can be edited until the request is completed.
    if (includesWork && current.work_status === ServiceRequestWorkStatus.COMPLETED) {
      return NextResponse.json({ error: 'Work status cannot change after completion' }, { status: 409 });
    }

    // Additional RBAC: only assigned technicians and approvers can change work status at all.
    if (includesWork) {
      const actorAllowed = isApproverUser || isAssignedTechnician;
      if (!actorAllowed) {
        return NextResponse.json(
          { error: 'Only assigned technicians or supervisors can update work status' },
          { status: 403 },
        );
      }
    }

    // RBAC for editing additional technicians (assignedTechnicianIds)
    if (includesExtraTechnicians) {
      const workPending = current.work_status === ServiceRequestWorkStatus.PENDING;
      const isPmRequest = current.request_type === ServiceRequestType.PREVENTIVE_MAINTENANCE;
      const isApproved = current.approval_status === ServiceRequestApprovalStatus.APPROVED;

      if (!workPending) {
        return NextResponse.json(
          { error: 'Technicians can only be updated while work is pending' },
          { status: 409 },
        );
      }

      const actorAllowed = isApproverUser || isAssignedTechnician;
      if (!actorAllowed) {
        return NextResponse.json(
          { error: 'Only assigned technicians or supervisors can modify technicians' },
          { status: 403 },
        );
      }

      // For regular (non-PM) requests, enforce approval before technicians can be updated by non-approvers
      if (!isPmRequest && !isApproved && !isApproverUser) {
        return NextResponse.json(
          { error: 'Technicians can only be updated after approval' },
          { status: 409 },
        );
      }
    }

    // Rule: Only supervisors can complete PM requests
    if (includesWork && body.workStatus === ServiceRequestWorkStatus.COMPLETED) {
      const isPmRequest = current.request_type === ServiceRequestType.PREVENTIVE_MAINTENANCE;
      if (isPmRequest && !isApproverUser) {
        return NextResponse.json({ error: 'Only supervisors can complete preventive maintenance requests' }, { status: 403 });
      }
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

    // Compute next set of assigned technician IDs (primary + additional)
    const currentAssignedIds = Array.isArray(
      (current as unknown as { assigned_technician_ids?: string[] }).assigned_technician_ids,
    )
      ? ((current as unknown as { assigned_technician_ids?: string[] }).assigned_technician_ids as string[])
      : [];

    let nextAssignedTechnicianIds: string[] = [];

    if (Array.isArray(body.assignedTechnicianIds)) {
      nextAssignedTechnicianIds = (body.assignedTechnicianIds as unknown[] as string[]).filter(
        (id) => typeof id === 'string' && id.trim().length > 0,
      );
    } else {
      nextAssignedTechnicianIds = [...currentAssignedIds];
    }

    // Ensure the primary technician is always the first element (when present)
    const primaryTechnicianId =
      normalizedAssignedTechnicianId ??
      current.assigned_technician_id ??
      (currentAssignedIds.length > 0 ? currentAssignedIds[0] : null);

    if (primaryTechnicianId) {
      nextAssignedTechnicianIds = nextAssignedTechnicianIds.filter((id) => id !== primaryTechnicianId);
      nextAssignedTechnicianIds.unshift(primaryTechnicianId);
    }

    const payload = {
      equipment_id: body.equipmentId ?? current.equipment_id,
      assigned_technician_id: normalizedAssignedTechnicianId,
      assigned_technician_ids: nextAssignedTechnicianIds,
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
      pm_details: body.pmDetails ?? current.pm_details,
    } as const;

    const willCompleteNow =
      includesWork &&
      body.workStatus === ServiceRequestWorkStatus.COMPLETED &&
      current.work_status !== ServiceRequestWorkStatus.COMPLETED;

    const row = await updateServiceRequest(id, payload as Parameters<typeof updateServiceRequest>[1], user.id);

    if (willCompleteNow) {
      const lastMaintenance = getTodaySaudiDate();
      await updateEquipmentLastMaintenance(row.equipment_id, lastMaintenance, user.id);
    }
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


