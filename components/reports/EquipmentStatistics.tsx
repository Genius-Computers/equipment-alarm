'use client';

import { MonthlyReport } from '@/lib/types/report';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wrench, Plus, AlertTriangle, Activity } from 'lucide-react';
import { 
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell
} from 'recharts';
import { ChartContainer, ChartTooltip } from '@/components/ui/chart';
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

  const chartConfig = {
    count: {
      label: t('reports.equipment.serviceRequests'),
      color: "#3b82f6",
    }
  };

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
              <p className="text-sm text-blue-100 font-medium">New Equipment Added</p>
            </div>
          </div>
          
          <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-6 text-white shadow-lg hover:shadow-xl transition-shadow">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-12 translate-x-12"></div>
            <div className="relative">
              <Activity className="h-8 w-8 mb-3 opacity-90" />
              <p className="text-4xl font-bold mb-1">{Object.keys(report.serviceRequests.byEquipment).length}</p>
              <p className="text-sm text-emerald-100 font-medium">Equipment Serviced</p>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 p-6 text-white shadow-lg hover:shadow-xl transition-shadow">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-12 translate-x-12"></div>
            <div className="relative">
              <Wrench className="h-8 w-8 mb-3 opacity-90" />
              <p className="text-4xl font-bold mb-1">{serviceRequestRate}%</p>
              <p className="text-sm text-violet-100 font-medium">Service Request Rate</p>
            </div>
          </div>
        </div>

        {/* Equipment with Most Service Requests */}
        {equipmentWithServiceRequests.length > 0 && (
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-base">
                Equipment with Most Service Requests
              </h4>
            </div>
            <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent">
              <div className="min-w-[600px]">
                <ChartContainer config={chartConfig} className="h-[380px] w-full">
                  <BarChart data={equipmentWithServiceRequests} margin={{ top: 30, right: 20, left: 20, bottom: 120 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" vertical={false} />
                    <XAxis 
                      dataKey="equipment"
                      className="text-xs text-slate-600 dark:text-slate-400 font-medium"
                      tickLine={false}
                      axisLine={false}
                      angle={-45}
                      textAnchor="end"
                      height={120}
                      interval={0}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis 
                      className="text-xs text-slate-600 dark:text-slate-400"
                      tickLine={false}
                      axisLine={false}
                      label={{ value: 'Service Requests', angle: -90, position: 'insideLeft', className: 'text-xs text-slate-600 dark:text-slate-400 fill-slate-600 dark:fill-slate-400' }}
                    />
                    <ChartTooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-white dark:bg-slate-800 p-4 border-2 border-blue-200 dark:border-blue-700 rounded-lg shadow-xl max-w-xs">
                              <p className="font-bold text-slate-900 dark:text-slate-100 text-base mb-2 break-words">{data.equipment}</p>
                              <p className="text-sm text-slate-700 dark:text-slate-300">
                                <span className="font-semibold">Service Requests:</span> {data.count}
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar
                      dataKey="count"
                      fill="#3b82f6"
                      radius={[8, 8, 0, 0]}
                      label={{
                        position: 'top',
                        className: 'fill-slate-700 dark:fill-slate-300 font-bold text-sm',
                        formatter: (value: number) => value
                      }}
                    >
                      {equipmentWithServiceRequests.map((entry, index) => {
                        const maxCount = Math.max(...equipmentWithServiceRequests.map(e => e.count));
                        const intensity = (entry.count / maxCount);
                        const color = intensity > 0.7 ? '#dc2626' : intensity > 0.4 ? '#f59e0b' : '#3b82f6';
                        return <Cell key={`cell-${index}`} fill={color} />;
                      })}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: '#dc2626' }}></div>
                  <span className="text-slate-700 dark:text-slate-300 font-medium">High (70%+)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: '#f59e0b' }}></div>
                  <span className="text-slate-700 dark:text-slate-300 font-medium">Medium (40-70%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: '#3b82f6' }}></div>
                  <span className="text-slate-700 dark:text-slate-300 font-medium">Low (&lt;40%)</span>
                </div>
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-blue-900 dark:text-blue-100 font-medium">
                    ⚠️ Equipment requiring frequent service may indicate maintenance issues or high usage patterns
                  </p>
                  <span className="hidden sm:block text-xs text-blue-600 dark:text-blue-400 ml-4">← Scroll to see more equipment →</span>
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
                  Current Maintenance Status <span className="text-xs font-normal text-amber-600 dark:text-amber-400">(Reference Only)</span>
                </h5>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white dark:bg-slate-900 p-3 rounded-lg">
                    <p className="text-xs text-amber-700 dark:text-amber-300 mb-1">Maintenance Due</p>
                    <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{report.equipment.maintenanceDue}</p>
                  </div>
                  <div className="bg-white dark:bg-slate-900 p-3 rounded-lg">
                    <p className="text-xs text-amber-700 dark:text-amber-300 mb-1">Overdue</p>
                    <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{report.equipment.maintenanceOverdue}</p>
                  </div>
                </div>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-3">
                  * Current state at time of report generation, not specific to reporting period
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
