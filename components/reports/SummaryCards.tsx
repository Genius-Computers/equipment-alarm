'use client';

import { MonthlyReport } from '@/lib/types/report';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Wrench,
  FileText,
  Package,
  DollarSign,
  Users
} from 'lucide-react';
import { formatCurrency, formatNumber } from './utils';
import { useLanguage } from '@/hooks/useLanguage';

interface SummaryCardsProps {
  report: MonthlyReport;
}

export function SummaryCards({ report }: SummaryCardsProps) {
  const { t } = useLanguage();

  const cards = [
    {
      title: t('reports.summary.equipmentAdded'),
      value: formatNumber(report.equipment.newThisMonth),
      icon: Wrench,
      bgGradient: 'from-blue-500 to-blue-600',
      description: t('reports.summary.newEquipmentThisMonth')
    },
    {
      title: t('reports.summary.serviceRequests'),
      value: formatNumber(report.summary.totalServiceRequests),
      icon: FileText,
      bgGradient: 'from-green-500 to-green-600',
      description: t('reports.summary.serviceRequestsHandled')
    },
    {
      title: t('reports.summary.jobOrders'),
      value: formatNumber(report.summary.totalJobOrders),
      icon: Package,
      bgGradient: 'from-purple-500 to-purple-600',
      description: t('reports.summary.jobOrdersProcessed')
    },
    {
      title: t('reports.summary.sparePartsCost'),
      value: formatCurrency(report.summary.totalSparePartsCost),
      icon: DollarSign,
      bgGradient: 'from-orange-500 to-orange-600',
      description: t('reports.summary.totalPartsExpenditure')
    },
    {
      title: t('reports.summary.technicians'),
      value: formatNumber(report.summary.totalTechnicians),
      icon: Users,
      bgGradient: 'from-indigo-500 to-indigo-600',
      description: t('reports.summary.activeTechnicians')
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <Card key={index} className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg overflow-hidden">
            <CardContent className="p-0">
              <div className={`bg-gradient-to-br ${card.bgGradient} p-6 text-white relative overflow-hidden`}>
                <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-10 translate-x-10"></div>
                <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/5 rounded-full translate-y-8 -translate-x-8"></div>
                
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                      <Icon className="h-6 w-6" />
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-white/80 text-sm font-medium">{card.title}</p>
                    <p className="text-3xl font-bold text-white">{card.value}</p>
                    <p className="text-white/60 text-xs mt-1">{card.description}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
