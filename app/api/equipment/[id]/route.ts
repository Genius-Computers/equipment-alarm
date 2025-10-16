import { NextRequest, NextResponse } from 'next/server';
import { updateEquipment, softDeleteEquipment, getEquipmentWithLocationInfo, listAllLocations } from '@/lib/db';
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

    // Validate that location exists in the locations table (if provided)
    // Always validate and update locationId when location is provided
    if (body.location && body.location.trim()) {
      const allLocations = await listAllLocations();
      const locationMap = new Map(allLocations.map(loc => [loc.name.toLowerCase(), loc]));
      const location = locationMap.get(body.location.trim().toLowerCase());
      
      if (!location) {
        return NextResponse.json({ 
          error: `Location "${body.location}" does not exist in the Locations module. Please register it first.` 
        }, { status: 400 });
      }
      
      // Always set/update the locationId from the found location
      body.locationId = location.id;
    }

    const row = await updateEquipment(id, {
      name: body.name,
      part_number: body.partNumber,
      location: body.location,
      sub_location: body.subLocation,
      location_id: body.locationId,
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

    // Use new function that includes location info
    const row = await getEquipmentWithLocationInfo(id);
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
