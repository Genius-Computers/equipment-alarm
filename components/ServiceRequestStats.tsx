"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { JServiceRequest, ServiceRequestType } from "@/lib/types";
import { useUser } from "@stackframe/stack";
import { useLanguage } from "@/hooks/useLanguage";
import { ClipboardList, Wrench, PackagePlus, Search, MoreHorizontal, User } from "lucide-react";

interface ServiceRequestStatsProps {
  scope: "pending" | "completed";
  refreshTrigger?: number; // Add a trigger to force refresh
}

export default function ServiceRequestStats({ scope, refreshTrigger }: ServiceRequestStatsProps) {
  const { t } = useLanguage();
  const user = useUser();
  const [stats, setStats] = useState<{
    total: number;
    preventiveMaintenance: number;
    correctiveMaintenance: number;
    install: number;
    assess: number;
    other: number;
    assignedToMe: number;
  }>({
    total: 0,
    preventiveMaintenance: 0,
    correctiveMaintenance: 0,
    install: 0,
    assess: 0,
    other: 0,
    assignedToMe: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        // Fetch all requests for the current scope
        // Note: The API already filters by role (technicians only see approved requests)
        const res = await fetch(`/api/service-request?page=1&pageSize=10000&scope=${scope}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Failed to fetch statistics");
        const json = await res.json();
        const requests: JServiceRequest[] = json.data || [];

        // Calculate statistics
        const newStats = {
          total: requests.length,
          preventiveMaintenance: requests.filter(r => r.requestType === ServiceRequestType.PREVENTIVE_MAINTENANCE).length,
          correctiveMaintenance: requests.filter(r => r.requestType === ServiceRequestType.CORRECTIVE_MAINTENANCE).length,
          install: requests.filter(r => r.requestType === ServiceRequestType.INSTALL).length,
          assess: requests.filter(r => r.requestType === ServiceRequestType.ASSESS).length,
          other: requests.filter(r => r.requestType === ServiceRequestType.OTHER).length,
          assignedToMe: requests.filter(r => r.assignedTechnicianId === user?.id).length,
        };

        setStats(newStats);
      } catch (error) {
        console.error("Error fetching service request stats:", error);
      } finally {
        setLoading(false);
      }
    };

    void fetchStats();
  }, [scope, user?.id, refreshTrigger]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  const statCards = [
    {
      label: t("serviceRequest.stats.total"),
      value: stats.total,
      icon: ClipboardList,
      color: "text-blue-600 dark:text-blue-400",
    },
    {
      label: t("serviceRequest.stats.preventive"),
      value: stats.preventiveMaintenance,
      icon: Wrench,
      color: "text-green-600 dark:text-green-400",
    },
    {
      label: t("serviceRequest.stats.corrective"),
      value: stats.correctiveMaintenance,
      icon: Wrench,
      color: "text-orange-600 dark:text-orange-400",
    },
    {
      label: t("serviceRequest.stats.install"),
      value: stats.install,
      icon: PackagePlus,
      color: "text-purple-600 dark:text-purple-400",
    },
    {
      label: t("serviceRequest.stats.assess"),
      value: stats.assess,
      icon: Search,
      color: "text-cyan-600 dark:text-cyan-400",
    },
    {
      label: t("serviceRequest.stats.other"),
      value: stats.other,
      icon: MoreHorizontal,
      color: "text-gray-600 dark:text-gray-400",
    },
  ];

  // Add "Assigned to Me" card if user is a technician
  const role = user?.clientReadOnlyMetadata?.role as string | undefined;
  if (role === "technician" || role === "admin") {
    statCards.push({
      label: t("serviceRequest.stats.assignedToMe"),
      value: stats.assignedToMe,
      icon: User,
      color: "text-indigo-600 dark:text-indigo-400",
    });
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {statCards.map((stat, index) => (
        <Card key={index} className="p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className="text-2xl font-bold">{stat.value}</p>
            </div>
            <stat.icon className={`h-8 w-8 ${stat.color}`} />
          </div>
        </Card>
      ))}
    </div>
  );
}

