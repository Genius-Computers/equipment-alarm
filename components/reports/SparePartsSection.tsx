'use client';

import { MonthlyReport } from '@/lib/types/report';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, Clock, DollarSign, ShoppingCart } from 'lucide-react';
import { formatCurrency } from './utils';

interface SparePartsSectionProps {
  report: MonthlyReport;
}

export function SparePartsSection({ report }: SparePartsSectionProps) {


  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-center gap-4">
        <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg">
          <Package className="h-6 w-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
            Spare Parts Activity
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            {report.period.monthName} {report.period.year} • {report.spareParts.monthlyUsage} parts used
          </p>
        </div>
      </div>

      {/* Key Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/50 dark:to-purple-900/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Parts Used</p>
                <p className="text-3xl font-bold text-purple-700 dark:text-purple-300">{report.spareParts.monthlyUsage}</p>
              </div>
              <Package className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-lg bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/50 dark:to-amber-900/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-amber-600 dark:text-amber-400">Total Cost</p>
                <p className="text-3xl font-bold text-amber-700 dark:text-amber-300">{formatCurrency(report.spareParts.monthlyCost)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Orders Placed</p>
                <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">{report.sparePartOrders.total}</p>
              </div>
              <ShoppingCart className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Requested Parts */}
      {report.spareParts.topRequested.length > 0 && (
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-slate-900 dark:text-slate-50 flex items-center gap-2">
              <Package className="h-5 w-5 text-purple-500" />
              Most Requested Parts
            </CardTitle>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Parts with highest usage this month
            </p>
          </CardHeader>
          <CardContent>
            
            {/* Compact scrollable horizontal bars showing all parts */}
            <div className="max-h-96 overflow-y-auto space-y-2 pr-2 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent">
              {report.spareParts.topRequested.map((item, index) => {
                const maxQty = Math.max(...report.spareParts.topRequested.map(p => p.quantity));
                const percentage = (item.quantity / maxQty) * 100;
                const barWidth = Math.max(percentage, 5); // Smaller minimum width for better space usage
                
                // Color coding based on usage level
                let barColor = '#a78bfa'; // Light purple for low
                let usageText = 'Low';
                
                if (item.quantity >= 10) {
                  barColor = '#7c3aed'; // Dark purple for high
                  usageText = 'High';
                } else if (item.quantity >= 5) {
                  barColor = '#8b5cf6'; // Medium purple for medium
                  usageText = 'Med';
                }
                
                return (
                  <div key={index} className="flex items-center gap-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800/50 rounded-lg transition-colors">
                    <div className="w-32 text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
                      {item.name}
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
                    <div className="flex items-center gap-2 w-24">
                      <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {item.quantity}
                      </span>
                      <span 
                        className="text-xs px-1.5 py-0.5 rounded text-white font-medium"
                        style={{ backgroundColor: barColor }}
                      >
                        {usageText}
                      </span>
                    </div>
                    <div className="w-20 text-xs text-slate-500 dark:text-slate-400 text-right">
                      {formatCurrency(item.cost)}
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Compact legend and summary */}
            <div className="mt-4 p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-200 dark:border-purple-800">
              <div className="flex items-start gap-2">
                <div className="text-purple-600 dark:text-purple-400 mt-0.5">💡</div>
                <div className="flex-1">
                  <p className="text-sm text-purple-900 dark:text-purple-100 font-medium mb-2">
                    Parts Usage Summary
                  </p>
                  <div className="flex flex-wrap gap-4 text-xs mb-2">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full bg-purple-600"></div>
                      <span className="text-purple-800 dark:text-purple-200">High (10+ units)</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                      <span className="text-purple-800 dark:text-purple-200">Medium (5-9 units)</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full bg-purple-400"></div>
                      <span className="text-purple-800 dark:text-purple-200">Low (1-4 units)</span>
                    </div>
                  </div>
                  <div className="text-xs text-purple-700 dark:text-purple-300">
                    Showing {report.spareParts.topRequested.length} parts with usage data. 
                    {report.spareParts.topRequested.length > 10 && ' Scroll to see all parts.'}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Order Processing Metrics */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold text-slate-900 dark:text-slate-50">
            Procurement Performance
          </CardTitle>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Key metrics for spare part orders
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/30 rounded-lg border border-purple-200 dark:border-purple-800/50">
              <div className="flex items-center gap-2 mb-3">
                <Package className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                <h5 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">Total Requested</h5>
              </div>
              <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                {report.sparePartOrders.totalQuantityRequested}
              </p>
            </div>

            <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800/50">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <h5 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">Avg Processing Time</h5>
              </div>
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                {report.sparePartOrders.averageProcessingTime.toFixed(1)}<span className="text-lg text-slate-500">h</span>
              </p>
            </div>

            <div className="p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/30 dark:to-emerald-900/30 rounded-lg border border-emerald-200 dark:border-emerald-800/50">
              <div className="flex items-center gap-2 mb-3">
                <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                <h5 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">Total Cost</h5>
              </div>
              <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(report.sparePartOrders.totalCost)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Order Status Breakdown */}
      {Object.keys(report.sparePartOrders.byStatus).length > 0 && (
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-slate-900 dark:text-slate-50">
              Order Status Breakdown
            </CardTitle>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Distribution of spare part orders by status
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(report.sparePartOrders.byStatus).map(([status, count]) => (
                <div key={status} className="p-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-900/50 rounded-lg text-center border border-slate-200 dark:border-slate-700">
                  <p className="text-sm text-slate-600 dark:text-slate-400 capitalize mb-2">{status.replace('_', ' ')}</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{count}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}