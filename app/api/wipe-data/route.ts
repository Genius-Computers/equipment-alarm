import { NextRequest, NextResponse } from 'next/server';
import { getCurrentServerUser } from '@/lib/auth';
import { getDb, ensureSchema } from '@/lib/db';
import { canManageUsers } from '@/lib/types/user';

// Endpoint to wipe inventory and service requests data
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentServerUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can wipe data
    const role = user?.serverMetadata?.role || user?.clientReadOnlyMetadata?.role as string | undefined;
    if (!canManageUsers(role)) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const sql = getDb();
    await ensureSchema();

    console.log('[Wipe Data] Starting data wipe operation...');

    // Get counts before deletion for reporting
    const equipmentCount = await sql`
      select count(*)::int as count
      from equipment
    `;
    
    const serviceRequestCount = await sql`
      select count(*)::int as count
      from service_request
    `;

    const sparePartsCount = await sql`
      select count(*)::int as count
      from spare_parts
    `;

    const jobOrdersCount = await sql`
      select count(*)::int as count
      from job_orders
    `;

    const beforeCounts = {
      equipment: (equipmentCount[0] as { count: number }).count,
      serviceRequests: (serviceRequestCount[0] as { count: number }).count,
      spareParts: (sparePartsCount[0] as { count: number }).count,
      jobOrders: (jobOrdersCount[0] as { count: number }).count,
    };

    console.log('[Wipe Data] Before deletion counts:', beforeCounts);

    // Hard delete all equipment (inventory)
    const deletedEquipment = await sql`
      delete from equipment
      returning id
    `;

    // Hard delete all service requests
    const deletedServiceRequests = await sql`
      delete from service_request
      returning id
    `;

    // Hard delete all spare parts
    const deletedSpareParts = await sql`
      delete from spare_parts
      returning id
    `;

    // Hard delete all job orders
    const deletedJobOrders = await sql`
      delete from job_orders
      returning id
    `;

    const results = {
      equipment: {
        before: beforeCounts.equipment,
        deleted: deletedEquipment.length,
      },
      serviceRequests: {
        before: beforeCounts.serviceRequests,
        deleted: deletedServiceRequests.length,
      },
      spareParts: {
        before: beforeCounts.spareParts,
        deleted: deletedSpareParts.length,
      },
      jobOrders: {
        before: beforeCounts.jobOrders,
        deleted: deletedJobOrders.length,
      },
    };

    console.log('[Wipe Data] Deletion complete!', results);

    return NextResponse.json({
      success: true,
      message: `Data wipe complete: ${results.equipment.deleted} equipment, ${results.serviceRequests.deleted} service requests, ${results.spareParts.deleted} spare parts, and ${results.jobOrders.deleted} job orders hard deleted (users preserved)`,
      results,
    });
  } catch (error) {
    console.error('[Wipe Data] Error:', error);
    return NextResponse.json(
      { 
        error: 'Data wipe failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
