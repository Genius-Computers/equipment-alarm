"use client"

import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter, Search } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { EquipmentMaintenanceStatus } from "@/lib/types";

interface EquipmentFiltersProps {
  searchTerm: string;
  statusFilter: "all" | EquipmentMaintenanceStatus;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: "all" | EquipmentMaintenanceStatus) => void;
}

const EquipmentFilters = ({ searchTerm, statusFilter, onSearchChange, onStatusChange }: EquipmentFiltersProps) => {
  const { t } = useLanguage();
  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <div className="relative flex-1">
        <Search className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder={t("search.placeholder")}
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 rtl:pl-4 rtl:pr-10"
        />
      </div>

      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={statusFilter} onValueChange={(v) => onStatusChange(v as "all" | EquipmentMaintenanceStatus)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t("filter.byStatus")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filter.allEquipment")}</SelectItem>
            <SelectItem value="good">{t("filter.upToDate")}</SelectItem>
            <SelectItem value="due">{t("filter.dueSoon")}</SelectItem>
            <SelectItem value="overdue">{t("filter.overdue")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default EquipmentFilters;
