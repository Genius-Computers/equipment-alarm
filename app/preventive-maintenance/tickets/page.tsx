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
	const [scope, setScope] = useState<"pending" | "completed">("pending");
	const [assignedToMe, setAssignedToMe] = useState(false);
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(500);
	const [total, setTotal] = useState(0);
	const [pmTotal, setPmTotal] = useState(0);

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
					{role === "admin" || role === "admin_x" || role === "supervisor" ? (
						<Button
							variant="outline"
							onClick={() => router.push("/preventive-maintenance")}
						>
							Back to Locations
						</Button>
					) : null}
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
		</div>
	);
}











