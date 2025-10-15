import { NextRequest, NextResponse } from 'next/server';
import { getCurrentServerUser } from '@/lib/auth';
import { getDb, ensureSchema } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentServerUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sql = getDb();
    await ensureSchema();

    // Get total count of ALL service requests (including deleted)
    const totalAll = await sql`select count(*) as count from service_request`;
    
    // Get count of non-deleted service requests
    const totalActive = await sql`select count(*) as count from service_request where deleted_at is null`;
    
    // Get count of deleted service requests
    const totalDeleted = await sql`select count(*) as count from service_request where deleted_at is not null`;
    
    // Get latest 10 service requests (including deleted)
    const latest = await sql`
      select 
        id, 
        ticket_id, 
        equipment_id, 
        created_at, 
        deleted_at,
        approval_status,
        work_status
      from service_request 
      order by created_at desc 
      limit 10
    `;

    // Get latest 10 non-deleted service requests
    const latestActive = await sql`
      select 
        id, 
        ticket_id, 
        equipment_id, 
        created_at, 
        deleted_at,
        approval_status,
        work_status
      from service_request 
      where deleted_at is null
      order by created_at desc 
      limit 10
    `;

    return NextResponse.json({
      counts: {
        total: totalAll[0]?.count,
        active: totalActive[0]?.count,
        deleted: totalDeleted[0]?.count,
      },
      latestAll: latest,
      latestActive: latestActive,
    });
  } catch (error: unknown) {
    console.error('[Service Request Debug] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

