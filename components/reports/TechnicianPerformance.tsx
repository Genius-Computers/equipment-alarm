'use client';

import { MonthlyReport } from '@/lib/types/report';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Clock, Award } from 'lucide-react';
import { getTechnicianDisplayName, formatHours } from './utils';
import { useLanguage } from '@/hooks/useLanguage';

interface TechnicianPerformanceProps {
  report: MonthlyReport;
}

export function TechnicianPerformance({ report }: TechnicianPerformanceProps) {
  const { t } = useLanguage();

  return (
    <Card className="border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
      <CardHeader className="pb-6 space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-500/10 rounded-xl">
            <Users className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <CardTitle className="text-lg font-semibold text-slate-900 dark:text-slate-50">
              {t('reports.technicians.performance')}
            </CardTitle>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              {t('reports.technicians.title')}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
            <Users className="h-5 w-5 text-indigo-600 dark:text-indigo-400 mb-2" />
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">{report.attendance.totalTechnicians}</p>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{t('reports.technicians.activeTechnicians')}</p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
            <Clock className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mb-2" />
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">
              {formatHours(report.attendance.averageHoursPerDay)}
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{t('reports.technicians.avgHoursPerDay')}</p>
          </div>
        </div>

        {/* Top Performers */}
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-5">
          <h4 className="font-semibold mb-4 text-slate-900 dark:text-slate-100 flex items-center gap-2 text-sm">
            <Award className="h-4 w-4" />
{t('reports.technicians.topPerformers')}
          </h4>
          <div className="space-y-2">
            {report.attendance.byTechnician
              .sort((a, b) => b.completionRate - a.completionRate)
              .slice(0, 5)
              .map((tech, index) => (
                <div key={tech.technician.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-3 flex-1">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-xs ${
                      index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600' :
                      index === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-500' :
                      index === 2 ? 'bg-gradient-to-br from-amber-500 to-amber-700' :
                      'bg-gradient-to-br from-indigo-500 to-purple-600'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 dark:text-slate-100 text-sm truncate">
                        {getTechnicianDisplayName(tech.technician)}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {tech.serviceRequestsCompleted}/{tech.serviceRequestsAssigned} {t('reports.technicians.completed')}
                      </p>
                    </div>
                  </div>
                  <div className="ml-2">
                    <Badge 
                      variant="secondary" 
                      className={`text-xs font-semibold ${
                        tech.completionRate >= 80 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                        tech.completionRate >= 60 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                        'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }`}
                    >
                      {tech.completionRate.toFixed(0)}%
                    </Badge>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
