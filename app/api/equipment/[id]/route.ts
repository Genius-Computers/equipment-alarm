import { NextRequest, NextResponse } from 'next/server';
import { updateEquipment } from '@/lib/db';
import { snakeToCamelCase } from '@/lib/utils';

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await req.json();

    const row = await updateEquipment(id, {
      machine_name: body.machineName,
      part_number: body.partNumber,
      location: body.location,
      last_maintenance: body.lastMaintenance,
      maintenance_interval: body.maintenanceInterval,
      in_use: Boolean(body.inUse),
    });
    return NextResponse.json({ data: snakeToCamelCase(row) });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}


