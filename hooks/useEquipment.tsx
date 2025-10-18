"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Equipment, EquipmentMaintenanceStatus, JEquipment } from "@/lib/types";
import { useLanguage } from "@/hooks/useLanguage";


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

  const [isSearching, setIsSearching] = useState<boolean>(false);

  // Single equipment detail state
  const [currentEquipment, setCurrentEquipment] = useState<Equipment | null>(null);

  const [searchTerm, setSearchTerm] = useState(searchParams.get("q") ?? "");
  const [statusFilter, setStatusFilter] = useState<"all" | EquipmentMaintenanceStatus>(getInitialStatus());

  // Server-driven search results for homepage and list
  const [searchResults, setSearchResults] = useState<Array<JEquipment>>([]);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const q = encodeURIComponent(searchTerm || "");
      const status = encodeURIComponent(statusFilter || "all");
      const res = await fetch(`/api/equipment?page=${page}&pageSize=${pageSize}&q=${q}&status=${status}` as string, { cache: "no-store" });
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
  }, [page, pageSize, searchTerm, statusFilter]);

  // Debounced list refresh when filters/pagination change
  useEffect(() => {
    if (!list) return;
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      void refresh();
    }, 1000);
    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [refresh, list]);

  const loadEquipmentById = useCallback(async (id: string) => {
    try {
      if (!id) return;
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/equipment/${id}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load equipment");
      const json = await res.json();
      setCurrentEquipment(json.data as Equipment);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Error loading equipment";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

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
            subLocation: updated.subLocation,
            lastMaintenance: updated.lastMaintenance,
            maintenanceInterval: updated.maintenanceInterval,
            status: updated.status,
            model: updated.model,
            manufacturer: updated.manufacturer,
            serialNumber: updated.serialNumber,
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

  const deleteEquipment = useCallback(
    async (id: string) => {
      try {
        setIsUpdating(true);
        const res = await fetch(`/api/equipment/${id}`, {
          method: "DELETE",
        });
        if (!res.ok) throw new Error("Failed to delete equipment");
        setEquipment((prev) => prev.filter((e) => e.id !== id));
        toast(t("toast.success"), { description: t("toast.updated") });
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Failed to delete equipment";
        toast(t("toast.error"), { description: message });
      } finally {
        setIsUpdating(false);
      }
    },
    [t]
  );

  // Debounced server search for homepage (non-list usage)
  useEffect(() => {
    if (list) return; // homepage search mode only
    const q = (searchTerm || "").trim();
    if (q.length === 0) {
      setSearchResults([]);
      return;
    }
    const controller = new AbortController();
    setIsSearching(true);
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/equipment?page=1&pageSize=25&q=${encodeURIComponent(q)}`, { cache: "no-store", signal: controller.signal });
        if (!res.ok) throw new Error("Failed to search equipment");
        const json = await res.json();
        const rows: Array<JEquipment> = Array.isArray(json.data) ? json.data : [];
        setSearchResults(rows);
      } catch {
        // ignore abort or network error for search UX
      } finally {
        setIsSearching(false);
      }
    }, 1000);
    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [list, searchTerm]);

  const filtered = useMemo(() => {
    // Server already applied filters; expose as-is
    return equipment;
  }, [equipment]);

  return {
    equipment,
    filteredEquipment: filtered,
    searchResults,
    loading,
    error,
    isUpdating,
    isInserting,
    isSearching,
    page,
    pageSize,
    total,
    searchTerm,
    statusFilter,
    currentEquipment,
    setSearchTerm,
    setStatusFilter,
    setPage,
    setPageSize,
    refresh,
    loadEquipmentById,
    addEquipment,
    updateEquipment,
    deleteEquipment,
  } as const;
}
