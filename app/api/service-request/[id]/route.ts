import { NextRequest, NextResponse } from 'next/server';
import { getServiceRequestById, updateServiceRequest } from '@/lib/db';
import { snakeToCamelCase } from '@/lib/utils';
import { ServiceRequestApprovalStatus, ServiceRequestWorkStatus } from '@/lib/types';
import { ensureRole, getCurrentServerUser } from '@/lib/auth';
import { APPROVER_ROLES } from '@/lib/types/user';

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
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
      const user = await getCurrentServerUser(req);
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
      request_type: body.requestType ?? current.request_type,
      scheduled_at: body.scheduledAt ?? current.scheduled_at,
      priority: body.priority ?? current.priority,
      approval_status: body.approvalStatus ?? current.approval_status,
      work_status: body.workStatus ?? current.work_status,
      problem_description: body.problemDescription ?? current.problem_description,
      technical_assessment: body.technicalAssessment ?? current.technical_assessment,
      recommendation: body.recommendation ?? current.recommendation,
      spare_parts_needed: body.sparePartsNeeded ?? current.spare_parts_needed,
    } as const;

    const row = await updateServiceRequest(id, payload as Parameters<typeof updateServiceRequest>[1]);
    return NextResponse.json({ data: snakeToCamelCase(row) });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}


