import { NextRequest, NextResponse } from 'next/server';
import { generateMonthlyReport } from '@/lib/db/reports';
import { ReportFilters } from '@/lib/types/report';
import { ensureSchema } from '@/lib/db/schema';

export async function GET(request: NextRequest) {
  try {
    // Ensure database schema exists (safe + idempotent on Vercel/Neon)
    await ensureSchema();

    const { searchParams } = new URL(request.url);

    const month = parseInt(searchParams.get('month') || '');
    const year = parseInt(searchParams.get('year') || '');
    const locationId = searchParams.get('locationId') || undefined;

    // Validate required parameters
    if (!month || !year || month < 1 || month > 12) {
      return NextResponse.json(
        { error: 'Invalid month or year parameters' },
        { status: 400 }
      );
    }

    const filters: ReportFilters = {
      month,
      year,
      locationId,
    };

    const report = await generateMonthlyReport(filters);

    return NextResponse.json(report);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error generating monthly report:', message, error);

    return NextResponse.json(
      {
        error: 'Failed to generate report',
        // Surface underlying reason only in non-production to aid debugging
        details: process.env.NODE_ENV !== 'production' ? message : undefined,
      },
      { status: 500 }
    );
  }
}

