'use client';

import { MonthlyReport } from '@/lib/types/report';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Clock, CheckCircle, DollarSign, TrendingUp } from 'lucide-react';
import { 
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { formatCurrency, formatServiceRequestType, COLORS } from './utils';
import { useLanguage } from '@/hooks/useLanguage';

interface ServiceRequestsAnalysisProps {
  report: MonthlyReport;
}

export function ServiceRequestsAnalysis({ report }: ServiceRequestsAnalysisProps) {
  const {t} = useLanguage();
  // Prepare chart data for request types
  const serviceRequestTypeData = Object.entries(report.serviceRequests.byType).map(([type, count]) => ({
    type: formatServiceRequestType(type),
    count
  }));

  // Prepare chart data for priority
  const priorityData = Object.entries(report.serviceRequests.byPriority).map(([priority, count]) => ({
    priority: priority.charAt(0).toUpperCase() + priority.slice(1),
    count
  }));

  const chartConfig = {
    count: {
      label: "Count",
      color: "#10b981",
    }
  };

  // Calculate completion rate
  const completedCount = report.serviceRequests.byWorkStatus.completed || 0;
  const totalRequests = report.serviceRequests.total;
  const completionRate = totalRequests > 0 ? ((completedCount / totalRequests) * 100).toFixed(1) : '0';

  // Calculate pending/in-progress - safely access work status
  const workStatusByKey = report.serviceRequests.byWorkStatus as Record<string, number>;
  const pendingCount = workStatusByKey.pending || 0;
  const inProgressCount = workStatusByKey.in_progress || 0;

  return (
    <Card className="border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
      <CardHeader className="pb-6 space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/10 rounded-xl">
            <FileText className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <CardTitle className="text-lg font-semibold text-slate-900 dark:text-slate-50">
              {t('reports.serviceRequests.analysis')}
            </CardTitle>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              {report.period.monthName} {report.period.year}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
            <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400 mb-2" />
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">{totalRequests}</p>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Total Requests</p>
          </div>
          
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
            <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mb-2" />
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">{completedCount}</p>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Completed</p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
            <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400 mb-2" />
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">{pendingCount + inProgressCount}</p>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">In Progress</p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
            <TrendingUp className="h-5 w-5 text-violet-600 dark:text-violet-400 mb-2" />
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">{completionRate}%</p>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Completion Rate</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Request Types Bar Chart */}
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-5">
            <h4 className="font-semibold mb-4 text-slate-900 dark:text-slate-100 text-sm">Service Requests by Type</h4>
            <ChartContainer config={chartConfig} className="h-[280px]">
              <BarChart data={serviceRequestTypeData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
                <XAxis 
                  dataKey="type" 
                  className="text-xs text-slate-600 dark:text-slate-400"
                  tickLine={false}
                  axisLine={false}
                  angle={-45}
                  textAnchor="end"
                  height={70}
                />
                <YAxis 
                  className="text-xs text-slate-600 dark:text-slate-400"
                  tickLine={false}
                  axisLine={false}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="count"
                  fill="var(--color-count)"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          </div>

          {/* Priority Distribution Pie Chart */}
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-5">
            <h4 className="font-semibold mb-4 text-slate-900 dark:text-slate-100 text-sm">Requests by Priority</h4>
            <ChartContainer 
              config={{
                high: { label: "High", color: "#ef4444" },
                medium: { label: "Medium", color: "#f59e0b" },
                low: { label: "Low", color: "#10b981" }
              }} 
              className="h-[240px] w-full"
            >
              <PieChart>
                <Pie
                  data={priorityData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={false}
                  outerRadius={90}
                  innerRadius={50}
                  fill="#8884d8"
                  dataKey="count"
                  paddingAngle={3}
                >
                  {priorityData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={
                        entry.priority.toLowerCase() === 'high' ? '#ef4444' :
                        entry.priority.toLowerCase() === 'medium' ? '#f59e0b' :
                        entry.priority.toLowerCase() === 'low' ? '#10b981' :
                        COLORS[index % COLORS.length]
                      } 
                    />
                  ))}
                </Pie>
                <ChartTooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white dark:bg-slate-800 p-3 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg">
                          <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">{data.priority}</p>
                          <p className="text-xs text-slate-600 dark:text-slate-400">Count: {data.count}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ChartContainer>
            <div className="mt-4 flex flex-wrap gap-3 justify-center">
              {priorityData.map((entry, index) => {
                const color = 
                  entry.priority.toLowerCase() === 'high' ? '#ef4444' :
                  entry.priority.toLowerCase() === 'medium' ? '#f59e0b' :
                  entry.priority.toLowerCase() === 'low' ? '#10b981' :
                  COLORS[index % COLORS.length];
                
                return (
                  <div key={entry.priority} className="flex items-center gap-2 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-full">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                    <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">{entry.priority}: {entry.count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 rounded-xl border border-blue-200 dark:border-blue-800/50">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <h5 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">Average Completion Time</h5>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                {report.serviceRequests.averageCompletionTime.toFixed(1)}
              </span>
              <span className="text-slate-600 dark:text-slate-400 text-sm">hours</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              Average time from creation to completion
            </p>
          </div>

          <div className="p-5 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800/50">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <h5 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">Total Spare Parts Cost</h5>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(report.serviceRequests.totalSparePartsCost)}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              Cost of parts used in service requests
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
