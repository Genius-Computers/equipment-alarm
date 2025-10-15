import { NextRequest, NextResponse } from 'next/server';
import { getCurrentServerUser } from '@/lib/auth';
import { camelToSnakeCase } from '@/lib/utils';
import { bulkInsertEquipment, listAllLocations, findOrCreateLocation } from '@/lib/db';

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
    const locationMap = new Map(allLocations.map(loc => [loc.name, loc]));
    
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
      
      // Find location by name
      const location = locationMap.get(locationName.trim());
      
      if (!location) {
        missingLocations.push(locationName.trim());
      } else {
        // Add location_id and campus to the item
        processedItems.push({
          ...item,
          locationId: location.id,
          location: location.campus, // Set legacy campus field for compatibility
          subLocation: subLocation?.trim() || '', // Free text sublocation
        });
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

    const snakeItems = processedItems.map((i: Record<string, unknown>) => camelToSnakeCase(i));
    const inserted = await bulkInsertEquipment(snakeItems, user.id);
    return NextResponse.json({ data: inserted }, { status: 201 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
