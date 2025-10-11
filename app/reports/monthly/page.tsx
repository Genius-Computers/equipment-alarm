"use client";

import React, { useState, useEffect, useCallback } from "react";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/hooks/useLanguage";
import { useSelfProfile } from "@/hooks/useSelfProfile";
import { 
  Download, 
  Calendar, 
  Wrench, 
  Package, 
  Ticket, 
  Loader2,
  BarChart3,
  PieChart,
  Building2,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { formatSaudiDate } from "@/lib/utils";
import { exportMonthlyReportToPDF } from "@/lib/pdf-export";

interface MonthlyReportData {
  period: {
    year: number;
    month: number;
    startDate: string;
    endDate: string;
  };
  summary: {
    devicesMaintained: number;
    sparePartsUsed: number;
    ticketsRaised: number;
  };
  maintenanceTypes: {
    preventive: number;
    corrective: number;
    install: number;
    assess: number;
    other: number;
    total: number;
  };
  devicesMaintained: Array<{
    id: string;
    name: string;
    model: string;
    serialNumber: string;
    location: string;
    subLocation: string;
    lastMaintenance: string;
    status: string;
  }>;
  sparePartsUsed: Array<{
    name: string;
    quantity: number;
    devices: string[];
  }>;
  locationSummary: Array<{
    location: string;
    preventive: number;
    corrective: number;
    install: number;
    assess: number;
    other: number;
    total: number;
  }>;
}

const MonthSelector = ({ 
  year, 
  month, 
  onYearChange, 
  onMonthChange 
}: {
  year: number;
  month: number;
  onYearChange: (year: number) => void;
  onMonthChange: (month: number) => void;
}) => {
  const { t } = useLanguage();
  
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 6 }, (_, i) => currentYear - 2 + i);
  
  const months = [
    { value: 1, label: t("reports.january") },
    { value: 2, label: t("reports.february") },
    { value: 3, label: t("reports.march") },
    { value: 4, label: t("reports.april") },
    { value: 5, label: t("reports.may") },
    { value: 6, label: t("reports.june") },
    { value: 7, label: t("reports.july") },
    { value: 8, label: t("reports.august") },
    { value: 9, label: t("reports.september") },
    { value: 10, label: t("reports.october") },
    { value: 11, label: t("reports.november") },
    { value: 12, label: t("reports.december") },
  ];

  return (
    <div className="flex items-center gap-2">
      <Select value={year.toString()} onValueChange={(value) => onYearChange(Number(value))}>
        <SelectTrigger className="w-24">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {years.map((y) => (
            <SelectItem key={y} value={y.toString()}>
              {y}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={month.toString()} onValueChange={(value) => onMonthChange(Number(value))}>
        <SelectTrigger className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {months.map((m) => (
            <SelectItem key={m.value} value={m.value.toString()}>
              {m.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

const MaintenancePieChart = ({ data }: { data: MonthlyReportData['maintenanceTypes'] }) => {
  const { t } = useLanguage();
  
  const colors = {
    preventive: '#3b82f6', // blue
    corrective: '#06b6d4', // cyan
    install: '#10b981', // green
    assess: '#f59e0b', // amber
    other: '#8b5cf6', // purple
  };

  const total = data.total;
  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <div className="text-center">
          <PieChart className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>{t("reports.noData")}</p>
        </div>
      </div>
    );
  }

  let cumulativePercentage = 0;
  const segments = Object.entries(data).filter(([key]) => key !== 'total').map(([key, value]) => {
    const percentage = total > 0 ? (value / total) * 100 : 0;
    const startAngle = cumulativePercentage * 3.6; // Convert percentage to degrees
    const endAngle = (cumulativePercentage + percentage) * 3.6;
    cumulativePercentage += percentage;
    
    return {
      key,
      value,
      percentage,
      startAngle,
      endAngle,
      color: colors[key as keyof typeof colors],
      label: t(`reports.maintenanceType.${key}`),
    };
  }).filter(segment => segment.value > 0);

  return (
    <div className="relative">
      <svg className="w-full h-64" viewBox="0 0 200 200">
        <circle
          cx="100"
          cy="100"
          r="80"
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="2"
        />
        {segments.map((segment, index) => {
          const radius = 80;
          const startAngleRad = (segment.startAngle - 90) * (Math.PI / 180);
          const endAngleRad = (segment.endAngle - 90) * (Math.PI / 180);
          
          const x1 = 100 + radius * Math.cos(startAngleRad);
          const y1 = 100 + radius * Math.sin(startAngleRad);
          const x2 = 100 + radius * Math.cos(endAngleRad);
          const y2 = 100 + radius * Math.sin(endAngleRad);
          
          const largeArcFlag = segment.percentage > 50 ? 1 : 0;
          
          const pathData = [
            `M 100 100`,
            `L ${x1} ${y1}`,
            `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
            'Z'
          ].join(' ');
          
          return (
            <path
              key={segment.key}
              d={pathData}
              fill={segment.color}
              stroke="white"
              strokeWidth="1"
              className="hover:opacity-80 transition-opacity"
            />
          );
        })}
      </svg>
      
      {/* Legend */}
      <div className="grid grid-cols-2 gap-2 mt-4 text-sm">
        {segments.map((segment) => (
          <div key={segment.key} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: segment.color }}
            />
            <span className="text-muted-foreground">{segment.label}</span>
            <span className="font-medium">{segment.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const LocationChart = ({ 
  data, 
  onLocationClick 
}: { 
  data: MonthlyReportData['locationSummary'];
  onLocationClick: (location: string) => void;
}) => {
  const { t } = useLanguage();
  
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <div className="text-center">
          <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>{t("reports.noData")}</p>
        </div>
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => d.total));
  const colors = {
    preventive: '#3b82f6',
    corrective: '#06b6d4',
    install: '#10b981',
    assess: '#f59e0b',
    other: '#8b5cf6',
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4">
        {data.map((location) => (
          <div key={location.location} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{location.location}</span>
                <Badge variant="secondary">{location.total}</Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onLocationClick(location.location)}
                className="text-xs"
              >
                {t("reports.viewDetails")}
              </Button>
            </div>
            
            <div className="relative h-8 bg-muted rounded overflow-hidden">
              <div className="absolute inset-0 flex">
                {[
                  { key: 'preventive', value: location.preventive, label: t("reports.maintenanceType.preventive") },
                  { key: 'corrective', value: location.corrective, label: t("reports.maintenanceType.corrective") },
                  { key: 'install', value: location.install, label: t("reports.maintenanceType.install") },
                  { key: 'assess', value: location.assess, label: t("reports.maintenanceType.assess") },
                  { key: 'other', value: location.other, label: t("reports.maintenanceType.other") },
                ].filter(item => item.value > 0).map((item, index) => {
                  const width = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
                  return (
                    <div
                      key={item.key}
                      className="h-full flex items-center justify-center text-xs text-white font-medium"
                      style={{ 
                        width: `${width}%`,
                        backgroundColor: colors[item.key as keyof typeof colors],
                      }}
                      title={`${item.label}: ${item.value}`}
                    >
                      {item.value > 0 && width > 10 && item.value}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs">
        {Object.entries(colors).map(([key, color]) => (
          <div key={key} className="flex items-center gap-1">
            <div 
              className="w-3 h-3 rounded" 
              style={{ backgroundColor: color }}
            />
            <span className="text-muted-foreground">{t(`reports.maintenanceType.${key}`)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const MonthlyReportsPage = () => {
  const { t } = useLanguage();
  const { profile, loading: profileLoading } = useSelfProfile();
  
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [reportData, setReportData] = useState<MonthlyReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);

  // Check if user has permission to view reports (restricted to Admin X only - dev feature)
  const canViewReports = profile?.role === 'admin_x';

  const fetchReportData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/reports/monthly?year=${selectedYear}&month=${selectedMonth}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch report data');
      }
      
      const result = await response.json();
      setReportData(result.data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      toast.error(t("reports.fetchError"), { description: errorMessage });
    } finally {
      setLoading(false);
    }
  }, [selectedYear, selectedMonth, t]);

  useEffect(() => {
    if (canViewReports) {
      fetchReportData();
    }
  }, [canViewReports, fetchReportData]);

  const handleDownloadPDF = async () => {
    try {
      const monthNames = [
        t("reports.january"), t("reports.february"), t("reports.march"), t("reports.april"),
        t("reports.may"), t("reports.june"), t("reports.july"), t("reports.august"),
        t("reports.september"), t("reports.october"), t("reports.november"), t("reports.december")
      ];
      
      const monthName = monthNames[selectedMonth - 1];
      await exportMonthlyReportToPDF('monthly-report-content', monthName, selectedYear);
      toast.success(t("reports.pdfDownloaded"));
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error(t("reports.pdfExportError"));
    }
  };

  const handleLocationClick = (location: string) => {
    setSelectedLocation(location);
    // TODO: Open modal with location details
    toast.info(t("reports.locationDetailsComingSoon"));
  };

  // Show loading state while profile is loading to prevent flash
  if (profileLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </main>
      </div>
    );
  }

  if (!canViewReports) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-6 py-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                {t("reports.accessDenied")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                {t("reports.accessDeniedDesc")}
              </p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const monthNames = [
    t("reports.january"), t("reports.february"), t("reports.march"), t("reports.april"),
    t("reports.may"), t("reports.june"), t("reports.july"), t("reports.august"),
    t("reports.september"), t("reports.october"), t("reports.november"), t("reports.december")
  ];

  return (
    <div className="min-h-screen bg-background print:bg-white">
      <style jsx global>{`
        @media print {
          @page { 
            size: A4 portrait; 
            margin: 15mm;
          }
          body { 
            -webkit-print-color-adjust: exact; 
            print-color-adjust: exact;
            font-family: Arial, sans-serif;
            background: white !important;
          }
          header, nav, .print\\:hidden { 
            display: none !important; 
          }
          .print\\:block { 
            display: block !important; 
          }
          main, .container {
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
          }
          .page-break {
            page-break-before: always;
          }
        }
      `}</style>
      
      <div className="print:hidden">
        <Header />
      </div>
      
      <main id="monthly-report-content" className="container mx-auto px-6 py-8 space-y-6 print:p-0 print:m-0">
        {/* Header */}
        <div className="print:block">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <MonthSelector
                year={selectedYear}
                month={selectedMonth}
                onYearChange={setSelectedYear}
                onMonthChange={setSelectedMonth}
              />
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-bold">
                {monthNames[selectedMonth - 1]} {selectedYear}
              </h1>
              <p className="text-sm text-muted-foreground">
                {t("reports.monthlyMaintenanceReport")}
              </p>
            </div>
            {/* Temporarily disabled PDF export */}
            {/* <Button onClick={handleDownloadPDF} className="print:hidden">
              <Download className="h-4 w-4 mr-2" />
              {t("reports.downloadPDF")}
            </Button> */}
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">{t("common.loading")}</span>
          </div>
        )}

        {error && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {reportData && (
          <>
            {/* Part 1 - Overview */}
            <div className="page-break">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Key Summary Numbers */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      {t("reports.overview")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 gap-4">
                      <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                        <Wrench className="h-8 w-8 text-primary" />
                        <div>
                          <p className="text-2xl font-bold">{reportData.summary.devicesMaintained}</p>
                          <p className="text-sm text-muted-foreground">{t("reports.devicesMaintained")}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                        <Package className="h-8 w-8 text-green-600" />
                        <div>
                          <p className="text-2xl font-bold">{reportData.summary.sparePartsUsed}</p>
                          <p className="text-sm text-muted-foreground">{t("reports.sparePartsUsed")}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                        <Ticket className="h-8 w-8 text-blue-600" />
                        <div>
                          <p className="text-2xl font-bold">{reportData.summary.ticketsRaised}</p>
                          <p className="text-sm text-muted-foreground">{t("reports.ticketsRaised")}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Pie Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PieChart className="h-5 w-5" />
                      {t("reports.maintenanceTypes")}
                    </CardTitle>
                  </CardHeader>
                   <CardContent>
                     <MaintenancePieChart data={reportData.maintenanceTypes} />
                   </CardContent>
                </Card>
              </div>
            </div>

            {/* Part 2 - Detailed Records */}
            <div className="page-break">
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
                {/* Devices Maintained Table */}
                <Card className="lg:col-span-3">
                  <CardHeader>
                    <CardTitle>{t("reports.devicesMaintained")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-96 overflow-y-auto border rounded">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-muted/50">
                          <tr>
                            <th className="text-left p-2 font-medium">{t("equipment.name")}</th>
                            <th className="text-left p-2 font-medium">{t("reports.modelSerial")}</th>
                            <th className="text-left p-2 font-medium">{t("equipment.lastMaintenance")}</th>
                            <th className="text-left p-2 font-medium">{t("equipment.status")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportData.devicesMaintained.map((device) => (
                            <tr key={device.id} className="border-t">
                              <td className="p-2">
                                <div className="font-medium">{device.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {device.location} {device.subLocation && `- ${device.subLocation}`}
                                </div>
                              </td>
                              <td className="p-2 text-xs">
                                {device.model} {device.serialNumber && `/ ${device.serialNumber}`}
                              </td>
                              <td className="p-2 text-xs">
                                {formatSaudiDate(device.lastMaintenance)}
                              </td>
                              <td className="p-2">
                                <Badge variant="secondary" className="capitalize">
                                  {device.status}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                {/* Spare Parts Used Table */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>{t("reports.sparePartsUsed")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-96 overflow-y-auto border rounded">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-muted/50">
                          <tr>
                            <th className="text-left p-2 font-medium">{t("reports.partName")}</th>
                            <th className="text-left p-2 font-medium">{t("reports.quantity")}</th>
                            <th className="text-left p-2 font-medium">{t("reports.device")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportData.sparePartsUsed.map((part, index) => (
                            <tr key={index} className="border-t">
                              <td className="p-2 font-medium">{part.name}</td>
                              <td className="p-2">
                                <Badge variant="outline">{part.quantity}</Badge>
                              </td>
                              <td className="p-2 text-xs text-muted-foreground">
                                {part.devices.slice(0, 2).join(', ')}
                                {part.devices.length > 2 && ` +${part.devices.length - 2} more`}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Part 3 - Location Summary */}
            <div className="page-break">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    {t("reports.maintenanceActivityByLocation")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <LocationChart 
                    data={reportData.locationSummary} 
                    onLocationClick={handleLocationClick}
                  />
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default MonthlyReportsPage;
