'use client';

import { useState } from 'react';
import { MonthlyReportFilters } from '@/components/MonthlyReportFilters';
import { MonthlyReportView } from '@/components/MonthlyReportView';
import { MonthlyReport } from '@/lib/types/report';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, BarChart3, TrendingUp, Activity } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

export default function MonthlyReportPage() {
  const { t } = useLanguage();
  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateReport = async (filters: { month: number; year: number; locationId?: string }) => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        month: filters.month.toString(),
        year: filters.year.toString(),
        ...(filters.locationId && { locationId: filters.locationId })
      });

      const response = await fetch(`/api/reports/monthly?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to generate report');
      }
      
      const reportData = await response.json();
      setReport(reportData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto p-6 space-y-8">
        {/* Header Section */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 p-8 text-white">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <BarChart3 className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-4xl font-bold">{t("reports.page.title")}</h1>
                <p className="text-blue-100 text-lg">
                  {t("reports.page.subtitle")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                <span>{t("reports.page.realTimeAnalytics")}</span>
              </div>
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                <span>{t("reports.page.interactiveCharts")}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <MonthlyReportFilters 
            onGenerate={handleGenerateReport} 
            loading={loading}
          />
        </div>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive" className="border-red-200 bg-red-50 dark:bg-red-950">
            <AlertDescription className="text-red-800 dark:text-red-200">{error}</AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {loading && (
          <Card className="border-slate-200 dark:border-slate-700 shadow-lg">
            <CardContent className="flex items-center justify-center py-16">
              <div className="text-center space-y-4">
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-blue-200 rounded-full animate-spin border-t-blue-600 mx-auto"></div>
                  <Loader2 className="h-8 w-8 animate-spin absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{t("reports.page.generating")}</h3>
                  <p className="text-slate-600 dark:text-slate-400">{t("reports.page.generatingDesc")}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Report Display */}
        {report && !loading && (
          <div className="space-y-6">
            <MonthlyReportView 
              report={report}
            />
          </div>
        )}

        {/* Empty State */}
        {!report && !loading && !error && (
          <Card className="border-slate-200 dark:border-slate-700 shadow-lg">
            <CardContent className="flex items-center justify-center py-20">
              <div className="text-center space-y-6 max-w-md">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 rounded-full flex items-center justify-center mx-auto">
                  <BarChart3 className="h-10 w-10 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{t("reports.page.readyToGenerate")}</h3>
                  <p className="text-slate-600 dark:text-slate-400 text-lg">
                    {t("reports.page.readyToGenerateDesc")}
                  </p>
                </div>
                <div className="flex items-center justify-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span>{t("reports.page.equipmentAnalytics")}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>{t("reports.page.serviceRequests")}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <span>{t("reports.page.spareParts")}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

