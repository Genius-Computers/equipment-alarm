'use client';

import { MonthlyReport } from '@/lib/types/report';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Clock, CheckCircle, DollarSign, TrendingUp, AlertTriangle, Wrench, Zap } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { 
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer
} from 'recharts';
import { ChartTooltip } from '@/components/ui/chart';
import { formatCurrency } from './utils';

interface ServiceRequestsAnalysisProps {
  report: MonthlyReport;
}

export function ServiceRequestsAnalysis({ report }: ServiceRequestsAnalysisProps) {
  const { t } = useLanguage();
  
  // Prepare chart data for request types with better formatting
  const serviceRequestTypeData = Object.entries(report.serviceRequests.byType).map(([type, count]) => ({
    type: type === 'MAINTENANCE' ? t('serviceRequest.types.maintenance') : 
          type === 'REPAIR' ? t('serviceRequest.types.repair') : 
          type === 'INSPECTION' ? t('serviceRequest.types.inspection') : 
          type.charAt(0).toUpperCase() + type.slice(1).toLowerCase(),
    count,
    originalType: type
  }));

  // Prepare chart data for priority with better colors and labels
  const totalPriorityCount = Object.values(report.serviceRequests.byPriority || {}).reduce(
    (sum, c) => sum + Number(c || 0),
    0
  );
  const priorityData = Object.entries(report.serviceRequests.byPriority).map(([priority, count]) => {
    const priorityLower = priority.toLowerCase();
    const translatedPriority = 
      priorityLower === 'high' ? t('priority.high') :
      priorityLower === 'medium' ? t('priority.med') :
      priorityLower === 'low' ? t('priority.low') :
      priorityLower === 'urgent' ? t('priority.urgent') :
      priority.charAt(0).toUpperCase() + priority.slice(1);
    const numericCount = Number(count || 0);
    const percentage = totalPriorityCount > 0 ? numericCount / totalPriorityCount : 0;
    
    return {
      priority: translatedPriority,
      count: numericCount,
      color: priorityLower === 'high' ? '#ef4444' :
             priorityLower === 'urgent' ? '#dc2626' :
             priorityLower === 'medium' ? '#f59e0b' :
             priorityLower === 'low' ? '#10b981' : '#6b7280',
      percentage
    };
  });


  // Calculate completion rate
  const completedCount = report.serviceRequests.byWorkStatus.completed || 0;
  const totalRequests = report.serviceRequests.total;
  const completionRate = totalRequests > 0 ? ((completedCount / totalRequests) * 100).toFixed(1) : '0';

  // Calculate pending/in-progress - safely access work status
  const workStatusByKey = report.serviceRequests.byWorkStatus as Record<string, number>;
  const pendingCount = workStatusByKey.pending || 0;
  const inProgressCount = workStatusByKey.in_progress || 0;
  const inProgressTotal = pendingCount + inProgressCount;

  // Get the most common request type for better insights
  const mostCommonType = serviceRequestTypeData.reduce((max, current) => 
    current.count > max.count ? current : max, serviceRequestTypeData[0] || { type: t('serviceRequest.types.none'), count: 0 }
  );

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-center gap-4">
        <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
          <Wrench className="h-6 w-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
            {t('reports.serviceRequests.overview')}
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            {report.period.monthName} {report.period.year} • {totalRequests} {t('reports.serviceRequests.totalRequestsLabel')}
          </p>
        </div>
      </div>

      {/* Key Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">{t('reports.serviceRequests.totalRequests')}</p>
                <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">{totalRequests}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/50 dark:to-green-900/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600 dark:text-green-400">{t('reports.serviceRequests.completed')}</p>
                <p className="text-3xl font-bold text-green-700 dark:text-green-300">{completedCount}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/50 dark:to-amber-900/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-amber-600 dark:text-amber-400">{t('reports.serviceRequests.inProgress')}</p>
                <p className="text-3xl font-bold text-amber-700 dark:text-amber-300">{inProgressTotal}</p>
              </div>
              <Clock className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/50 dark:to-purple-900/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600 dark:text-purple-400">{t('reports.serviceRequests.successRate')}</p>
                <p className="text-3xl font-bold text-purple-700 dark:text-purple-300">{completionRate}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Request Types Chart */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-slate-900 dark:text-slate-50 flex items-center gap-2">
              <Zap className="h-5 w-5 text-blue-500" />
              {t('reports.serviceRequests.requestTypes')}
            </CardTitle>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {t('reports.serviceRequests.mostCommon')}: {mostCommonType.type} ({mostCommonType.count} {t('reports.serviceRequests.requests')})
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={serviceRequestTypeData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
                  <XAxis 
                    dataKey="type" 
                    className="text-sm text-slate-600 dark:text-slate-400"
                    tickLine={false}
                    axisLine={false}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis 
                    className="text-sm text-slate-600 dark:text-slate-400"
                    tickLine={false}
                    axisLine={false}
                  />
                  <ChartTooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white dark:bg-slate-800 p-4 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg">
                            <p className="font-semibold text-slate-900 dark:text-slate-100">{data.type}</p>
                            <p className="text-blue-600 dark:text-blue-400 font-medium">{data.count} requests</p>
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
                    className="hover:opacity-80 transition-opacity"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Priority Distribution Chart */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-slate-900 dark:text-slate-50 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              {t('reports.serviceRequests.priorityLevels')}
            </CardTitle>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {t('reports.serviceRequests.distributionUrgency')}
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-80 flex flex-col">
              <div className="flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={priorityData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ payload }) => 
                        `${payload.count} (${Math.round((payload.percentage || 0) * 100)}%)`
                      }
                      outerRadius={100}
                      innerRadius={40}
                      fill="#8884d8"
                      dataKey="count"
                      paddingAngle={5}
                      className="text-xs font-medium"
                    >
                      {priorityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <ChartTooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-white dark:bg-slate-800 p-4 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg">
                              <p className="font-semibold text-slate-900 dark:text-slate-100">{data.priority}</p>
                              <p className="text-slate-600 dark:text-slate-400">{data.count} {t('reports.serviceRequests.requests')} ({Math.round((data.percentage || 0) * 100)}%)</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {/* Legend */}
              <div className="flex flex-wrap justify-center gap-3 mt-4">
                {priorityData.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-xs text-slate-600 dark:text-slate-400">
                      {item.priority}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-950/30 dark:to-blue-950/30">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-cyan-500 rounded-xl">
                <Clock className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">{t('reports.serviceRequests.averageResponseTime')}</h3>
                <p className="text-3xl font-bold text-cyan-600 dark:text-cyan-400 mt-1">
                  {report.serviceRequests.averageCompletionTime.toFixed(1)} hours
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  {t('reports.serviceRequests.fromRequestToCompletion')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-500 rounded-xl">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">{t('reports.serviceRequests.partsCost')}</h3>
                <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                  {formatCurrency(report.serviceRequests.totalSparePartsCost)}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  {t('reports.serviceRequests.sparePartsUsedThisMonth')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
