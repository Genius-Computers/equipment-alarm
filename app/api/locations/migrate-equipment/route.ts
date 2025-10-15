import { NextRequest, NextResponse } from 'next/server';
import { migrateEquipmentToNewLocationStructure } from '@/lib/db';
import { getCurrentServerUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentServerUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin privileges (you may want to add role checking here)
    // For now, any authenticated user can trigger migration
    
    console.log(`Starting equipment location migration triggered by user ${user.id}`);
    const result = await migrateEquipmentToNewLocationStructure(user.id);
    
    return NextResponse.json({ 
      success: true,
      message: `Migration completed successfully. Updated ${result.updated} equipment records.`,
      data: result 
    });
  } catch (error: unknown) {
    console.error('Migration error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown migration error';
    return NextResponse.json({ 
      error: errorMessage,
      success: false 
    }, { status: 500 });
  }
}
