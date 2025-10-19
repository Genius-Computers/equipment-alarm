'use client';

import { MonthlyReport } from '@/lib/types/report';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, MapPin, FileText } from 'lucide-react';
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

interface JobOrdersSummaryProps {
  report: MonthlyReport;
}

export function JobOrdersSummary({ report }: JobOrdersSummaryProps) {
  const { t } = useLanguage();

  const chartConfig = {
    count: {
      label: t('reports.jobOrders.jobOrders'),
      color: "#8b5cf6",
    }
  };

  return (
    <Card className="border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
      <CardHeader className="pb-6 space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-500/10 rounded-xl">
            <Package className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <CardTitle className="text-lg font-semibold text-slate-900 dark:text-slate-50">
              Job Orders
            </CardTitle>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              {report.period.monthName} {report.period.year}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
            <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400 mb-2" />
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">{report.jobOrders.total}</p>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{t('reports.jobOrders.totalOrders')}</p>
          </div>
          
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
            <Package className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mb-2" />
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">{report.jobOrders.totalEquipmentItems}</p>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{t('reports.jobOrders.equipmentItems')}</p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
            <MapPin className="h-5 w-5 text-violet-600 dark:text-violet-400 mb-2" />
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">{report.jobOrders.mostActiveSublocations.length}</p>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{t('reports.jobOrders.locationsServed')}</p>
          </div>
        </div>

        {/* Most Active Sublocations */}
        {report.jobOrders.mostActiveSublocations.length > 0 && (
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-base">
                Most Active Locations
              </h4>
            </div>
            <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent">
              <div className="min-w-[600px]">
                <ChartContainer config={chartConfig} className="h-[320px] w-full">
                  <BarChart data={report.jobOrders.mostActiveSublocations.slice(0, 10)} margin={{ top: 30, right: 20, left: 20, bottom: 100 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" vertical={false} />
                    <XAxis 
                      dataKey="sublocation"
                      className="text-xs text-slate-600 dark:text-slate-400 font-medium"
                      tickLine={false}
                      axisLine={false}
                      angle={-45}
                      textAnchor="end"
                      height={100}
                      interval={0}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis 
                      className="text-xs text-slate-600 dark:text-slate-400"
                      tickLine={false}
                      axisLine={false}
                      label={{ value: 'Job Orders', angle: -90, position: 'insideLeft', className: 'text-xs text-slate-600 dark:text-slate-400 fill-slate-600 dark:fill-slate-400' }}
                    />
                    <ChartTooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-white dark:bg-slate-800 p-4 border-2 border-indigo-200 dark:border-indigo-700 rounded-lg shadow-xl max-w-xs">
                              <p className="font-bold text-slate-900 dark:text-slate-100 text-base mb-2 break-words">{data.sublocation}</p>
                              <p className="text-sm text-slate-700 dark:text-slate-300">
                                <span className="font-semibold">Job Orders:</span> {data.count}
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar
                      dataKey="count"
                      fill="#8b5cf6"
                      radius={[8, 8, 0, 0]}
                      label={{
                        position: 'top',
                        className: 'fill-slate-700 dark:fill-slate-300 font-bold text-sm',
                        formatter: (value: number) => value
                      }}
                    >
                      {report.jobOrders.mostActiveSublocations.slice(0, 10).map((entry, index) => {
                        const maxCount = Math.max(...report.jobOrders.mostActiveSublocations.map(l => l.count));
                        const intensity = (entry.count / maxCount);
                        const color = intensity > 0.7 ? '#6366f1' : intensity > 0.4 ? '#818cf8' : '#a5b4fc';
                        return <Cell key={`cell-${index}`} fill={color} />;
                      })}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>📍 Locations with high job order activity</span>
                <span className="hidden sm:block">← Scroll to see more locations →</span>
              </div>
            </div>
          </div>
        )}

        {/* Status Breakdown */}
        {Object.keys(report.jobOrders.byStatus).length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {Object.entries(report.jobOrders.byStatus).map(([status, count]) => (
              <div key={status} className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 text-center">
                <p className="text-xs text-slate-600 dark:text-slate-400 capitalize mb-1">{status.replace('_', ' ')}</p>
                <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{count}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
