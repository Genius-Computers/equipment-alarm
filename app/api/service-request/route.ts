import { NextRequest, NextResponse } from 'next/server';
import { insertServiceRequest, listServiceRequest } from '@/lib/db';
import { camelToSnakeCase, snakeToCamelCase } from '@/lib/utils';
import { ServiceRequestApprovalStatus, ServiceRequestWorkStatus } from '@/lib/types';
import { getCurrentServerUser } from '@/lib/auth';

export async function GET() {
  try {
    const rows = await listServiceRequest();
    return NextResponse.json({ data: rows.map(snakeToCamelCase) });
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
      approvalStatus: body.approvalStatus ?? ServiceRequestApprovalStatus.PENDING,
      workStatus: body.workStatus ?? ServiceRequestWorkStatus.PENDING
    };

    const newRow = await insertServiceRequest(camelToSnakeCase(input) as Parameters<typeof insertServiceRequest>[0]);
    return NextResponse.json({ data: snakeToCamelCase(newRow) }, { status: 201 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}


