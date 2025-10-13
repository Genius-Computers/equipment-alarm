import { NextRequest, NextResponse } from 'next/server';
import { getCurrentServerUser } from '@/lib/auth';
import { getDb, ensureSchema, findOrCreateLocation } from '@/lib/db';
import { VALID_CAMPUSES } from '@/lib/config';
import { canManageUsers } from '@/lib/types/user';

// One-time migration endpoint to sync equipment sublocations to locations table
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentServerUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can run migrations
    const role = user?.serverMetadata?.role || user?.clientReadOnlyMetadata?.role as string | undefined;
    if (!canManageUsers(role)) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const sql = getDb();
    await ensureSchema();

    console.log('[Migration] Starting location migration...');

    // Get all unique campus/sublocation pairs from equipment table
    const rows = await sql`
      select distinct location, sub_location
      from equipment
      where location is not null
        and sub_location is not null
        and sub_location != ''
        and deleted_at is null
      order by location, sub_location
    `;

    console.log('[Migration] Found', rows.length, 'unique location pairs');

    // Filter to only valid campuses
    const validPairs = (rows as Array<{ location: string; sub_location: string }>).filter((row) => 
      VALID_CAMPUSES.includes(row.location as typeof VALID_CAMPUSES[number])
    );

    console.log('[Migration] Filtered to', validPairs.length, 'valid campus pairs');

    const results = {
      total: validPairs.length,
      created: 0,
      existed: 0,
      failed: 0,
      details: [] as Array<{ campus: string; sublocation: string; status: string }>,
    };

    // Create location entries for each unique pair
    for (const row of validPairs) {
      const campus = row.location;
      const sublocation = row.sub_location;

      try {
        console.log('[Migration] Processing:', campus, '→', sublocation);
        
        // Check if it already exists
        const existing = await sql`
          select id from locations
          where campus = ${campus}
            and name = ${sublocation}
            and deleted_at is null
          limit 1
        `;

        if (existing && existing.length > 0) {
          console.log('[Migration] Already exists:', campus, '→', sublocation);
          results.existed++;
          results.details.push({
            campus,
            sublocation,
            status: 'already_exists',
          });
        } else {
          // Create it
          await findOrCreateLocation(campus, sublocation, user.id);
          console.log('[Migration] Created:', campus, '→', sublocation);
          results.created++;
          results.details.push({
            campus,
            sublocation,
            status: 'created',
          });
        }
      } catch (error) {
        console.error('[Migration] Failed to create:', campus, '→', sublocation, error);
        results.failed++;
        results.details.push({
          campus,
          sublocation,
          status: `failed: ${error instanceof Error ? error.message : 'unknown error'}`,
        });
      }
    }

    console.log('[Migration] Complete!', results);

    return NextResponse.json({
      success: true,
      message: `Migration complete: ${results.created} created, ${results.existed} already existed, ${results.failed} failed`,
      results,
    });
  } catch (error) {
    console.error('[Migration] Error:', error);
    return NextResponse.json(
      { 
        error: 'Migration failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}


