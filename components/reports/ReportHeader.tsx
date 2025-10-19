'use client';

import { MonthlyReport } from '@/lib/types/report';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { printReportAsPDF } from '@/lib/pdf-export';
import { useLanguage, getPDFTranslations } from '@/hooks/useLanguage';

interface ReportHeaderProps {
  report: MonthlyReport;
}

export function ReportHeader({ report }: ReportHeaderProps) {
  const { t, language } = useLanguage();

  const handleExportPDF = () => {
    try {
      const translations = getPDFTranslations(language);
      printReportAsPDF(report, { translations });
    } catch (error) {
      console.error('Failed to export PDF:', error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-2xl">
              {t('reports.header.title', { 
                month: report.period.monthName, 
                year: report.period.year 
              })}
            </CardTitle>
            {report.location && (
              <p className="text-muted-foreground mt-1">
                {t('reports.header.location', { 
                  campus: report.location.campus, 
                  name: report.location.name 
                })}
              </p>
            )}
            <p className="text-sm text-muted-foreground mt-2">
              {t('reports.generatedOn', { 
                date: new Date(report.generatedAt).toLocaleDateString(), 
                user: report.generatedBy 
              })}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExportPDF}>
              <Download className="h-4 w-4 mr-2" />
              {t('reports.exportPDF')}
            </Button>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}
