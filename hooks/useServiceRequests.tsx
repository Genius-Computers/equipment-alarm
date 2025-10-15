"use client"

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useLanguage } from "@/hooks/useLanguage";
import type { JServiceRequest, ServiceRequest } from "@/lib/types/service-request";
import { ServiceRequestApprovalStatus, ServiceRequestWorkStatus } from "@/lib/types/service-request";

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

	const [priorityFilter, setPriorityFilter] = useState<"all" | JServiceRequest["priority"] | "overdue">("all");
	const [approvalFilter, setApprovalFilter] = useState<"all" | JServiceRequest["approvalStatus"]>("all");

    // Tab scope state and cache per scope
	const [scope, setScope] = useState<"pending" | "completed">("pending");
	const [assignedToMe, setAssignedToMe] = useState(false);
	const [cache, setCache] = useState<Record<string, { page: number; pageSize: number; total: number; rows: Array<JServiceRequest> }>>({});
	const [refreshKey, setRefreshKey] = useState(0); // Key to trigger external refreshes (e.g., stats component)

	const refresh = useCallback(async () => {
		try {
			setLoading(true);
			setError(null);
			const assignedParam = assignedToMe ? "&assignedTo=me" : "";
			const pr = encodeURIComponent((priorityFilter === "overdue" ? "all" : (priorityFilter || "all")) as string);
			const ap = encodeURIComponent(approvalFilter || "all");
			const controller = new AbortController();
			const res = await fetch(`/api/service-request?page=${page}&pageSize=${pageSize}&scope=${scope}${assignedParam}&priority=${pr}&approval=${ap}` , { cache: "no-store", signal: controller.signal });
			if (!res.ok) throw new Error("Failed to load service requests");
			const json = await res.json();
			const rows: Array<JServiceRequest> = Array.isArray(json.data) ? json.data : [];
			setTotal(Number(json?.meta?.total || 0));
			setRequests(rows);
			// update cache only for default filter state (no search; all priority/approval)
			const allowCache = (priorityFilter === "all") && (approvalFilter === "all") && !assignedToMe;
			if (allowCache) {
				const key = `${scope}:all`;
				setCache((prev) => ({ ...prev, [key]: { page, pageSize, total: Number(json?.meta?.total || 0), rows } }));
			}
		} catch (e: unknown) {
			const message = e instanceof Error ? e.message : "Error loading service requests";
			setError(message);
		} finally {
			setLoading(false);
		}
	}, [page, pageSize, scope, assignedToMe, priorityFilter, approvalFilter]);

	const loadForEquipment = useCallback(
		async (
			equipmentId: string,
			options?: { page?: number; pageSize?: number; scope?: "pending" | "completed" }
		) => {
			try {
				if (!equipmentId) return;
				setLoading(true);
				setError(null);
				const p = options?.page ?? 1;
				const ps = options?.pageSize ?? 100;
				const sc = options?.scope;
				const scopeParam = sc ? `&scope=${sc}` : "";
				const res = await fetch(
					`/api/service-request?equipmentId=${equipmentId}&page=${p}&pageSize=${ps}${scopeParam}`,
					{ cache: "no-store" }
				);
				if (!res.ok) throw new Error("Failed to load service requests");
				const json = await res.json();
				const rows: Array<JServiceRequest> = Array.isArray(json.data) ? json.data : [];
				setTotal(Number(json?.meta?.total || 0));
				setRequests(rows);
				// align local pagination state with what we loaded
				setPage(p);
				setPageSize(ps);
			} catch (e: unknown) {
				const message = e instanceof Error ? e.message : "Error loading service requests";
				setError(message);
			} finally {
				setLoading(false);
			}
		}, []
	);

	useEffect(() => {
		if (!autoRefresh) return;
		// hydrate from cache only when no active filters/search
		const allowCache = (priorityFilter === "all") && (approvalFilter === "all") && !assignedToMe;
		if (allowCache) {
			const key = `${scope}:all`;
			const scoped = cache[key];
			if (scoped && scoped.page === page && scoped.pageSize === pageSize && Array.isArray(scoped.rows)) {
				setRequests(scoped.rows);
				setTotal(scoped.total);
				setLoading(false);
				return;
			}
		}
		void refresh();
		return () => {
			// no-op
		};
	}, [autoRefresh, refresh, scope, page, pageSize, assignedToMe, priorityFilter, approvalFilter]);

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
        async (id: string, approvalStatus: ServiceRequestApprovalStatus, approvalNote?: string) => {
			try {
				setUpdatingById((s) => ({ ...s, [id]: { ...(s[id] || {}), approval: true } }));
				const res = await fetch(`/api/service-request/${id}`, {
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ approvalStatus, approvalNote }),
				});
				if (!res.ok) {
					const j = await res.json().catch(() => ({}));
					throw new Error(j?.error || "Failed to update approval status");
				}
			const { data } = await res.json();
			toast(t("toast.success"), { description: t("toast.updated") });
			// Immediately refresh to update the list and move items between scopes if needed
			await refresh();
			setRefreshKey(prev => prev + 1); // Trigger refresh in stats component
			return data as JServiceRequest;
		} catch (e: unknown) {
			const message = e instanceof Error ? e.message : "Failed to update approval status";
			toast(t("toast.error"), { description: message });
			throw e;
			} finally {
				setUpdatingById((s) => ({ ...s, [id]: { ...(s[id] || {}), approval: false } }));
			}
		},
		[t, refresh]
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
				toast(t("toast.success"), { description: t("toast.updated") });
				// Immediately refresh to update the list and move items between scopes if needed
				await refresh();
				setRefreshKey(prev => prev + 1); // Trigger refresh in stats component
				return data as JServiceRequest;
			} catch (e: unknown) {
				const message = e instanceof Error ? e.message : "Failed to update work status";
				toast(t("toast.error"), { description: message });
				throw e;
			} finally {
				setUpdatingById((s) => ({ ...s, [id]: { ...(s[id] || {}), work: false } }));
			}
		},
		[t, refresh]
	);

	const filtered = useMemo(() => {
		if (priorityFilter !== "overdue") return requests;
		const fiveDaysMs = 5 * 24 * 60 * 60 * 1000;
		const now = Date.now();
		return requests.filter((r) => {
			const sched = r.scheduledAt ? new Date(r.scheduledAt).getTime() : NaN;
			if (!Number.isFinite(sched)) return false;
			return r.workStatus === ServiceRequestWorkStatus.PENDING && (now - sched) > fiveDaysMs;
		});
	}, [requests, priorityFilter]);

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
		assignedToMe,
		priorityFilter,
		approvalFilter,
		refreshKey,
		setPriorityFilter,
		setApprovalFilter,
		setPage,
		setPageSize,
		setScope,
		setAssignedToMe,
		refresh,
		loadForEquipment,
		createRequest,
		updateDetails,
		changeApprovalStatus,
		changeWorkStatus,
	} as const;
}
