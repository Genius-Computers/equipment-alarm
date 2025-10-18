import { NextRequest, NextResponse } from 'next/server';
import { getCurrentServerUser } from '@/lib/auth';
import { camelToSnakeCase } from '@/lib/utils';
import { bulkInsertEquipment, bulkSoftDeleteEquipment, listAllLocations } from '@/lib/db';
import { DbEquipment } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentServerUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const items = Array.isArray(body?.items) ? body.items : [];
    if (items.length === 0) {
      return NextResponse.json({ error: 'No items provided' }, { status: 400 });
    }

    // Get all locations from database
    const allLocations = await listAllLocations();
    // Map by location name only (campus is just an organizational property)
    const locationMap = new Map(allLocations.map(loc => [loc.name.toLowerCase(), loc]));
    
    // Validate that all locations exist and map to location IDs
    const missingLocations: string[] = [];
    const processedItems = [];
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i] as Record<string, unknown>;
      const locationName = item.location as string | undefined;
      const subLocation = item.subLocation as string | undefined;
      
      if (!locationName || !locationName.trim()) {
        return NextResponse.json({ 
          error: `Row ${i + 1}: Location is required` 
        }, { status: 400 });
      }
      
      // Find location by name (case-insensitive)
      const location = locationMap.get(locationName.trim().toLowerCase());
      
      if (!location) {
        missingLocations.push(locationName.trim());
      } else {
        // Explicitly construct the item to avoid spread operator issues
        const processedItem = {
          name: item.name,
          partNumber: item.partNumber,
          model: item.model,
          manufacturer: item.manufacturer,
          serialNumber: item.serialNumber,
          status: item.status,
          lastMaintenance: item.lastMaintenance,
          maintenanceInterval: item.maintenanceInterval,
          location: locationName.trim(), // The registered location name from CSV
          subLocation: subLocation?.trim() || '', // Free text sublocation from CSV
          locationId: location.id, // Link to the locations table
        };
        processedItems.push(processedItem);
      }
    }

    // Reject import if any locations don't exist
    if (missingLocations.length > 0) {
      const uniqueMissing = Array.from(new Set(missingLocations));
      return NextResponse.json({ 
        error: `CSV import rejected: The following locations do not exist in the Locations module. Please create them first:\n\n${uniqueMissing.map(name => `• ${name}`).join('\n')}`,
        missingLocations: uniqueMissing
      }, { status: 400 });
    }

    const snakeItems = processedItems.map((i: Record<string, unknown>) => camelToSnakeCase(i)) as Array<Omit<DbEquipment, 'id' | 'created_by' | 'updated_by' | 'deleted_by' | 'created_at' | 'updated_at' | 'deleted_at'>>;
    const inserted = await bulkInsertEquipment(snakeItems, user.id);
    return NextResponse.json({ data: inserted }, { status: 201 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentServerUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const ids = Array.isArray(body?.ids) ? body.ids : [];
    
    if (ids.length === 0) {
      return NextResponse.json({ error: 'No IDs provided' }, { status: 400 });
    }

    const result = await bulkSoftDeleteEquipment(ids, user.id);

    return NextResponse.json({ 
      success: true,
      deleted: result.deleted,
      failed: result.failed
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unexpected error';
    console.error('[Bulk Delete] Error:', errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
