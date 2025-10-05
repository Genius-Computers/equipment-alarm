import { NextRequest, NextResponse } from 'next/server';
import { insertServiceRequest, listServiceRequestPaginated } from '@/lib/db';
import { camelToSnakeCase, formatStackUserLight, snakeToCamelCase } from '@/lib/utils';
import { ServiceRequestApprovalStatus, ServiceRequestWorkStatus } from '@/lib/types';
import { ensureRole, getCurrentServerUser } from '@/lib/auth';
import { APPROVER_ROLES } from '@/lib/types/user';
import { stackServerApp } from '@/stack';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentServerUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { searchParams } = new URL(req.url);
    const page = Number(searchParams.get('page') ?? '1');
    const pageSize = Number(searchParams.get('pageSize') ?? '10');
    const scopeParam = searchParams.get('scope');
    const scope = scopeParam === 'pending' || scopeParam === 'completed' ? scopeParam : undefined;
    const assignedToParam = searchParams.get('assignedTo');
    const assignedToTechnicianId = assignedToParam === 'me' ? user.id : undefined;
    const equipmentId = searchParams.get('equipmentId') || undefined;
    const priority = searchParams.get('priority') || undefined; // expected: 'low' | 'medium' | 'high' | 'all'
    const approval = searchParams.get('approval') || undefined; // expected: 'pending' | 'approved' | 'rejected' | 'all'
    const { rows, total } = await listServiceRequestPaginated(page, pageSize, scope, assignedToTechnicianId, equipmentId, priority, approval);

    // Fetch technicians for assigned_technician_id values
    const techIds = Array.from(new Set((rows.map((r) => r.assigned_technician_id).filter(Boolean) as string[])));
    const techMap = new Map<string, unknown>();
    const allUsers = await stackServerApp.listUsers({ limit: 100 });
    await Promise.all(
      techIds.map(async (id) => {
        try {
          const technician = allUsers.find((u) => u.id === id);
          if (technician) {
            techMap.set(id, formatStackUserLight(technician));
          }
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
    // Only supervisor/admin can create requests
    try {
      ensureRole(user, APPROVER_ROLES);
    } catch {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const body = await req.json();

    // Enforce defaults for new requests
    const input = {
      ...body,
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


