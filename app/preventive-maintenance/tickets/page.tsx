"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import ServiceRequestCard from "@/components/ServiceRequestCard";
import type { JServiceRequest } from "@/lib/types/service-request";
import { ServiceRequestType } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ServiceRequestsCSVExport from "@/components/ServiceRequestsCSVExport";
import CustomPagination from "@/components/CustomPagination";
import { toast } from "sonner";
import { useLanguage } from "@/hooks/useLanguage";
import { Loader2, Wrench, User } from "lucide-react";
import { useSelfProfile } from "@/hooks/useSelfProfile";
import { useRouter, useSearchParams } from "next/navigation";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function PreventiveMaintenanceTicketsPage() {
	const { t } = useLanguage();
	const { profile } = useSelfProfile();
	const role = profile?.role || null;
	const router = useRouter();
	const searchParams = useSearchParams();

	const locationId = searchParams.get("locationId");
	const locationName = searchParams.get("locationName");

	const [loading, setLoading] = useState(true);
	const [requests, setRequests] = useState<JServiceRequest[]>([]);
	const [scope, setScope] = useState<"pending" | "completed">(() => {
		const v = searchParams.get("scope");
		return v === "completed" ? "completed" : "pending";
	});
	const [assignedToMe, setAssignedToMe] = useState(() => searchParams.get("assignedToMe") === "true");
	const [page, setPage] = useState(() => {
		const v = Number(searchParams.get("page") || "1");
		return Number.isFinite(v) && v > 0 ? v : 1;
	});
	const [pageSize, setPageSize] = useState(() => {
		const v = Number(searchParams.get("pageSize") || "500");
		return Number.isFinite(v) && v > 0 ? v : 500;
	});
	const [total, setTotal] = useState(0);
	const [pmTotal, setPmTotal] = useState(0);
	const [completeOpen, setCompleteOpen] = useState(false);
	const [completeCount, setCompleteCount] = useState<number | null>(null);
	const [completing, setCompleting] = useState(false);

	const returnTo = (() => {
		const params = new URLSearchParams(searchParams.toString());
		params.set("scope", scope);
		params.set("assignedToMe", assignedToMe ? "true" : "false");
		params.set("page", String(page));
		params.set("pageSize", String(pageSize));
		return `/preventive-maintenance/tickets?${params.toString()}`;
	})();

	const load = async () => {
		try {
			setLoading(true);
			const params = new URLSearchParams({
				page: String(page),
				pageSize: String(pageSize),
				scope,
				requestType: ServiceRequestType.PREVENTIVE_MAINTENANCE,
			});
			if (assignedToMe) {
				params.set("assignedTo", "me");
			}

			const res = await fetch(`/api/service-request?${params.toString()}`, { cache: "no-store" });
			if (!res.ok) throw new Error("Failed to load service requests");
			const data = await res.json();
			const all: JServiceRequest[] = data.data || [];
			const metaTotal = Number(data?.meta?.total ?? all.length);

			// API already filtered by preventive_maintenance; treat entire result as PM set for this scope
			const pmOnly = all;
			setPmTotal(metaTotal);
			setTotal(metaTotal);

			// If a location filter is provided, narrow down to that location
			const filtered =
				locationId != null && locationId !== ""
					? pmOnly.filter((r) => r.equipment?.locationId === locationId)
					: pmOnly;

			setRequests(filtered);
		} catch (err) {
			console.error(err);
			toast.error("Failed to load preventive maintenance requests");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		void load();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [scope, assignedToMe, locationId, page, pageSize]);

	useEffect(() => {
		// Server-authoritative count of pending PMs for this location (used for bulk completion).
		const run = async () => {
			try {
				if (!locationId) return;
				if (!(role === "admin" || role === "admin_x" || role === "supervisor")) return;
				if (scope !== "pending") return;
				const res = await fetch(
					`/api/service-request/pm/bulk-complete?locationId=${encodeURIComponent(locationId)}`,
					{ cache: "no-store" },
				);
				if (!res.ok) return;
				const j = await res.json().catch(() => ({}));
				const c = Number(j?.data?.count ?? NaN);
				if (Number.isFinite(c)) setCompleteCount(c);
			} catch {
				// ignore
			}
		};
		setCompleteCount(null);
		void run();
	}, [locationId, role, scope]);

	return (
		<div className="min-h-screen bg-background">
			<Header />
			<main className="container mx-auto px-4 py-8 space-y-4 max-w-6xl">
				<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
					<div className="flex items-center gap-3">
						<Wrench className="h-8 w-8 text-primary" />
						<div>
								<h1 className="text-2xl font-semibold">Preventive Maintenance Tickets</h1>
								<p className="text-muted-foreground">
									View and work on preventive maintenance service requests
									{locationName ? ` for ${locationName}` : null}
								</p>
						</div>
					</div>
					<div className="flex items-center gap-2">
						{locationId && scope === "pending" && (role === "admin" || role === "admin_x" || role === "supervisor") ? (
							<Button
								variant="default"
								onClick={() => setCompleteOpen(true)}
								disabled={loading || completing || (completeCount != null && completeCount <= 0)}
							>
								{completeCount != null ? `Complete PMs (${completeCount})` : "Complete PMs"}
							</Button>
						) : null}
						{role === "admin" || role === "admin_x" || role === "supervisor" ? (
							<Button variant="outline" onClick={() => router.push("/preventive-maintenance")}>
								Back to Locations
							</Button>
						) : null}
					</div>
				</div>

				{/* Scope / filters / stats */}
				<div className="space-y-3">
					{/* Scope + stats + export */}
					<div className="space-y-3">
						{/* Scope */}
						<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
							<div className="flex items-center gap-2">
								<button
									className={`px-3 py-1 rounded border text-sm ${
										scope === "pending" ? "bg-primary text-primary-foreground" : "bg-muted"
									}`}
									onClick={() => setScope("pending")}
								>
									Pending
								</button>
								<button
									className={`px-3 py-1 rounded border text-sm ${
										scope === "completed" ? "bg-primary text-primary-foreground" : "bg-muted"
									}`}
									onClick={() => setScope("completed")}
								>
									Completed
								</button>
							</div>
						</div>

						{/* Counters + Export */}
						<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
							<div className="flex flex-col sm:flex-row gap-2">
								<Card className="p-4 transition-colors w-full sm:max-w-xs">
									<div className="flex items-center justify-between gap-3">
										<div className="space-y-1">
											<p className="text-xs text-muted-foreground">
												{t("serviceRequest.stats.preventive")}
											</p>
											<p className="text-2xl font-bold">{pmTotal}</p>
										</div>
										<Wrench className="h-8 w-8 text-green-600 dark:text-green-400" />
									</div>
								</Card>
								{role === "technician" ? (
									<Card
										className={`p-4 transition-colors w-full sm:max-w-xs cursor-pointer ${
											assignedToMe ? "border-primary bg-primary/5" : ""
										}`}
										role="button"
										tabIndex={0}
										onClick={() => {
											setAssignedToMe((prev) => !prev);
											setPage(1);
										}}
										onKeyDown={(e) => {
											if (e.key === "Enter" || e.key === " ") {
												e.preventDefault();
												setAssignedToMe((prev) => !prev);
												setPage(1);
											}
										}}
									>
										<div className="flex items-center justify-between gap-3">
											<div className="space-y-1">
												<p className="text-xs text-muted-foreground">
													{t("serviceRequest.stats.assignedToMe")}
												</p>
												<p className="text-2xl font-bold">
													{
														requests.filter((r) => {
															const techId = profile?.id;
															if (!techId) return false;
															return (
																r.assignedTechnicianId === techId ||
																(Array.isArray(r.assignedTechnicianIds) &&
																	r.assignedTechnicianIds.includes(techId))
															);
														}).length
													}
												</p>
											</div>
											<User className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
										</div>
									</Card>
								) : null}
							</div>
							<div className="flex justify-start sm:justify-end">
								<ServiceRequestsCSVExport
									items={requests}
									filters={{
										scope,
										priority: "all",
										approval: "all",
										requestType: ServiceRequestType.PREVENTIVE_MAINTENANCE,
										assignedToMe,
									}}
								/>
							</div>
						</div>
					</div>
				</div>

				<Card>
					<CardHeader>
						<CardTitle className="text-lg">
							{scope === "pending" ? "Pending requests" : "Completed requests"}
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						{loading ? (
							<div className="flex items-center gap-2 text-muted-foreground">
								<Loader2 className="h-4 w-4 animate-spin" />
								<span>Loading...</span>
							</div>
						) : requests.length === 0 ? (
							<div className="text-muted-foreground">No preventive maintenance requests found.</div>
						) : (
							<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
								{requests.map((r) => (
									<ServiceRequestCard
										key={r.id}
										request={r}
										canApprove={role === "admin" || role === "admin_x" || role === "supervisor"}
										emphasizeEquipmentName
										viewerRole={role}
										viewerId={profile?.id || null}
										returnTo={returnTo}
									/>
								))}
							</div>
						)}
						<CustomPagination
							page={page}
							pageSize={pageSize}
							total={total}
							onPrev={() => setPage(Math.max(1, page - 1))}
							onNext={() => {
								const totalPages = Math.max(1, Math.ceil(total / pageSize));
								setPage(Math.min(totalPages, page + 1));
							}}
							onPageChange={(newPage) => setPage(newPage)}
							onPageSizeChange={(newPageSize) => {
								setPageSize(newPageSize);
								setPage(1);
							}}
						/>
					</CardContent>
				</Card>
			</main>
			{locationId && (role === "admin" || role === "admin_x" || role === "supervisor") ? (
				<AlertDialog open={completeOpen} onOpenChange={setCompleteOpen}>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>Complete preventive maintenance for this location?</AlertDialogTitle>
							<AlertDialogDescription>
								This will mark <strong>all pending</strong> PM tickets in this primary location as <strong>completed</strong>
								{completeCount != null ? <> (<strong>{completeCount}</strong> ticket(s))</> : null}.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel disabled={completing}>Cancel</AlertDialogCancel>
							<AlertDialogAction
								disabled={completing || !locationId}
								onClick={async () => {
									try {
										if (!locationId) return;
										setCompleting(true);
										const res = await fetch("/api/service-request/pm/bulk-complete", {
											method: "PATCH",
											headers: { "Content-Type": "application/json" },
											body: JSON.stringify({ locationId }),
										});
										const j = await res.json().catch(() => ({}));
										if (!res.ok) {
											throw new Error(j?.error || "Failed to complete PMs");
										}
										const updatedCount = Number(j?.data?.updatedCount ?? 0);
										toast.success("Completed PMs", {
											description: `Completed ${updatedCount} PM ticket(s) for this location.`,
										});
										setCompleteOpen(false);
										void load();
										// refresh count
										setCompleteCount(null);
									} catch (e: unknown) {
										const msg = e instanceof Error ? e.message : "Failed to complete PMs";
										toast.error(msg);
									} finally {
										setCompleting(false);
									}
								}}
							>
								{completing ? "Completing..." : "Complete"}
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			) : null}
		</div>
	);
}











