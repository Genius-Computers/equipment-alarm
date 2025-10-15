"use client";

import { useCallback, useEffect, useState } from "react";
import { SparePartOrder, SparePartOrderItem } from "@/lib/types";

export function useSparePartOrders(statusFilter?: string) {
  const [orders, setOrders] = useState<SparePartOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter) {
        params.append('status', statusFilter);
      }
      
      const res = await fetch(`/api/spare-part-orders?${params.toString()}`, {
        cache: "no-store"
      });
      
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || "Failed to load orders");
      }
      
      const j = await res.json();
      setOrders(j?.data || []);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Unexpected error";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  const createOrder = useCallback(async (
    items: SparePartOrderItem[],
    supervisorNotes?: string
  ) => {
    setIsCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/spare-part-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, supervisorNotes }),
      });
      
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || "Failed to create order");
      }
      
      const j = await res.json();
      await fetchOrders();
      return j?.data as SparePartOrder;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Unexpected error";
      setError(errorMessage);
      throw err;
    } finally {
      setIsCreating(false);
    }
  }, [fetchOrders]);

  const updateOrder = useCallback(async (
    id: string,
    status: string,
    items: SparePartOrderItem[],
    supervisorNotes?: string,
    technicianNotes?: string
  ) => {
    setIsUpdating(true);
    setError(null);
    try {
      const res = await fetch(`/api/spare-part-orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, items, supervisorNotes, technicianNotes }),
      });
      
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || "Failed to update order");
      }
      
      await fetchOrders();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Unexpected error";
      setError(errorMessage);
      throw err;
    } finally {
      setIsUpdating(false);
    }
  }, [fetchOrders]);

  const deleteOrder = useCallback(async (id: string) => {
    setIsUpdating(true);
    setError(null);
    try {
      const res = await fetch(`/api/spare-part-orders/${id}`, {
        method: "DELETE",
      });
      
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || "Failed to delete order");
      }
      
      await fetchOrders();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Unexpected error";
      setError(errorMessage);
      throw err;
    } finally {
      setIsUpdating(false);
    }
  }, [fetchOrders]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  return {
    orders,
    loading,
    error,
    isUpdating,
    isCreating,
    refresh: fetchOrders,
    createOrder,
    updateOrder,
    deleteOrder,
  };
}

