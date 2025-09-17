"use client"

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Equipment, EquipmentStatus, JEquipment } from "@/lib/types";
import { useLanguage } from "@/hooks/useLanguage";

export function useEquipment() {
  const { t } = useLanguage();

  const [equipment, setEquipment] = useState<Array<JEquipment>>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(4);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isInserting, setIsInserting] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | EquipmentStatus>("all");

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/equipment?page=${page}&pageSize=${pageSize}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load equipment");
      const json = await res.json();
      const rows: Array<JEquipment> = Array.isArray(json.data) ? json.data : [];
      setTotal(Number(json?.meta?.total || 0));
      setEquipment(rows);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Error loading equipment";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addEquipment = useCallback(
    async (newEquipment: Omit<Equipment, "id">) => {
      try {
        setIsInserting(true);
        const res = await fetch("/api/equipment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newEquipment),
        });
        if (!res.ok) throw new Error("Failed to add equipment");
        const { data } = await res.json();
        setEquipment((prev) => [...prev, data as JEquipment]);
        toast(t("toast.success"), { description: t("toast.equipmentAdded") });
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Failed to add equipment";
        toast(t("toast.error"), { description: message });
      } finally {
        setIsInserting(false);
      }
    },
    [t]
  );

  const updateEquipment = useCallback(
    async (updated: Equipment) => {
      try {
        setIsUpdating(true);
        const res = await fetch(`/api/equipment/${updated.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: updated.name,
            partNumber: updated.partNumber,
            location: updated.location,
            lastMaintenance: updated.lastMaintenance,
            maintenanceInterval: updated.maintenanceInterval,
            inUse: updated.inUse,
          }),
        });
        if (!res.ok) throw new Error("Failed to update equipment");
        const { data } = await res.json();
        setEquipment((prev) => prev.map((e) => (e.id === (data as JEquipment).id ? (data as JEquipment) : e)));
        toast(t("toast.success"), { description: t("toast.equipmentUpdated") });
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Failed to update equipment";
        toast(t("toast.error"), { description: message });
      } finally {
        setIsUpdating(false);
      }
    },
    [t]
  );

  const filtered = useMemo(() => {
    return equipment.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.partNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.location.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "all" || item.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [equipment, searchTerm, statusFilter]);

  return {
    equipment,
    filteredEquipment: filtered,
    loading,
    error,
    isUpdating,
    isInserting,
    page,
    pageSize,
    total,
    searchTerm,
    statusFilter,
    setSearchTerm,
    setStatusFilter,
    setPage,
    setPageSize,
    refresh,
    addEquipment,
    updateEquipment,
  } as const;
}
