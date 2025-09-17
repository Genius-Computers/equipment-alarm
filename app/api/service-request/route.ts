import { NextRequest, NextResponse } from 'next/server';
import { insertServiceRequest, listServiceRequestPaginated } from '@/lib/db';
import { camelToSnakeCase, snakeToCamelCase } from '@/lib/utils';
import { ServiceRequestApprovalStatus, ServiceRequestWorkStatus } from '@/lib/types';
import { getCurrentServerUser } from '@/lib/auth';
import { stackServerApp } from '@/stack';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentServerUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { searchParams } = new URL(req.url);
    const page = Number(searchParams.get('page') ?? '1');
    const pageSize = Number(searchParams.get('pageSize') ?? '50');
    const { rows, total } = await listServiceRequestPaginated(page, pageSize);

    // Fetch technicians for assigned_technician_id values
    const techIds = Array.from(new Set((rows.map((r) => r.assigned_technician_id).filter(Boolean) as string[])));
    const techMap = new Map<string, unknown>();
    await Promise.all(
      techIds.map(async (id) => {
        try {
          const u = await stackServerApp.getUser(id);
          if (u) {
            techMap.set(id, {
              id: u.id,
              displayName: u.displayName ?? null,
              email: u.primaryEmail ?? null,
              role:
                ((u.clientReadOnlyMetadata && (u.clientReadOnlyMetadata as Record<string, unknown>).role as string | undefined) ||
                 (u.serverMetadata && (u.serverMetadata as Record<string, unknown>).role as string | undefined) ||
                 'user'),
            });
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

    return NextResponse.json({ data, meta: { page, pageSize, total } });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // Must be authenticated; any signed-in user can create requests
    const user = await getCurrentServerUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json();

    // Enforce defaults for new requests
    const input = {
      ...body,
      // allow client to send assignedTechnicianId; defaults to undefined
      approvalStatus: body.approvalStatus ?? ServiceRequestApprovalStatus.PENDING,
      workStatus: body.workStatus ?? ServiceRequestWorkStatus.PENDING
    };
    console.log(input);
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


