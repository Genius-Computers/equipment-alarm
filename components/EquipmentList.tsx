"use client";

import { useState } from "react";
import EquipmentCard from "@/components/EquipmentCard";
import EquipmentTable from "./EquipmentTable";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Equipment, JEquipment } from "@/lib/types";
import { LayoutGrid, List } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import EquipmentCSVExport from "@/components/EquipmentCSVExport";
import EquipmentCSVImport from "@/components/EquipmentCSVImport";

interface EquipmentListProps {
  loading: boolean;
  items: JEquipment[];
  onEdit: (updated: Equipment) => Promise<void> | void;
  updating?: boolean;
  // for label context
  total: number;
  page: number;
  pageSize: number;
  searchTerm?: string;
  statusFilter?: "all" | "good" | "due" | "overdue";
  onRefresh?: () => void;
}

const EquipmentList = ({
  loading,
  items,
  onEdit,
  updating = false,
  total,
  page,
  pageSize,
  searchTerm = "",
  statusFilter = "all",
  onRefresh,
}: EquipmentListProps) => {
  const [view, setView] = useState<"grid" | "table">("table");
  const { t } = useLanguage();

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, Math.max(total, items.length));

  const hasSearch = (searchTerm || "").trim().length > 0;
  const hasStatus = statusFilter !== "all";
  const statusLabelMap: Record<string, string> = {
    all: t("filter.all"),
    good: t("filter.upToDate"),
    due: t("filter.dueSoon"),
    overdue: t("filter.overdue"),
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        {loading ? (
          <div />
        ) : (
          <p className="text-sm text-muted-foreground">
            {t("list.label.showing", { from: String(from), to: String(to), total: String(total) })}
            {(hasSearch || hasStatus) && (
              <>
                {" "}
                {t("list.label.filteredBy")} {hasSearch && t("list.label.search", { q: searchTerm })}
                {hasSearch && hasStatus && ` ${t("list.label.and")} `}
                {hasStatus && t("list.label.status", { status: statusLabelMap[statusFilter] })}
              </>
            )}
          </p>
        )}
        <div className="inline-flex gap-2" role="tablist" aria-label="View mode">
          <Button
            variant={view === "table" ? "default" : "outline"}
            size="sm"
            onClick={() => setView("table")}
            aria-pressed={view === "table"}
            aria-label="Table view">
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant={view === "grid" ? "default" : "outline"}
            size="sm"
            onClick={() => setView("grid")}
            aria-pressed={view === "grid"}
            aria-label="Grid view">
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <div className="w-px h-6 bg-border mx-2" />
          <EquipmentCSVExport items={items} />
          <EquipmentCSVImport onImported={onRefresh} />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(4)].map((_, index) => (
            <div key={index} className="rounded-lg border p-0">
              <div className="p-4 border-b">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-6 w-24 rounded-full" />
                </div>
                <Skeleton className="h-4 w-32 mt-2" />
              </div>
              <div className="p-4 space-y-4">
                <div className="flex items-center gap-2 text-sm">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Skeleton className="h-3 w-24 mb-2" />
                    <Skeleton className="h-4 w-28" />
                  </div>
                  <div>
                    <Skeleton className="h-3 w-28 mb-2" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24 mt-1" />
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-4 rounded" />
                    <Skeleton className="h-4 w-36" />
                  </div>
                </div>
                <div className="bg-muted p-3 rounded-lg">
                  <Skeleton className="h-4 w-40 mb-2" />
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-3 w-44" />
                    <Skeleton className="h-8 w-28" />
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Skeleton className="h-8 w-28" />
                  <Skeleton className="h-8 w-24" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {items.map((item) => (
            <EquipmentCard key={item.id} equipment={item} onEditEquipment={onEdit} disabled={updating} />
          ))}
        </div>
      ) : (
        <EquipmentTable items={items} onEdit={onEdit} updating={updating} />
      )}
    </div>
  );
};

export default EquipmentList;
