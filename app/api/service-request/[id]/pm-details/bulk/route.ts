import { NextRequest, NextResponse } from 'next/server';
import { getServiceRequestById, bulkUpdatePmDetailsByEquipmentNameKey, countPendingPmByEquipmentNameKey } from '@/lib/db';
import { ensurePmDetailsColumn } from '@/lib/db/schema';
import { normalizeEquipmentName } from '@/lib/utils';
import { getCurrentServerUser, ensureRole } from '@/lib/auth';
import { APPROVER_ROLES } from '@/lib/types/user';
import { ServiceRequestType, ServiceRequestWorkStatus } from '@/lib/types';
import type { PmDetails } from '@/lib/types/preventive-maintenance';

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentServerUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await ensurePmDetailsColumn();

    const { id } = await context.params;
    const current = await getServiceRequestById(id);
    if (!current) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (current.request_type !== ServiceRequestType.PREVENTIVE_MAINTENANCE) {
      return NextResponse.json({ error: 'Count is only supported for preventive maintenance requests' }, { status: 409 });
    }

    if (current.work_status !== ServiceRequestWorkStatus.PENDING) {
      return NextResponse.json({ error: 'Count is only available while work is pending' }, { status: 409 });
    }

    // RBAC: same as Save-all; any user who can edit details on the source ticket can see the count.
    let isApproverUser = false;
    try {
      ensureRole(user, APPROVER_ROLES);
      isApproverUser = true;
    } catch {
      isApproverUser = false;
    }

    const extraAssignedIds = Array.isArray((current as unknown as { assigned_technician_ids?: string[] }).assigned_technician_ids)
      ? (current as unknown as { assigned_technician_ids?: string[] }).assigned_technician_ids!
      : [];
    const isAssignedTechnician =
      (current.assigned_technician_id && current.assigned_technician_id === user.id) || extraAssignedIds.includes(user.id);

    if (!(isApproverUser || isAssignedTechnician)) {
      return NextResponse.json({ error: 'Only assigned technicians or supervisors can edit service request details' }, { status: 403 });
    }

    const equipment = (current as unknown as { equipment?: { name?: unknown } }).equipment;
    const equipmentName = equipment?.name;
    if (typeof equipmentName !== 'string' || equipmentName.trim().length === 0) {
      return NextResponse.json({ error: 'Equipment name is required' }, { status: 400 });
    }

    const normalizedNameKey = normalizeEquipmentName(equipmentName);
    if (!normalizedNameKey) {
      return NextResponse.json({ error: 'Equipment name is invalid' }, { status: 400 });
    }

    const count = await countPendingPmByEquipmentNameKey({
      equipmentNameRaw: equipmentName,
    });
    return NextResponse.json({ data: { count, normalizedNameKey } });
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

    await ensurePmDetailsColumn();

    const { id } = await context.params;
    const body = await req.json().catch(() => null) as { pmDetails?: PmDetails } | null;
    const pmDetails = body?.pmDetails;

    if (!pmDetails || typeof pmDetails !== 'object') {
      return NextResponse.json({ error: 'pmDetails is required' }, { status: 400 });
    }

    const current = await getServiceRequestById(id);
    if (!current) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (current.request_type !== ServiceRequestType.PREVENTIVE_MAINTENANCE) {
      return NextResponse.json({ error: 'Save all is only supported for preventive maintenance requests' }, { status: 409 });
    }

    if (current.work_status !== ServiceRequestWorkStatus.PENDING) {
      return NextResponse.json({ error: 'Save all can only be used while work is pending' }, { status: 409 });
    }

    // RBAC: Any user who can edit PM details on the source ticket can bulk-apply.
    let isApproverUser = false;
    try {
      ensureRole(user, APPROVER_ROLES);
      isApproverUser = true;
    } catch {
      isApproverUser = false;
    }

    const extraAssignedIds = Array.isArray((current as unknown as { assigned_technician_ids?: string[] }).assigned_technician_ids)
      ? (current as unknown as { assigned_technician_ids?: string[] }).assigned_technician_ids!
      : [];
    const isAssignedTechnician =
      (current.assigned_technician_id && current.assigned_technician_id === user.id) || extraAssignedIds.includes(user.id);

    if (!(isApproverUser || isAssignedTechnician)) {
      return NextResponse.json({ error: 'Only assigned technicians or supervisors can edit service request details' }, { status: 403 });
    }

    const equipment = (current as unknown as { equipment?: { name?: unknown } }).equipment;
    const equipmentName = equipment?.name;
    if (typeof equipmentName !== 'string' || equipmentName.trim().length === 0) {
      return NextResponse.json({ error: 'Equipment name is required to Save all' }, { status: 400 });
    }

    const normalizedNameKey = normalizeEquipmentName(equipmentName);
    if (!normalizedNameKey) {
      return NextResponse.json({ error: 'Equipment name is invalid' }, { status: 400 });
    }

    const updatedCount = await bulkUpdatePmDetailsByEquipmentNameKey({
      equipmentNameRaw: equipmentName,
      pmDetails,
      actorId: user.id,
    });

    return NextResponse.json({ data: { updatedCount, normalizedNameKey } });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}


