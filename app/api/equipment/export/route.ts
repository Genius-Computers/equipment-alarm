import { NextRequest, NextResponse } from 'next/server';
import { getDb, ensureSchema } from '@/lib/db';
import { getCurrentServerUser } from '@/lib/auth';
import { canManageUsers } from '@/lib/types/user';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentServerUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = user?.serverMetadata?.role || user?.clientReadOnlyMetadata?.role as string | undefined;
    if (!canManageUsers(role)) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const sql = getDb();
    await ensureSchema();

    // Get query parameters for filtering
    const { searchParams } = new URL(req.url);
    const location = searchParams.get('location');
    const subLocation = searchParams.get('subLocation');
    const status = searchParams.get('status');

    // Get equipment data for export with optional filtering
    let equipment;
    
    if (location && subLocation) {
      equipment = await sql`
        select 
          e.id,
          e.name,
          e.part_number,
          e.model,
          e.manufacturer,
          e.serial_number,
          e.location,
          e.sub_location,
          e.status,
          e.last_maintenance,
          e.maintenance_interval,
          e.created_at,
          e.updated_at
        from equipment e
        where e.deleted_at is null
          and e.location = ${location}
          and e.sub_location = ${subLocation}
        order by e.name asc
      `;
    } else if (location) {
      equipment = await sql`
        select 
          e.id,
          e.name,
          e.part_number,
          e.model,
          e.manufacturer,
          e.serial_number,
          e.location,
          e.sub_location,
          e.status,
          e.last_maintenance,
          e.maintenance_interval,
          e.created_at,
          e.updated_at
        from equipment e
        where e.deleted_at is null
          and e.location = ${location}
        order by e.name asc
      `;
    } else if (status) {
      equipment = await sql`
        select 
          e.id,
          e.name,
          e.part_number,
          e.model,
          e.manufacturer,
          e.serial_number,
          e.location,
          e.sub_location,
          e.status,
          e.last_maintenance,
          e.maintenance_interval,
          e.created_at,
          e.updated_at
        from equipment e
        where e.deleted_at is null
          and e.status = ${status}
        order by e.name asc
      `;
    } else {
      equipment = await sql`
        select 
          e.id,
          e.name,
          e.part_number,
          e.model,
          e.manufacturer,
          e.serial_number,
          e.location,
          e.sub_location,
          e.status,
          e.last_maintenance,
          e.maintenance_interval,
          e.created_at,
          e.updated_at
        from equipment e
        where e.deleted_at is null
        order by e.name asc
      `;
    }

    // Transform data to match the expected format
    const exportData = (equipment as Array<{ id: string; name: string; part_number?: string; model?: string; manufacturer?: string; serial_number?: string; location: string; sub_location?: string; status: string; last_maintenance?: string; maintenance_interval?: string; created_at: string; updated_at: string }>).map((eq) => ({
      id: eq.id,
      name: eq.name,
      partNumber: eq.part_number || '',
      model: eq.model || '',
      manufacturer: eq.manufacturer || '',
      serialNumber: eq.serial_number || '',
      location: eq.location,
      subLocation: eq.sub_location || '',
      status: eq.status || '',
      lastMaintenance: eq.last_maintenance || '',
      maintenanceInterval: eq.maintenance_interval || '',
      createdAt: eq.created_at,
      updatedAt: eq.updated_at
    }));

    return NextResponse.json({
      success: true,
      data: exportData,
      count: exportData.length,
      filters: {
        location,
        subLocation,
        status
      }
    });

  } catch (error) {
    console.error('[Equipment Export] Error:', error);
    return NextResponse.json(
      {
        error: 'Export failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
