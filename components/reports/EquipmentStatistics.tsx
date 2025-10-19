'use client';

import { MonthlyReport } from '@/lib/types/report';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wrench, Plus, AlertTriangle, Activity } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

interface EquipmentStatisticsProps {
  report: MonthlyReport;
}

export function EquipmentStatistics({ report }: EquipmentStatisticsProps) {
  const { t } = useLanguage();

  // Equipment that had service requests this month (top 10)
  const equipmentWithServiceRequests = Object.entries(report.serviceRequests.byEquipment)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([equipment, count]) => ({
      equipment: equipment.length > 25 ? equipment.substring(0, 25) + '...' : equipment,
      count
    }));


  // Calculate service request rate
  const serviceRequestRate = report.equipment.total > 0 
    ? ((report.summary.totalServiceRequests / report.equipment.total) * 100).toFixed(1)
    : '0';

  return (
    <Card className="border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
      <CardHeader className="pb-6 space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-500/10 rounded-xl">
            <Wrench className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <CardTitle className="text-lg font-semibold text-slate-900 dark:text-slate-50">
              {t('reports.equipment.activity')}
            </CardTitle>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              {report.period.monthName} {report.period.year}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Monthly Activity Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 p-6 text-white shadow-lg hover:shadow-xl transition-shadow">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-12 translate-x-12"></div>
            <div className="relative">
              <Plus className="h-8 w-8 mb-3 opacity-90" />
              <p className="text-4xl font-bold mb-1">{report.equipment.newThisMonth}</p>
              <p className="text-sm text-blue-100 font-medium">{t('reports.equipment.newEquipmentAdded')}</p>
            </div>
          </div>
          
          <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-6 text-white shadow-lg hover:shadow-xl transition-shadow">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-12 translate-x-12"></div>
            <div className="relative">
              <Activity className="h-8 w-8 mb-3 opacity-90" />
              <p className="text-4xl font-bold mb-1">{Object.keys(report.serviceRequests.byEquipment).length}</p>
              <p className="text-sm text-emerald-100 font-medium">{t('reports.equipment.equipmentServiced')}</p>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 p-6 text-white shadow-lg hover:shadow-xl transition-shadow">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-12 translate-x-12"></div>
            <div className="relative">
              <Wrench className="h-8 w-8 mb-3 opacity-90" />
              <p className="text-4xl font-bold mb-1">{serviceRequestRate}%</p>
              <p className="text-sm text-violet-100 font-medium">{t('reports.equipment.serviceRequestRate')}</p>
            </div>
          </div>
        </div>

        {/* Equipment with Most Service Requests */}
        {equipmentWithServiceRequests.length > 0 && (
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-base">
                {t('reports.equipment.equipmentWithMostServiceRequests')}
              </h4>
            </div>
            
            {/* Compact scrollable horizontal bars showing all equipment */}
            <div className="max-h-96 overflow-y-auto space-y-2 pr-2 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent">
              {equipmentWithServiceRequests.map((item, index) => {
                const maxCount = Math.max(...equipmentWithServiceRequests.map(e => e.count));
                const percentage = (item.count / maxCount) * 100;
                const barWidth = Math.max(percentage, 5); // Smaller minimum width for better space usage
                
                // Simple color coding based on actual count
                let barColor = '#3b82f6'; // Blue for low
                let priorityText = t('priority.low');
                
                if (item.count >= 3) {
                  barColor = '#dc2626'; // Red for high
                  priorityText = t('priority.high');
                } else if (item.count >= 2) {
                  barColor = '#f59e0b'; // Orange for medium
                  priorityText = t('priority.med');
                }
                
                return (
                  <div key={index} className="flex items-center gap-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800/50 rounded-lg transition-colors">
                    <div className="w-32 text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
                      {item.equipment}
                    </div>
                    <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500 ease-out"
                        style={{ 
                          width: `${barWidth}%`,
                          backgroundColor: barColor
                        }}
                      />
                    </div>
                    <div className="flex items-center gap-2 w-20">
                      <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {item.count}
                      </span>
                      <span 
                        className="text-xs px-1.5 py-0.5 rounded text-white font-medium"
                        style={{ backgroundColor: barColor }}
                      >
                        {priorityText}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Compact legend and summary */}
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-start gap-2">
                <div className="text-blue-600 dark:text-blue-400 mt-0.5">💡</div>
                <div className="flex-1">
                  <p className="text-sm text-blue-900 dark:text-blue-100 font-medium mb-2">
                    {t('reports.equipment.serviceRequestSummary')}
                  </p>
                  <div className="flex flex-wrap gap-4 text-xs mb-2">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <span className="text-blue-800 dark:text-blue-200">{t('reports.equipment.highRequests')}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                      <span className="text-blue-800 dark:text-blue-200">{t('reports.equipment.mediumRequests')}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                      <span className="text-blue-800 dark:text-blue-200">{t('reports.equipment.lowRequests')}</span>
                    </div>
                  </div>
                  <div className="text-xs text-blue-700 dark:text-blue-300">
                    {t('reports.equipment.showingEquipment', { count: equipmentWithServiceRequests.length })}
                    {equipmentWithServiceRequests.length > 10 && ` ${t('reports.equipment.scrollToSeeMore')}`}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Current Maintenance Alert (Reference Only) */}
        {(report.equipment.maintenanceDue > 0 || report.equipment.maintenanceOverdue > 0) && (
          <div className="p-5 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800/50">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1">
                <h5 className="font-semibold text-amber-900 dark:text-amber-100 mb-3 text-sm">
                  {t('reports.equipment.currentMaintenanceStatus')} <span className="text-xs font-normal text-amber-600 dark:text-amber-400">{t('reports.equipment.referenceOnly')}</span>
                </h5>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white dark:bg-slate-900 p-3 rounded-lg">
                    <p className="text-xs text-amber-700 dark:text-amber-300 mb-1">{t('reports.equipment.maintenanceDue')}</p>
                    <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{report.equipment.maintenanceDue}</p>
                  </div>
                  <div className="bg-white dark:bg-slate-900 p-3 rounded-lg">
                    <p className="text-xs text-amber-700 dark:text-amber-300 mb-1">{t('reports.equipment.overdue')}</p>
                    <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{report.equipment.maintenanceOverdue}</p>
                  </div>
                </div>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-3">
                  {t('reports.equipment.currentStateNote')}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
