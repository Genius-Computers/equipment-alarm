import { NextRequest, NextResponse } from 'next/server';
import { getEquipmentById, updateEquipment, softDeleteEquipment, findOrCreateLocation } from '@/lib/db';
import { snakeToCamelCase, deriveMaintenanceInfo } from '@/lib/utils';
import { getCurrentServerUser } from '@/lib/auth';
import { VALID_CAMPUSES } from '@/lib/config';

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const user = await getCurrentServerUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json();

    // Validate location
    if (body.location && !VALID_CAMPUSES.includes(body.location)) {
      return NextResponse.json({ 
        error: `Invalid location. Must be one of: ${VALID_CAMPUSES.join(', ')}` 
      }, { status: 400 });
    }

    // Create location entry if sublocation is provided
    if (body.location && body.subLocation && body.subLocation.trim()) {
      try {
        await findOrCreateLocation(body.location, body.subLocation.trim(), user.id);
      } catch (error) {
        console.error('Failed to create location:', error);
        // Continue anyway - equipment can still be updated
      }
    }

    const row = await updateEquipment(id, {
      name: body.name,
      part_number: body.partNumber,
      location: body.location,
      sub_location: body.subLocation,
      last_maintenance: body.lastMaintenance,
      maintenance_interval: body.maintenanceInterval,
      status: body.status,
      model: body.model,
      manufacturer: body.manufacturer,
      serial_number: body.serialNumber
    }, user.id);
    const camel = snakeToCamelCase(row) as Record<string, unknown>;
    const { maintenanceStatus, nextMaintenance } = deriveMaintenanceInfo({
      lastMaintenance: camel.lastMaintenance as string | undefined,
      maintenanceInterval: (camel.maintenanceInterval as string) || '',
    });
    return NextResponse.json({ data: { ...camel, maintenanceStatus, nextMaintenance } });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const user = await getCurrentServerUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const row = await getEquipmentById(id);
    if (!row) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const camel = snakeToCamelCase(row) as Record<string, unknown>;
    const { maintenanceStatus, nextMaintenance } = deriveMaintenanceInfo({
      lastMaintenance: camel.lastMaintenance as string | undefined,
      maintenanceInterval: (camel.maintenanceInterval as string) || '',
    });
    return NextResponse.json({ data: { ...camel, maintenanceStatus, nextMaintenance } });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const user = await getCurrentServerUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const row = await softDeleteEquipment(id, user.id);
    if (!row) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
