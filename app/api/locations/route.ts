import { NextRequest, NextResponse } from 'next/server';
import { getCurrentServerUser } from '@/lib/auth';
import { listLocationsByCampus, insertLocation } from '@/lib/db';
import { snakeToCamelCase } from '@/lib/utils';
import { VALID_CAMPUSES } from '@/lib/config';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentServerUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const campus = searchParams.get('campus');

    if (!campus) {
      return NextResponse.json({ error: 'Campus parameter is required' }, { status: 400 });
    }

    if (!VALID_CAMPUSES.includes(campus)) {
      return NextResponse.json({ 
        error: `Invalid campus. Must be one of: ${VALID_CAMPUSES.join(', ')}` 
      }, { status: 400 });
    }

    const locations = await listLocationsByCampus(campus);
    const mapped = locations.map((loc) => snakeToCamelCase(loc));
    
    return NextResponse.json({ data: mapped });
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
    const { campus, name } = body;

    if (!campus || !name) {
      return NextResponse.json({ 
        error: 'Campus and name are required' 
      }, { status: 400 });
    }

    if (!VALID_CAMPUSES.includes(campus)) {
      return NextResponse.json({ 
        error: `Invalid campus. Must be one of: ${VALID_CAMPUSES.join(', ')}` 
      }, { status: 400 });
    }

    const newLocation = await insertLocation(campus, name.trim(), user.id);
    const mapped = snakeToCamelCase(newLocation);
    
    return NextResponse.json({ data: mapped }, { status: 201 });
  } catch (error: unknown) {
    // Check for unique constraint violation
    if (error instanceof Error && error.message.includes('unique')) {
      return NextResponse.json({ 
        error: 'A location with this name already exists for this campus' 
      }, { status: 409 });
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}


