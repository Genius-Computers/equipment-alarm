import { NextRequest, NextResponse } from 'next/server';
import { getCurrentServerUser } from '@/lib/auth';
import { listAllLocations } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentServerUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const locations = await listAllLocations();
    
    // Return raw data to see what's actually stored
    return NextResponse.json({ 
      count: locations.length,
      locations: locations.map(loc => ({
        id: loc.id,
        campus: loc.campus,
        name: loc.name,
        name_ar: loc.name_ar || null,
        created_at: loc.created_at
      }))
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

