import { NextResponse } from 'next/server';
import { ensureSchema } from '@/lib/db/schema';

export async function POST() {
  try {
    console.log('[MIGRATION] Starting database migration...');
    
    await ensureSchema();
    
    console.log('[MIGRATION] Database migration completed successfully');
    
    return NextResponse.json({ 
      success: true, 
      message: 'Database migration completed successfully' 
    });
  } catch (error) {
    console.error('[MIGRATION] Database migration failed:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Database migration failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Database migration endpoint. Use POST to run migrations.' 
  });
}
