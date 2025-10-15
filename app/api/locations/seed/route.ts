import { NextRequest, NextResponse } from 'next/server';
import { getCurrentServerUser } from '@/lib/auth';
import { insertLocation, deleteAllLocations } from '@/lib/db';

// Initial locations for Main Campus - English names with Arabic translations
const MAIN_CAMPUS_LOCATIONS = [
  { name: "College of Medicine", nameAr: "كلية الطب" },
  { name: "College of Dentistry", nameAr: "كلية طب الأسنان" },
  { name: "Pharmacy", nameAr: "كلية الصيدلة" },
  { name: "Nursing", nameAr: "كلية التمريض" },
  { name: "Applied Medical Sciences", nameAr: "كلية العلوم الطبية التطبيقية" },
  { name: "Public Health and Health Informatics", nameAr: "كلية الصحة العامة والمعلوماتية الصحية" },
  { name: "Sciences", nameAr: "كلية العلوم" },
  { name: "Diagnostics and Research", nameAr: "مركز التشخيص والبحوث" },
  { name: "University Clinics", nameAr: "العيادات الجامعية" },
];

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentServerUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Step 1: Clear all existing locations
    const deletedCount = await deleteAllLocations(user.id);

    // Step 2: Add the new locations
    const results = {
      added: [] as string[],
      errors: [] as string[],
    };

    for (const location of MAIN_CAMPUS_LOCATIONS) {
      try {
        await insertLocation('Main Campus', location.name, user.id, location.nameAr);
        results.added.push(`${location.name} / ${location.nameAr}`);
      } catch (error) {
        results.errors.push(`${location.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Locations reset successfully',
      results,
      summary: {
        deleted: deletedCount,
        total: MAIN_CAMPUS_LOCATIONS.length,
        added: results.added.length,
        errors: results.errors.length,
      }
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

