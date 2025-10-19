import { NextRequest, NextResponse } from 'next/server';
import { generateMonthlyReport } from '@/lib/db/reports';
import { ReportFilters } from '@/lib/types/report';

export async function GET(request: NextRequest) {
  try {
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
      locationId
    };
    
    const report = await generateMonthlyReport(filters);
    
    return NextResponse.json(report);
  } catch (error) {
    console.error('Error generating monthly report:', error);
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}

