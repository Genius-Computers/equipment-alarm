"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Equipment, EquipmentMaintenanceStatus, JEquipment } from "@/lib/types";
import { useLanguage } from "@/hooks/useLanguage";

const EQUIPMENT_CACHE_KEY = "EquipmentCacheKey";

export function useEquipment(list = true) {
  const { t } = useLanguage();
  const searchParams = useSearchParams();

  // Read initial status filter from URL query params
  const getInitialStatus = (): "all" | EquipmentMaintenanceStatus => {
    const statusParam = searchParams.get("status");
    if (statusParam && ["all", "good", "due", "overdue"].includes(statusParam)) {
      return statusParam as "all" | EquipmentMaintenanceStatus;
    }
    return "all";
  };

  const [equipment, setEquipment] = useState<Array<JEquipment>>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isInserting, setIsInserting] = useState(false);

  const [equipmentNameCache, setEquipmentNameCache] = useState<{ name: string; id: string }[]>([]);
  const [isCaching, setIsCaching] = useState<boolean>(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | EquipmentMaintenanceStatus>(getInitialStatus());

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
    if (!list) return;
    void refresh();
  }, [refresh, list]);

  const fetchCache = useCallback(async () => {
    try {
      if (sessionStorage.getItem(EQUIPMENT_CACHE_KEY)) {
        setEquipmentNameCache(JSON.parse(sessionStorage.getItem(EQUIPMENT_CACHE_KEY)!));
        return;
      }
      setIsCaching(true);
      const res = await fetch(`/api/equipment/cache`, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load equipment");
      const json = await res.json();
      const data = json.data;
      setEquipmentNameCache(data);
      sessionStorage.setItem(EQUIPMENT_CACHE_KEY, JSON.stringify(data));
    } catch {
      setEquipmentNameCache([]);
      sessionStorage.removeItem(EQUIPMENT_CACHE_KEY);
    } finally {
      setIsCaching(false);
    }
  }, []);

  const reCache = useCallback(async () => {
    sessionStorage.removeItem(EQUIPMENT_CACHE_KEY);
    fetchCache();
  }, [fetchCache]);

  useEffect(() => {
    fetchCache();
  }, [fetchCache]);

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
        reCache();
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Failed to add equipment";
        toast(t("toast.error"), { description: message });
      } finally {
        setIsInserting(false);
      }
    },
    [t, reCache]
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
        reCache();
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Failed to update equipment";
        toast(t("toast.error"), { description: message });
      } finally {
        setIsUpdating(false);
      }
    },
    [t, reCache]
  );

  const filtered = useMemo(() => {
    return equipment.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.partNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.location.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "all" || item.maintenanceStatus === statusFilter;
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
    equipmentNameCache,
    isCaching,
    setSearchTerm,
    setStatusFilter,
    setPage,
    setPageSize,
    refresh,
    addEquipment,
    updateEquipment,
  } as const;
}
