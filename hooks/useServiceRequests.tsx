"use client"

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useLanguage } from "@/hooks/useLanguage";
import type { JServiceRequest, ServiceRequest, ServiceRequestApprovalStatus, ServiceRequestWorkStatus } from "@/lib/types/service-request";

export type ServiceRequestCreateInput = Omit<ServiceRequest, "id" | "approvalStatus" | "workStatus"> & {
	approvalStatus?: ServiceRequestApprovalStatus;
	workStatus?: ServiceRequestWorkStatus;
};

export function useServiceRequests(options?: { autoRefresh?: boolean }) {
    const { autoRefresh = true } = options ?? {};
    const { t } = useLanguage();

	const [requests, setRequests] = useState<Array<JServiceRequest>>([]);
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(10);
	const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const [isInserting, setIsInserting] = useState(false);
	const [updatingById, setUpdatingById] = useState<Record<string, { approval?: boolean; work?: boolean; details?: boolean }>>({});

    const [searchTerm, setSearchTerm] = useState("");
	const [priorityFilter, setPriorityFilter] = useState<"all" | JServiceRequest["priority"]>("all");
	const [approvalFilter, setApprovalFilter] = useState<"all" | JServiceRequest["approvalStatus"]>("all");

    // Tab scope state and cache per scope
    const [scope, setScope] = useState<"pending" | "completed">("pending");
    const [cache, setCache] = useState<Record<string, { page: number; pageSize: number; total: number; rows: Array<JServiceRequest> }>>({});

    const refresh = useCallback(async () => {
		try {
			setLoading(true);
			setError(null);
            const res = await fetch(`/api/service-request?page=${page}&pageSize=${pageSize}&scope=${scope}`, { cache: "no-store" });
			if (!res.ok) throw new Error("Failed to load service requests");
			const json = await res.json();
			const rows: Array<JServiceRequest> = Array.isArray(json.data) ? json.data : [];
			setTotal(Number(json?.meta?.total || 0));
			setRequests(rows);
            // update cache for scope
            setCache((prev) => ({ ...prev, [scope]: { page, pageSize, total: Number(json?.meta?.total || 0), rows } }));
		} catch (e: unknown) {
			const message = e instanceof Error ? e.message : "Error loading service requests";
			setError(message);
		} finally {
			setLoading(false);
		}
    }, [page, pageSize, scope]);

    useEffect(() => {
        if (!autoRefresh) return;
        // If switching to a scope we already have cached for this page/pageSize, hydrate quickly
        const scoped = cache[scope];
        if (scoped && scoped.page === page && scoped.pageSize === pageSize && Array.isArray(scoped.rows)) {
            setRequests(scoped.rows);
            setTotal(scoped.total);
            setLoading(false);
            return;
        }
        void refresh();
    }, [autoRefresh, refresh, scope, page, pageSize]);

	const createRequest = useCallback(
		async (input: ServiceRequestCreateInput) => {
			try {
				setIsInserting(true);
				const res = await fetch("/api/service-request", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(input),
				});
				if (!res.ok) {
					const j = await res.json().catch(() => ({}));
					throw new Error(j?.error || "Failed to create request");
				}
				const { data } = await res.json();
				setRequests((prev) => [data as JServiceRequest, ...prev]);
				toast(t("toast.success"), { description: t("toast.serviceRequestCreated") });
				return data as JServiceRequest;
			} catch (e: unknown) {
				const message = e instanceof Error ? e.message : "Failed to create request";
				toast(t("toast.error"), { description: message });
				throw e;
			} finally {
				setIsInserting(false);
			}
		},
		[t]
	);

	const updateDetails = useCallback(
		async (id: string, body: Partial<Omit<ServiceRequest, "id">>) => {
			try {
				setUpdatingById((s) => ({ ...s, [id]: { ...(s[id] || {}), details: true } }));
				const res = await fetch(`/api/service-request/${id}`, {
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(body),
				});
				if (!res.ok) {
					const j = await res.json().catch(() => ({}));
					throw new Error(j?.error || "Failed to update request");
				}
				const { data } = await res.json();
				setRequests((prev) => prev.map((r) => (r.id === (data as JServiceRequest).id ? (data as JServiceRequest) : r)));
				toast(t("toast.success"), { description: t("toast.updated") });
				return data as JServiceRequest;
			} catch (e: unknown) {
				const message = e instanceof Error ? e.message : "Failed to update request";
				toast(t("toast.error"), { description: message });
				throw e;
			} finally {
				setUpdatingById((s) => ({ ...s, [id]: { ...(s[id] || {}), details: false } }));
			}
		},
		[t]
	);

	const changeApprovalStatus = useCallback(
		async (id: string, approvalStatus: ServiceRequestApprovalStatus) => {
			try {
				setUpdatingById((s) => ({ ...s, [id]: { ...(s[id] || {}), approval: true } }));
				const res = await fetch(`/api/service-request/${id}`, {
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ approvalStatus }),
				});
				if (!res.ok) {
					const j = await res.json().catch(() => ({}));
					throw new Error(j?.error || "Failed to update approval status");
				}
				const { data } = await res.json();
				setRequests((prev) => prev.map((r) => (r.id === (data as JServiceRequest).id ? (data as JServiceRequest) : r)));
				toast(t("toast.success"), { description: t("toast.updated") });
				return data as JServiceRequest;
			} catch (e: unknown) {
				const message = e instanceof Error ? e.message : "Failed to update approval status";
				toast(t("toast.error"), { description: message });
				throw e;
			} finally {
				setUpdatingById((s) => ({ ...s, [id]: { ...(s[id] || {}), approval: false } }));
			}
		},
		[t]
	);

	const changeWorkStatus = useCallback(
		async (id: string, workStatus: ServiceRequestWorkStatus) => {
			try {
				setUpdatingById((s) => ({ ...s, [id]: { ...(s[id] || {}), work: true } }));
				const res = await fetch(`/api/service-request/${id}`, {
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ workStatus }),
				});
				if (!res.ok) {
					const j = await res.json().catch(() => ({}));
					throw new Error(j?.error || "Failed to update work status");
				}
				const { data } = await res.json();
				setRequests((prev) => prev.map((r) => (r.id === (data as JServiceRequest).id ? (data as JServiceRequest) : r)));
				toast(t("toast.success"), { description: t("toast.updated") });
				return data as JServiceRequest;
			} catch (e: unknown) {
				const message = e instanceof Error ? e.message : "Failed to update work status";
				toast(t("toast.error"), { description: message });
				throw e;
			} finally {
				setUpdatingById((s) => ({ ...s, [id]: { ...(s[id] || {}), work: false } }));
			}
		},
		[t]
	);

	const filtered = useMemo(() => {
		return requests.filter((r) => {
			const matchesSearch =
				(r.requestType || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
				(r.problemDescription || "").toLowerCase().includes(searchTerm.toLowerCase());
			const matchesPriority = priorityFilter === "all" || r.priority === priorityFilter;
			const matchesApproval = approvalFilter === "all" || r.approvalStatus === approvalFilter;
			return matchesSearch && matchesPriority && matchesApproval;
		});
	}, [requests, searchTerm, priorityFilter, approvalFilter]);

	return {
		requests,
		filteredRequests: filtered,
		loading,
		error,
		isInserting,
		updatingById,
		page,
		pageSize,
		total,
        scope,
		searchTerm,
		priorityFilter,
		approvalFilter,
		setSearchTerm,
		setPriorityFilter,
		setApprovalFilter,
		setPage,
		setPageSize,
        setScope,
		refresh,
		createRequest,
		updateDetails,
		changeApprovalStatus,
		changeWorkStatus,
	} as const;
}
