"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ServiceRequestType } from "@/lib/types";
import { useUser } from "@stackframe/stack";
import { useLanguage } from "@/hooks/useLanguage";
import { ClipboardList, Wrench, PackagePlus, Search, MoreHorizontal, User } from "lucide-react";

interface ServiceRequestStatsProps {
  scope: "pending" | "completed";
  refreshTrigger?: number; // Add a trigger to force refresh
  activeType?: "all" | ServiceRequestType;
  onTypeChange?: (type: "all" | ServiceRequestType) => void;
  assignedToMe?: boolean;
  onAssignedToMeChange?: (value: boolean) => void;
}

export default function ServiceRequestStats({
  scope,
  refreshTrigger,
  activeType = "all",
  onTypeChange,
  assignedToMe = false,
  onAssignedToMeChange,
}: ServiceRequestStatsProps) {
  const { t } = useLanguage();
  const user = useUser();
  const router = useRouter();
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
        // Fetch aggregated stats for the current scope. The API applies role-based visibility.
        const res = await fetch(`/api/service-request/stats?scope=${scope}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Failed to fetch statistics");
        const json = await res.json();
        const data = json?.data as
          | {
              total: number;
              preventiveMaintenance: number;
              correctiveMaintenance: number;
              install: number;
              assess: number;
              other: number;
              assignedToMe: number;
            }
          | undefined;

        if (data) {
          setStats(data);
        }
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

  const statCards: Array<{
    label: string;
    value: number;
    icon: typeof ClipboardList;
    color: string;
    type: "all" | ServiceRequestType | "assigned";
  }> = [
    {
      label: t("serviceRequest.stats.total"),
      value: stats.total,
      icon: ClipboardList,
      color: "text-blue-600 dark:text-blue-400",
      type: "all",
    },
    {
      label: t("serviceRequest.stats.preventive"),
      value: stats.preventiveMaintenance,
      icon: Wrench,
      color: "text-green-600 dark:text-green-400",
      type: ServiceRequestType.PREVENTIVE_MAINTENANCE,
    },
    {
      label: t("serviceRequest.stats.corrective"),
      value: stats.correctiveMaintenance,
      icon: Wrench,
      color: "text-orange-600 dark:text-orange-400",
      type: ServiceRequestType.CORRECTIVE_MAINTENANCE,
    },
    {
      label: t("serviceRequest.stats.install"),
      value: stats.install,
      icon: PackagePlus,
      color: "text-purple-600 dark:text-purple-400",
      type: ServiceRequestType.INSTALL,
    },
    {
      label: t("serviceRequest.stats.assess"),
      value: stats.assess,
      icon: Search,
      color: "text-cyan-600 dark:text-cyan-400",
      type: ServiceRequestType.ASSESS,
    },
    {
      label: t("serviceRequest.stats.other"),
      value: stats.other,
      icon: MoreHorizontal,
      color: "text-gray-600 dark:text-gray-400",
      type: ServiceRequestType.OTHER,
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
      type: "assigned",
    });
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {statCards.map((stat, index) => (
        <Card
          key={index}
          role="button"
          tabIndex={0}
          onClick={() => {
            if (stat.type === "assigned") {
              onAssignedToMeChange?.(!assignedToMe);
              return;
            }

            // For preventive maintenance, navigate to the dedicated PM Service Requests page
            if (stat.type === ServiceRequestType.PREVENTIVE_MAINTENANCE) {
              router.push("/preventive-maintenance/tickets");
              return;
            }

            const nextType = stat.type === "all" ? "all" : stat.type;
            onTypeChange?.(nextType);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              if (stat.type === "assigned") {
                onAssignedToMeChange?.(!assignedToMe);
                return;
              }

              if (stat.type === ServiceRequestType.PREVENTIVE_MAINTENANCE) {
                router.push("/preventive-maintenance/tickets");
                return;
              }

              const nextType = stat.type === "all" ? "all" : stat.type;
              onTypeChange?.(nextType);
            }
          }}
          className={`p-4 cursor-pointer transition-colors ${
            stat.type === "assigned"
              ? assignedToMe
                ? "border-primary bg-primary/5"
                : ""
              : activeType === (stat.type === "all" ? "all" : stat.type)
                ? "border-primary bg-primary/5"
                : ""
          }`}
        >
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

