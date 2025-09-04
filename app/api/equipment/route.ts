import { NextRequest, NextResponse } from 'next/server';
import { insertEquipment, listEquipment } from '@/lib/db';

export async function GET() {
  try {
    const rows = await listEquipment();
    return NextResponse.json({ data: rows });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Unexpected error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const newRow = await insertEquipment({
      machine_name: body.machineName,
      part_number: body.partNumber,
      location: body.location,
      last_maintenance: body.lastMaintenance,
      next_maintenance: body.nextMaintenance,
      maintenance_interval: body.maintenanceInterval,
      spare_parts_needed: Boolean(body.sparePartsNeeded),
      spare_parts_approved: Boolean(body.sparePartsApproved),
    });
    return NextResponse.json({ data: newRow }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Unexpected error' }, { status: 500 });
  }
}


