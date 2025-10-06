import { NextRequest, NextResponse } from 'next/server';
import { getServiceRequestById, updateServiceRequest } from '@/lib/db';
import { snakeToCamelCase, formatStackUserLight } from '@/lib/utils';
import { ServiceRequestApprovalStatus, ServiceRequestWorkStatus } from '@/lib/types';
import { ensureRole, getCurrentServerUser } from '@/lib/auth';
import { APPROVER_ROLES } from '@/lib/types/user';
import { stackServerApp } from '@/stack';

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
    const nonStatusKeys = [
      'equipmentId',
      'assignedTechnicianId',
      'requestType',
      'scheduledAt',
      'problemDescription',
      'technicalAssessment',
      'recommendation',
      'sparePartsNeeded',
    ];
    const includesNonStatus = providedKeys.some((k) => nonStatusKeys.includes(k));
    const includesApproval = providedKeys.includes('approvalStatus');
    const includesWork = providedKeys.includes('workStatus');

    // Rule: non-status fields editable only while both approval & work are pending
    if (includesNonStatus && (current.approval_status !== ServiceRequestApprovalStatus.PENDING || current.work_status !== ServiceRequestWorkStatus.PENDING)) {
      return NextResponse.json({ error: 'Details can only be edited while request is pending' }, { status: 409 });
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

    // Rule: work status transition allowed only from pending
    if (includesWork && current.work_status !== ServiceRequestWorkStatus.PENDING) {
      return NextResponse.json({ error: 'Work status can only change from pending' }, { status: 409 });
    }

    const payload = {
      equipment_id: body.equipmentId ?? current.equipment_id,
      assigned_technician_id: body.assignedTechnicianId ?? current.assigned_technician_id,
      request_type: body.requestType ?? current.request_type,
      scheduled_at: body.scheduledAt ?? current.scheduled_at,
      priority: body.priority ?? current.priority,
      approval_status: body.approvalStatus ?? current.approval_status,
      work_status: body.workStatus ?? current.work_status,
      problem_description: body.problemDescription ?? current.problem_description,
      technical_assessment: body.technicalAssessment ?? current.technical_assessment,
      recommendation: body.recommendation ?? current.recommendation,
      spare_parts_needed: body.sparePartsNeeded ?? current.spare_parts_needed,
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


