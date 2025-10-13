import { NextRequest, NextResponse } from 'next/server';
import { getCurrentServerUser } from '@/lib/auth';
import { camelToSnakeCase } from '@/lib/utils';
import { bulkInsertEquipment, findOrCreateLocation } from '@/lib/db';
import { VALID_CAMPUSES } from '@/lib/config';

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

    // Validate campuses
    for (let i = 0; i < items.length; i++) {
      const item = items[i] as Record<string, unknown>;
      if (item.location && !VALID_CAMPUSES.includes(item.location as string)) {
        return NextResponse.json({ 
          error: `Invalid campus at row ${i + 1}: "${item.location}". Must be one of: ${VALID_CAMPUSES.join(', ')}` 
        }, { status: 400 });
      }
    }

    // Validate that all sublocations exist in the locations table
    const { listLocationsByCampus } = await import('@/lib/db');
    const locationPairs = new Set<string>();
    
    for (const item of items) {
      const location = (item as Record<string, unknown>).location as string | undefined;
      const subLocation = (item as Record<string, unknown>).subLocation as string | undefined;
      if (location && subLocation && subLocation.trim()) {
        locationPairs.add(`${location}|||${subLocation.trim()}`);
      }
    }

    // Check each unique location pair against the database
    const missingLocations: string[] = [];
    const locationsByCache: Record<string, Set<string>> = {};
    
    for (const pair of locationPairs) {
      const [campus, sublocationName] = pair.split('|||');
      
      // Fetch locations for this campus if not cached
      if (!locationsByCache[campus]) {
        const dbLocations = await listLocationsByCampus(campus);
        locationsByCache[campus] = new Set(dbLocations.map(loc => loc.name));
      }
      
      // Check if sublocation exists
      if (!locationsByCache[campus].has(sublocationName)) {
        missingLocations.push(`${campus} → ${sublocationName}`);
      }
    }

    // Reject import if any sublocations don't exist
    if (missingLocations.length > 0) {
      return NextResponse.json({ 
        error: `CSV import rejected: The following sublocations do not exist in the Locations module. Please create them first:\n\n${missingLocations.join('\n')}`,
        missingLocations
      }, { status: 400 });
    }

    const snakeItems = items.map((i: Record<string, unknown>) => camelToSnakeCase(i));
    const inserted = await bulkInsertEquipment(snakeItems, user.id);
    return NextResponse.json({ data: inserted }, { status: 201 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
