'use client';

import { MonthlyReport } from '@/lib/types/report';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, Clock, DollarSign, ShoppingCart } from 'lucide-react';
import { 
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell
} from 'recharts';
import { ChartContainer, ChartTooltip } from '@/components/ui/chart';
import { formatCurrency } from './utils';
import { useLanguage } from '@/hooks/useLanguage';

interface SparePartsSectionProps {
  report: MonthlyReport;
}

export function SparePartsSection({ report }: SparePartsSectionProps) {
  const { t } = useLanguage();

  const chartConfig = {
    quantity: {
      label: t('reports.spareParts.quantityUsed'),
      color: "#8b5cf6",
    }
  };

  return (
    <Card className="border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
      <CardHeader className="pb-6 space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-purple-500/10 rounded-xl">
            <Package className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <CardTitle className="text-lg font-semibold text-slate-900 dark:text-slate-50">
              {t('reports.spareParts.activity')}
            </CardTitle>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              {report.period.monthName} {report.period.year}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Monthly Activity Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
            <Package className="h-5 w-5 text-purple-600 dark:text-purple-400 mb-2" />
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">{report.spareParts.monthlyUsage}</p>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{t('reports.spareParts.partsUsed')}</p>
          </div>
          
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
            <DollarSign className="h-5 w-5 text-amber-600 dark:text-amber-400 mb-2" />
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">{formatCurrency(report.spareParts.monthlyCost)}</p>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{t('reports.spareParts.totalCost')}</p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
            <ShoppingCart className="h-5 w-5 text-blue-600 dark:text-blue-400 mb-2" />
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">{report.sparePartOrders.total}</p>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{t('reports.spareParts.ordersPlaced')}</p>
          </div>
        </div>

        {/* Top Requested Parts */}
        {report.spareParts.topRequested.length > 0 && (
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Package className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-base">
                {t('reports.spareParts.mostRequestedParts')}
              </h4>
            </div>
            <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent">
              <div className="min-w-[600px]">
                <ChartContainer config={chartConfig} className="h-[320px] w-full">
                  <BarChart data={report.spareParts.topRequested.slice(0, 10)} margin={{ top: 30, right: 20, left: 20, bottom: 100 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" vertical={false} />
                    <XAxis 
                      dataKey="name"
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
                      label={{ value: t('reports.spareParts.quantityUsed'), angle: -90, position: 'insideLeft', className: 'text-xs text-slate-600 dark:text-slate-400 fill-slate-600 dark:fill-slate-400' }}
                    />
                    <ChartTooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-white dark:bg-slate-800 p-4 border-2 border-purple-200 dark:border-purple-700 rounded-lg shadow-xl max-w-xs">
                              <p className="font-bold text-slate-900 dark:text-slate-100 text-base mb-2 break-words">{data.name}</p>
                              <div className="space-y-1">
                                <p className="text-sm text-slate-700 dark:text-slate-300">
                                  <span className="font-semibold">{t('reports.spareParts.quantity')}:</span> {data.quantity} {t('reports.spareParts.units')}
                                </p>
                                <p className="text-sm text-slate-700 dark:text-slate-300">
                                  <span className="font-semibold">{t('reports.spareParts.cost')}:</span> {formatCurrency(data.cost)}
                                </p>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar
                      dataKey="quantity"
                      fill="#8b5cf6"
                      radius={[8, 8, 0, 0]}
                      label={{
                        position: 'top',
                        className: 'fill-slate-700 dark:fill-slate-300 font-bold text-sm',
                        formatter: (value: number) => value
                      }}
                    >
                      {report.spareParts.topRequested.slice(0, 10).map((entry, index) => {
                        const maxQty = Math.max(...report.spareParts.topRequested.map(p => p.quantity));
                        const intensity = (entry.quantity / maxQty);
                        const color = intensity > 0.7 ? '#7c3aed' : intensity > 0.4 ? '#8b5cf6' : '#a78bfa';
                        return <Cell key={`cell-${index}`} fill={color} />;
                      })}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>💡 {t('reports.spareParts.highDemandParts')}</span>
                <span className="hidden sm:block">{t('reports.spareParts.scrollToSeeMore')}</span>
              </div>
            </div>
          </div>
        )}

        {/* Order Processing Metrics */}
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-5">
          <h4 className="font-semibold mb-4 text-slate-900 dark:text-slate-100 text-sm">
            {t('reports.spareParts.procurementPerformance')}
          </h4>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Package className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">{t('reports.spareParts.requested')}</p>
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {report.sparePartOrders.totalQuantityRequested}
              </p>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">{t('reports.spareParts.avgTime')}</p>
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {report.sparePartOrders.averageProcessingTime.toFixed(1)}<span className="text-sm text-slate-500">h</span>
              </p>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">{t('reports.spareParts.cost')}</p>
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {formatCurrency(report.sparePartOrders.totalCost)}
              </p>
            </div>
          </div>
        </div>

        {/* Order Status Breakdown */}
        {Object.keys(report.sparePartOrders.byStatus).length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {Object.entries(report.sparePartOrders.byStatus).map(([status, count]) => (
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