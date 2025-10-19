'use client';

import { MonthlyReport } from '@/lib/types/report';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, MapPin, FileText } from 'lucide-react';

interface JobOrdersSummaryProps {
  report: MonthlyReport;
}

export function JobOrdersSummary({ report }: JobOrdersSummaryProps) {


  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-center gap-4">
        <div className="p-3 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl shadow-lg">
          <Package className="h-6 w-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
            Job Orders Summary
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            {report.period.monthName} {report.period.year} • {report.jobOrders.total} total orders
          </p>
        </div>
      </div>

      {/* Key Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Orders</p>
                <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">{report.jobOrders.total}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/50 dark:to-emerald-900/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Equipment Items</p>
                <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-300">{report.jobOrders.totalEquipmentItems}</p>
              </div>
              <Package className="h-8 w-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-violet-50 to-violet-100 dark:from-violet-950/50 dark:to-violet-900/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-violet-600 dark:text-violet-400">Active Locations</p>
                <p className="text-3xl font-bold text-violet-700 dark:text-violet-300">{report.jobOrders.mostActiveSublocations.length}</p>
              </div>
              <MapPin className="h-8 w-8 text-violet-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Most Active Sublocations */}
      {report.jobOrders.mostActiveSublocations.length > 0 && (
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-slate-900 dark:text-slate-50 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-indigo-500" />
              Most Active Locations
            </CardTitle>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Locations with the most job orders this month
            </p>
          </CardHeader>
          <CardContent>
            
            {/* Compact scrollable horizontal bars showing all locations */}
            <div className="max-h-96 overflow-y-auto space-y-2 pr-2 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent">
              {report.jobOrders.mostActiveSublocations.map((item, index) => {
                const maxCount = Math.max(...report.jobOrders.mostActiveSublocations.map(l => l.count));
                const percentage = (item.count / maxCount) * 100;
                const barWidth = Math.max(percentage, 5); // Smaller minimum width for better space usage
                
                // Color coding based on activity level
                let barColor = '#a5b4fc'; // Light indigo for low
                let activityText = 'Low';
                
                if (item.count >= 5) {
                  barColor = '#6366f1'; // Dark indigo for high
                  activityText = 'High';
                } else if (item.count >= 3) {
                  barColor = '#818cf8'; // Medium indigo for medium
                  activityText = 'Med';
                }
                
                return (
                  <div key={index} className="flex items-center gap-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800/50 rounded-lg transition-colors">
                    <div className="w-32 text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
                      {item.sublocation}
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
                        {activityText}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Compact legend and summary */}
            <div className="mt-4 p-3 bg-indigo-50 dark:bg-indigo-950/30 rounded-lg border border-indigo-200 dark:border-indigo-800">
              <div className="flex items-start gap-2">
                <div className="text-indigo-600 dark:text-indigo-400 mt-0.5">📍</div>
                <div className="flex-1">
                  <p className="text-sm text-indigo-900 dark:text-indigo-100 font-medium mb-2">
                    Location Activity Summary
                  </p>
                  <div className="flex flex-wrap gap-4 text-xs mb-2">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full bg-indigo-600"></div>
                      <span className="text-indigo-800 dark:text-indigo-200">High (5+ orders)</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full bg-indigo-500"></div>
                      <span className="text-indigo-800 dark:text-indigo-200">Medium (3-4 orders)</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full bg-indigo-400"></div>
                      <span className="text-indigo-800 dark:text-indigo-200">Low (1-2 orders)</span>
                    </div>
                  </div>
                  <div className="text-xs text-indigo-700 dark:text-indigo-300">
                    Showing {report.jobOrders.mostActiveSublocations.length} locations with job orders. 
                    {report.jobOrders.mostActiveSublocations.length > 10 && ' Scroll to see all locations.'}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status Breakdown */}
      {Object.keys(report.jobOrders.byStatus).length > 0 && (
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-slate-900 dark:text-slate-50">
              Order Status Breakdown
            </CardTitle>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Distribution of job orders by status
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(report.jobOrders.byStatus).map(([status, count]) => (
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
