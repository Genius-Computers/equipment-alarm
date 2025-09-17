import { NextRequest, NextResponse } from 'next/server';
import { updateEquipment } from '@/lib/db';
import { snakeToCamelCase, deriveMaintenanceInfo } from '@/lib/utils';
import { getCurrentServerUser } from '@/lib/auth';

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const user = await getCurrentServerUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json();

    const row = await updateEquipment(id, {
      name: body.name,
      part_number: body.partNumber,
      location: body.location,
      last_maintenance: body.lastMaintenance,
      maintenance_interval: body.maintenanceInterval,
      in_use: Boolean(body.inUse),
    }, user.id);
    const camel = snakeToCamelCase(row) as Record<string, unknown>;
    const { status, nextMaintenance } = deriveMaintenanceInfo({
      lastMaintenance: camel.lastMaintenance as string | undefined,
      maintenanceInterval: (camel.maintenanceInterval as string) || '',
    });
    return NextResponse.json({ data: { ...camel, status, nextMaintenance } });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}


