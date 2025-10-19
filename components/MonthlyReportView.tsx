'use client';

import { MonthlyReport } from '@/lib/types/report';
import { 
  ReportHeader,
  SummaryCards,
  EquipmentStatistics,
  ServiceRequestsAnalysis,
  JobOrdersSummary,
  SparePartsSection,
  TechnicianPerformance
} from './reports';

interface MonthlyReportViewProps {
  report: MonthlyReport;
}

export function MonthlyReportView({ report }: MonthlyReportViewProps) {
  return (
    <div className="space-y-6 pb-8">
      {/* Header with Print Button */}
      <ReportHeader report={report} />
      
      {/* Executive Summary Cards */}
      <SummaryCards report={report} />

      {/* Equipment Overview - Full Width */}
      <EquipmentStatistics report={report} />

      {/* Service Operations - Two Column */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <ServiceRequestsAnalysis report={report} />
        <TechnicianPerformance report={report} />
      </div>

      {/* Inventory & Procurement - Two Column */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <SparePartsSection report={report} />
        <JobOrdersSummary report={report} />
      </div>
    </div>
  );
}

