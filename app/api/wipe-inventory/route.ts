import { NextRequest, NextResponse } from 'next/server';
import { getCurrentServerUser } from '@/lib/auth';
import { getDb, ensureSchema } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentServerUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can wipe data
    const role = user.clientReadOnlyMetadata?.role as string | undefined;
    if (role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin only' }, { status: 403 });
    }

    const sql = getDb();
    await ensureSchema();

    console.log('[Wipe Inventory] Starting data wipe...');

    // Delete all service requests (will cascade to related data)
    const deletedServiceRequests = await sql`
      delete from service_request
      returning id
    `;
    console.log(`[Wipe Inventory] Deleted ${deletedServiceRequests.length} service requests`);

    // Delete all job orders
    const deletedJobOrders = await sql`
      delete from job_orders
      returning id
    `;
    console.log(`[Wipe Inventory] Deleted ${deletedJobOrders.length} job orders`);

    // Delete all equipment
    const deletedEquipment = await sql`
      delete from equipment
      returning id
    `;
    console.log(`[Wipe Inventory] Deleted ${deletedEquipment.length} equipment items`);

    // Delete all spare parts
    const deletedSpareParts = await sql`
      delete from spare_parts
      returning id
    `;
    console.log(`[Wipe Inventory] Deleted ${deletedSpareParts.length} spare parts`);

    console.log('[Wipe Inventory] Data wipe complete!');

    return NextResponse.json({
      success: true,
      deleted: {
        serviceRequests: deletedServiceRequests.length,
        jobOrders: deletedJobOrders.length,
        equipment: deletedEquipment.length,
        spareParts: deletedSpareParts.length,
      }
    });
  } catch (error: unknown) {
    console.error('[Wipe Inventory] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

