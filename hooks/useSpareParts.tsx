import { useEffect, useState, useCallback } from "react";
import { SparePart } from "@/lib/types";

export const useSpareParts = () => {
  const [spareParts, setSpareParts] = useState<SparePart[]>([]);
  const [filteredSpareParts, setFilteredSpareParts] = useState<SparePart[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isInserting, setIsInserting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);

  const fetchSpareParts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (searchTerm) {
        params.append("q", searchTerm);
      }
      const response = await fetch(`/api/spare-parts?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch spare parts");
      }
      const { data, meta } = await response.json();
      setSpareParts(data);
      setFilteredSpareParts(data);
      setTotal(meta.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchTerm]);

  useEffect(() => {
    fetchSpareParts();
  }, [fetchSpareParts]);

  const refresh = useCallback(() => {
    fetchSpareParts();
  }, [fetchSpareParts]);

  const addSparePart = useCallback(async (sparePart: Omit<SparePart, "id">) => {
    setIsInserting(true);
    try {
      const response = await fetch("/api/spare-parts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sparePart),
      });
      if (!response.ok) {
        throw new Error("Failed to add spare part");
      }
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      throw err;
    } finally {
      setIsInserting(false);
    }
  }, [refresh]);

  const updateSparePart = useCallback(async (sparePart: SparePart) => {
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/spare-parts/${sparePart.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sparePart),
      });
      if (!response.ok) {
        throw new Error("Failed to update spare part");
      }
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      throw err;
    } finally {
      setIsUpdating(false);
    }
  }, [refresh]);

  const deleteSparePart = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/spare-parts/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Failed to delete spare part");
      }
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      throw err;
    }
  }, [refresh]);

  return {
    spareParts,
    filteredSpareParts,
    loading,
    error,
    isUpdating,
    isInserting,
    page,
    pageSize,
    total,
    searchTerm,
    setSearchTerm,
    setPage,
    refresh,
    addSparePart,
    updateSparePart,
    deleteSparePart,
  };
};


