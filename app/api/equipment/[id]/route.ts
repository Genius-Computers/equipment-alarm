import { NextRequest, NextResponse } from 'next/server';
import { updateEquipment } from '@/lib/db';

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await req.json();

    const row = await updateEquipment(id, {
      machine_name: body.machineName,
      part_number: body.partNumber,
      location: body.location,
      last_maintenance: body.lastMaintenance,
      next_maintenance: body.nextMaintenance,
      maintenance_interval: body.maintenanceInterval,
      spare_parts_needed: Boolean(body.sparePartsNeeded),
      spare_parts_approved: Boolean(body.sparePartsApproved),
      in_use: Boolean(body.inUse),
    });
    return NextResponse.json({ data: row });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}


