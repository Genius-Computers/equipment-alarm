import { NextRequest, NextResponse } from 'next/server';
import { insertEquipment, listEquipmentPaginated, listAllLocations } from '@/lib/db';
import { camelToSnakeCase, snakeToCamelCase, deriveMaintenanceInfo } from '@/lib/utils';
import { getCurrentServerUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentServerUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = Number(searchParams.get('page') ?? '1');
    const pageSize = Number(searchParams.get('pageSize') ?? '10');
    const q = searchParams.get('q') || undefined;
    const status = searchParams.get('status') || undefined; // 'all' | 'good' | 'due' | 'overdue'

    // If filtering by derived status, fetch a large chunk and paginate after deriving
    const deriving = Boolean(status && status !== 'all');
    const dbPage = deriving ? 1 : page;
    const dbPageSize = deriving ? 5000 : pageSize; // pragmatic cap
    const { rows, total } = await listEquipmentPaginated(dbPage, dbPageSize, q);

    const mapped = rows.map((r) => {
      const camel = snakeToCamelCase(r) as Record<string, unknown>;
      const { maintenanceStatus, nextMaintenance } = deriveMaintenanceInfo({
        lastMaintenance: camel.lastMaintenance as string | undefined,
        maintenanceInterval: (camel.maintenanceInterval as string) || '',
      });
      return { ...camel, maintenanceStatus, nextMaintenance } as Record<string, unknown> & { maintenanceStatus: string };
    });

    const filteredByStatus = !status || status === 'all'
      ? mapped
      : mapped.filter((e) => (e.maintenanceStatus as string) === status);

    // If we derived filter, we must paginate the filtered set
    if (deriving) {
      const start = Math.max(0, (page - 1) * pageSize);
      const end = start + pageSize;
      const sliced = filteredByStatus.slice(start, end);
      return NextResponse.json({
        data: sliced,
        meta: { page, pageSize, total: filteredByStatus.length }
      });
    }

    return NextResponse.json({
      data: filteredByStatus,
      meta: { page, pageSize, total }
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentServerUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await req.json();
    
    // Validate that location exists in the locations table (if provided)
    if (body.location && body.location.trim()) {
      const allLocations = await listAllLocations();
      const locationMap = new Map(allLocations.map(loc => [loc.name.toLowerCase(), loc]));
      const location = locationMap.get(body.location.trim().toLowerCase());
      
      if (!location) {
        return NextResponse.json({ 
          error: `Location "${body.location}" does not exist in the Locations module. Please register it first.` 
        }, { status: 400 });
      }
      
      // Set the locationId from the found location
      body.locationId = location.id;
    }
    
    const newRow = await insertEquipment(
      camelToSnakeCase(body) as Parameters<typeof insertEquipment>[0],
      user.id,
    );
    return NextResponse.json({ data: snakeToCamelCase(newRow) }, { status: 201 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}


