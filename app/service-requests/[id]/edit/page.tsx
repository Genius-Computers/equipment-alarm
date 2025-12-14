"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Wrench, Loader2, ArrowLeft, PrinterIcon, Users } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { toast } from "sonner";
import { ServiceRequestPriority, ServiceRequestType, ServiceRequestWorkStatus } from "@/lib/types";
import type { JServiceRequest } from "@/lib/types/service-request";
import { useServiceRequests } from "@/hooks/useServiceRequests";
import { useSelfProfile } from "@/hooks/useSelfProfile";
import { isApproverRole } from "@/lib/types/user";
import PreventiveMaintenanceForm from "@/components/PreventiveMaintenanceForm";
import type { PmDetails } from "@/lib/types/preventive-maintenance";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";

export default function EditServiceRequestPage() {
	const params = useParams();
	const router = useRouter();
	const { t } = useLanguage();
	const { updateDetails } = useServiceRequests({ autoRefresh: false });
	const { profile } = useSelfProfile();
	const isApprover = isApproverRole(profile?.role);

	const id = String(params?.id || "");

	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [request, setRequest] = useState<JServiceRequest | null>(null);
	const approved = request?.approvalStatus === "approved";

	const [section, setSection] = useState<"basic" | "details">(isApprover ? "basic" : "details");
	// PM requests are auto-approved - technicians can edit immediately
	const isPmRequest = request?.requestType === ServiceRequestType.PREVENTIVE_MAINTENANCE;
	const isCompletedOrCancelled =
		request?.workStatus === ServiceRequestWorkStatus.COMPLETED ||
		request?.workStatus === ServiceRequestWorkStatus.CANCELLED;
	const canEditDetails = request ? (!isCompletedOrCancelled && (isApprover ? true : (isPmRequest ? true : Boolean(approved)))) : false;

	const [form, setForm] = useState({
		requestType: ServiceRequestType.PREVENTIVE_MAINTENANCE,
		scheduledAt: "",
		priority: ServiceRequestPriority.MEDIUM,
		assignedTechnicianId: "",
		problemDescription: "",
		technicalAssessment: "",
		recommendation: "",
	});
	const [pmDetails, setPmDetails] = useState<PmDetails>({
		technicianName: "",
		notes: "",
		lastPpmDate: undefined,
		duePpmDate: undefined,
		qualitative: [],
		quantitative: [],
	});

	type Technician = { id: string; displayName?: string | null; email?: string | null };
	const [technicians, setTechnicians] = useState<Technician[]>([]);
	const [techLoading, setTechLoading] = useState(false);

	type AvailableSparePart = { id: string; name: string; serialNumber?: string; quantity: number; manufacturer?: string; supplier?: string };
	const [availableSpareParts, setAvailableSpareParts] = useState<AvailableSparePart[]>([]);
	const [sparePartsLoading, setSparePartsLoading] = useState(false);

	type SparePart = { sparePartId?: string; sparePartName?: string; part: string; description?: string; quantity: number; cost: number; source: string; manufacturer?: string; serialNumber?: string };
	const [parts, setParts] = useState<SparePart[]>([]);
	const [draft, setDraft] = useState<SparePart>({ sparePartId: "", sparePartName: "", part: "", description: "", quantity: 1, cost: 0, source: "", manufacturer: "", serialNumber: "" });
	const [sparePartFilter, setSparePartFilter] = useState("");
	const [sparePartsNeeded, setSparePartsNeeded] = useState(true);

	const [originalSparePartValues, setOriginalSparePartValues] = useState<{ manufacturer?: string; serialNumber?: string; source?: string }>({});
	const [sparePartChanged, setSparePartChanged] = useState(false);
	const [updatingSparePart, setUpdatingSparePart] = useState(false);
	const [selfAssignOpen, setSelfAssignOpen] = useState(false);
	const [additionalTechnicianIds, setAdditionalTechnicianIds] = useState<string[]>([]);

	const isValid = useMemo(() => {
		// For approvers editing basic fields, do NOT require a technician assignment
		if (isApprover && section === "basic") {
			return !!form.requestType && !!form.priority && !!form.scheduledAt;
		}
		// For technicians or details section, always valid (they can save partial info)
		return true;
	}, [form, isApprover, section]);

	const totalCost = useMemo(() => parts.reduce((sum, p) => sum + (Number(p.cost) || 0) * (Number(p.quantity) || 0), 0), [parts]);

	useEffect(() => {
		const fetchData = async () => {
			try {
				setLoading(true);
				const res = await fetch(`/api/service-request/${id}`, { cache: "no-store" });
				if (!res.ok) throw new Error("Failed to load request");
				const j = await res.json();
				const r: JServiceRequest = j?.data;
				setRequest(r);
				// Prompt self-assign for technicians on unassigned, open requests:
				// - PM requests: always allowed to self-assign while work is pending.
				// - Regular (non-PM) requests: allowed only after supervisor/admin_x approval.
				const isTechnician = profile?.role === "technician";
				const isUnassigned = !r.assignedTechnicianId;
				const isPending = r.workStatus === ServiceRequestWorkStatus.PENDING;
				const isApproved = r.approvalStatus === "approved";

				if (
					isTechnician &&
					isUnassigned &&
					isPending &&
					(r.requestType === ServiceRequestType.PREVENTIVE_MAINTENANCE || isApproved)
				) {
					setSelfAssignOpen(true);
				}
				// Initialize PM details (preserve if present). Do NOT auto-fill technician name unless already on the request.
				setPmDetails((prev) => {
					const existingPm = r.pmDetails as PmDetails | undefined;
					const lastMaintenanceRaw = r.equipment?.lastMaintenance || null;
					const nextMaintenanceRaw = r.equipment?.nextMaintenance || null;

					// Use stored PM values when available; otherwise fall back to equipment dates (date-only, YYYY-MM-DD)
					const lastPpmDate =
						existingPm?.lastPpmDate ||
						prev.lastPpmDate ||
						(lastMaintenanceRaw ? lastMaintenanceRaw.slice(0, 10) : undefined);
					const duePpmDate =
						existingPm?.duePpmDate ||
						prev.duePpmDate ||
						(nextMaintenanceRaw ? nextMaintenanceRaw.slice(0, 10) : undefined);

					return {
						technicianName:
							existingPm?.technicianName ||
							prev.technicianName ||
							(r.assignedTechnicianId
								? (r.technician?.displayName || r.technician?.email || "")
								: ""),
						notes: existingPm?.notes || prev.notes || "",
						lastPpmDate,
						duePpmDate,
						qualitative: Array.isArray(existingPm?.qualitative) ? existingPm!.qualitative : [],
						quantitative: Array.isArray(existingPm?.quantitative) ? existingPm!.quantitative : [],
					};
				});
				// Derive primary and additional technicians from the request
				const allAssignedIds = Array.isArray(r.assignedTechnicianIds) ? r.assignedTechnicianIds : [];
				const primaryFromList = allAssignedIds.length > 0 ? allAssignedIds[0] : undefined;
				const primaryTechnicianId = r.assignedTechnicianId || primaryFromList || "";
				const extraTechnicianIds = allAssignedIds.filter((id) => id && id !== primaryTechnicianId);

				setForm({
					requestType: r.requestType,
					scheduledAt: (r.scheduledAt || "").slice(0, 16),
					priority: r.priority,
					assignedTechnicianId: primaryTechnicianId,
					problemDescription: r.problemDescription || "",
					technicalAssessment: r.technicalAssessment || "",
					recommendation: r.recommendation || "",
				});
				setAdditionalTechnicianIds(extraTechnicianIds);
				const existingParts = r.sparePartsNeeded || [];
				setParts(existingParts);
				setSparePartsNeeded(existingParts.length > 0);
			} catch (e: unknown) {
				const message = e instanceof Error ? e.message : "Failed to load request";
				toast(t("toast.error"), { description: message });
			} finally {
				setLoading(false);
			}
		};
		if (id && profile?.role) void fetchData();
	}, [id, t, profile?.role]);

	useEffect(() => {
		const loadTechnicians = async () => {
			try {
				setTechLoading(true);
				const res = await fetch(`/api/users?onlyTechnicians=true`);
				if (!res.ok) return;
				const j = (await res.json()) as { data?: Array<{ id: string; displayName?: string; email?: string }> };
				if (Array.isArray(j.data)) setTechnicians(j.data);
			} catch {
				// ignore silently
			} finally {
				setTechLoading(false);
			}
		};
		if (!techLoading && technicians.length === 0) void loadTechnicians();
	}, [techLoading, technicians.length]);

	useEffect(() => {
		const loadSpareParts = async () => {
			try {
				setSparePartsLoading(true);
				const res = await fetch(`/api/spare-parts?all=true`);
				if (!res.ok) return;
				const j = (await res.json()) as { data?: AvailableSparePart[] };
				if (Array.isArray(j.data)) setAvailableSpareParts(j.data);
			} catch {
				// ignore silently
			} finally {
				setSparePartsLoading(false);
			}
		};
		if (!sparePartsLoading && availableSpareParts.length === 0) void loadSpareParts();
	}, [sparePartsLoading, availableSpareParts.length]);

	const buildAssignedTechnicianIdsPayload = () => {
		if (!request) return undefined;
		const existingAll = Array.isArray(request.assignedTechnicianIds) ? request.assignedTechnicianIds : [];
		const primaryFromExisting = request.assignedTechnicianId || existingAll[0];
		const primary = form.assignedTechnicianId || primaryFromExisting;

		const extras = additionalTechnicianIds.filter((id) => id && id !== primary);

		if (!primary && extras.length === 0) return undefined;
		if (!primary) return extras;
		return [primary, ...extras];
	};

	const handleSave = async () => {
		if (!request) return;
		try {
			setSaving(true);
			if (!canEditDetails) return;
			const assignedTechnicianIdsPayload = buildAssignedTechnicianIdsPayload();
			const body = isApprover
				? {
					requestType: form.requestType,
					scheduledAt: form.scheduledAt,
					priority: form.priority,
					assignedTechnicianId: form.assignedTechnicianId,
					...(assignedTechnicianIdsPayload ? { assignedTechnicianIds: assignedTechnicianIdsPayload } : {}),
					problemDescription: form.problemDescription,
					technicalAssessment: form.technicalAssessment,
					recommendation: form.recommendation,
					sparePartsNeeded: parts,
					pmDetails: request.requestType === ServiceRequestType.PREVENTIVE_MAINTENANCE ? pmDetails : undefined,
				}
				: {
					problemDescription: form.problemDescription,
					technicalAssessment: form.technicalAssessment,
					recommendation: form.recommendation,
					sparePartsNeeded: sparePartsNeeded ? parts : [],
					...(assignedTechnicianIdsPayload ? { assignedTechnicianIds: assignedTechnicianIdsPayload } : {}),
					pmDetails: request.requestType === ServiceRequestType.PREVENTIVE_MAINTENANCE ? pmDetails : undefined,
				};
			await updateDetails(request.id, body);
			toast(t("toast.success"), { description: t("toast.serviceRequestUpdated") });
			router.push("/service-requests");
		} catch (e: unknown) {
			const message = e instanceof Error ? e.message : "Action failed";
			toast(t("toast.error"), { description: message });
		} finally {
			setSaving(false);
		}
	};

	const isBlockingLoading = loading && techLoading && technicians.length === 0;

	return (
		<div className="min-h-screen bg-background">
			<Header />
			<main className="container mx-auto px-6 py-6 space-y-4">
				<div className="flex items-center justify-between gap-2">
					<div className="flex items-center gap-2">
						<Button variant="outline" size="sm" onClick={() => router.push("/service-requests")}>
							<ArrowLeft className="h-4 w-4" />
							{t("common.back")}
						</Button>
						<h1 className="text-lg font-semibold flex items-center gap-2">
							<Wrench className="h-5 w-5 text-primary" />
							{t("serviceRequest.editTitle")}
							{request?.equipment?.name ? (
								<Badge variant="secondary" className="ml-2">{request.equipment.name}</Badge>
							) : null}
						</h1>
					</div>
					{request?.id ? (
						<Button
							size="sm"
							className="gap-1"
							onClick={() => {
								const url = `/service-requests/${request.id}/print`;
								window.open(url, "_blank", "noopener,noreferrer");
							}}
						>
							<PrinterIcon className="h-4 w-4" />
						</Button>
					) : null}
				</div>

				{/* Section switcher */}
				{request ? (
					<div className="flex items-center gap-2">
						{isApprover ? (
							<div className="inline-flex rounded-md border bg-muted/50 p-1">
								<button type="button" className={`px-3 py-1 text-sm rounded ${section === "basic" ? "bg-background border" : ""}`} onClick={() => setSection("basic")} disabled={saving}>
									{t("serviceRequest.basic") || "Basic"}
								</button>
								<button type="button" className={`px-3 py-1 text-sm rounded ${section === "details" ? "bg-background border" : ""}`} onClick={() => setSection("details")} disabled={saving}>
									{t("serviceRequest.details") || "Technician Details"}
								</button>
							</div>
						) : (
							<div className="text-xs text-muted-foreground">{t("serviceRequest.details") || "Technician Details"}</div>
						)}
					</div>
				) : null}

				{isBlockingLoading ? (
					<div className="space-y-4">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div className="space-y-2">
								<Skeleton className="h-4 w-32" />
								<Skeleton className="h-9 w-full" />
							</div>
							<div className="space-y-2">
								<Skeleton className="h-4 w-28" />
								<Skeleton className="h-9 w-full" />
							</div>
						</div>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div className="space-y-2">
								<Skeleton className="h-4 w-36" />
								<Skeleton className="h-9 w-full" />
							</div>
							<div className="space-y-2">
								<Skeleton className="h-4 w-40" />
								<Skeleton className="h-9 w-full" />
							</div>
						</div>
					</div>
				) : (
					<div className="space-y-6">
						{/* Show message for non-approvers when approval is pending (not for PM requests - they're auto-approved) */}
						{!canEditDetails && request && request.approvalStatus === "pending" && !isPmRequest && (
							<div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md">
								<p className="text-sm text-amber-900 dark:text-amber-100">
									<strong>Awaiting Approval:</strong> This service request is pending supervisor approval. You can edit details once it has been approved.
								</p>
							</div>
						)}

						{/* Basic section */}
						{request && (section === "basic" && isApprover) && (
							<div className="space-y-4">
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div className="flex flex-col gap-2">
										<Label>{t("serviceRequest.requestType")}</Label>
										<Select value={form.requestType} onValueChange={(v) => setForm((s) => ({ ...s, requestType: v as ServiceRequestType }))}>
											<SelectTrigger>
												<SelectValue placeholder={t("serviceRequest.selectType")} />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value={ServiceRequestType.PREVENTIVE_MAINTENANCE}>{t("serviceRequest.types.preventive")}</SelectItem>
												<SelectItem value={ServiceRequestType.CORRECTIVE_MAINTENANCE}>{t("serviceRequest.types.corrective")}</SelectItem>
												<SelectItem value={ServiceRequestType.INSTALL}>{t("serviceRequest.types.install")}</SelectItem>
												<SelectItem value={ServiceRequestType.ASSESS}>{t("serviceRequest.types.assess")}</SelectItem>
												<SelectItem value={ServiceRequestType.OTHER}>{t("serviceRequest.types.other")}</SelectItem>
											</SelectContent>
										</Select>
									</div>
									<div className="flex flex-col gap-2">
										<Label>{t("serviceRequest.priority")}</Label>
										<Select value={form.priority} onValueChange={(v) => setForm((s) => ({ ...s, priority: v as ServiceRequestPriority }))}>
											<SelectTrigger>
												<SelectValue placeholder={t("serviceRequest.selectPriority")} />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value={ServiceRequestPriority.LOW}>{t("serviceRequest.priorities.low")}</SelectItem>
												<SelectItem value={ServiceRequestPriority.MEDIUM}>{t("serviceRequest.priorities.medium")}</SelectItem>
												<SelectItem value={ServiceRequestPriority.HIGH}>{t("serviceRequest.priorities.high")}</SelectItem>
											</SelectContent>
										</Select>
									</div>
								</div>

								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div className="flex flex-col gap-2">
										<Label>{t("serviceRequest.scheduledAt")}</Label>
										<Input type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm((s) => ({ ...s, scheduledAt: e.target.value }))} />
									</div>
									{/* For PM requests, only show assignment field if not a PM request, or show as read-only for supervisors */}
									{!isPmRequest ? (
										<div className="flex flex-col gap-2">
											<Label>{t("serviceRequest.assignedTechnician")}</Label>
											<Select value={form.assignedTechnicianId} onValueChange={(v) => setForm((s) => ({ ...s, assignedTechnicianId: v === "__unassigned__" ? "" : v }))} disabled={techLoading}>
												<SelectTrigger>
													<SelectValue placeholder={t("serviceRequest.selectTechnician")} />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="__unassigned__" className="text-amber-700 font-medium">Unassigned</SelectItem>
													{technicians.map((tech) => (
														<SelectItem key={tech.id} value={tech.id}>{tech.displayName || tech.email || tech.id}</SelectItem>
													))}
												</SelectContent>
											</Select>
										</div>
									) : (
										<div className="flex flex-col gap-2">
											<Label>{t("serviceRequest.assignedTechnician")}</Label>
											<Input 
												value={
													request.assignedTechnicianId
														? (request.technician?.displayName ||
															request.technician?.email ||
															request.assignedTechnicianId)
														: "Unassigned"
												} 
												disabled 
												className="bg-muted"
											/>
											<p className="text-xs text-muted-foreground">Only technicians can be assigned to preventive maintenance requests</p>
										</div>
									)}
								</div>
									</div>
							)}

						{/* Technician assignment management (additional technicians) */}
						{request && section === "details" && !isCompletedOrCancelled && (
							(() => {
								if (!profile?.role || !profile?.id) return null;
								const isSupervisorOrAdmin =
									profile.role === "admin" || profile.role === "admin_x" || profile.role === "supervisor";
								const allAssignedIds = Array.isArray(request.assignedTechnicianIds) ? request.assignedTechnicianIds : [];
								const primaryFromExisting = request.assignedTechnicianId || allAssignedIds[0];
								const isAssignedTechnician =
									profile.id === request.assignedTechnicianId ||
									(Array.isArray(request.assignedTechnicianIds) &&
										request.assignedTechnicianIds.includes(profile.id));

								// PM requests: no approval gate; Regular: require approval for non-approvers
								const isRegular = request.requestType !== ServiceRequestType.PREVENTIVE_MAINTENANCE;
								const isApproved = request.approvalStatus === "approved";

								const actorAllowed = isSupervisorOrAdmin || isAssignedTechnician;
								const statusAllows =
									request.workStatus === ServiceRequestWorkStatus.PENDING &&
									(!isRegular || isApproved || isSupervisorOrAdmin);

								if (!actorAllowed || !statusAllows) return null;

								const primaryTechnicianLabel =
									technicians.find((t) => t.id === primaryFromExisting)?.displayName ||
									technicians.find((t) => t.id === primaryFromExisting)?.email ||
									primaryFromExisting ||
									t("serviceRequest.assignedTechnician");

								return (
									<div className="space-y-2 rounded-md border p-3 bg-muted/40">
										<div className="flex items-center gap-2 mb-1">
											<Users className="h-4 w-4 text-muted-foreground" />
											<div className="flex flex-col">
												<span className="text-xs font-medium">
													{ "Additional technicians"}
												</span>
												<span className="text-[11px] text-muted-foreground">
													{primaryFromExisting ? (
														<>
															Primary technician remains{" "}
															<strong>{primaryTechnicianLabel}</strong>. Select more technicians to
															collaborate on this request.
														</>
													) : (
														<>No primary technician is currently assigned. You can still select technicians below to collaborate on this request.</>
													)}
												</span>
											</div>
										</div>
										<div className="max-h-40 overflow-y-auto space-y-1 pr-1">
											{techLoading ? (
												<div className="text-xs text-muted-foreground">Loading technicians...</div>
											) : technicians.length === 0 ? (
												<div className="text-xs text-muted-foreground">No technicians found.</div>
											) : (
												technicians.map((tech) => {
													const id = tech.id;
													const label = tech.displayName || tech.email || tech.id;
													const isPrimary = !!primaryFromExisting && id === primaryFromExisting;
													const checked = isPrimary || additionalTechnicianIds.includes(id);
													return (
														<label
															key={id}
															className="flex items-center gap-2 text-xs cursor-pointer select-none"
														>
															<Checkbox
																checked={checked}
																disabled={saving || isPrimary}
																onCheckedChange={(value) => {
																	if (isPrimary) return;
																	setAdditionalTechnicianIds((prev) => {
																		if (value) {
																			if (prev.includes(id)) return prev;
																			return [...prev, id];
																		}
																		return prev.filter((tid) => tid !== id);
																	});
																}}
															/>
															<span className={isPrimary ? "font-semibold" : ""}>
																{label}
																{isPrimary ? " (Primary)" : ""}
															</span>
														</label>
													);
												})
											)}
										</div>
										{additionalTechnicianIds.length > 0 && (
											<div className="flex flex-wrap gap-1 pt-1">
												{additionalTechnicianIds.map((id) => {
													const tech = technicians.find((t) => t.id === id);
													const label = tech?.displayName || tech?.email || id;
													return (
														<Badge key={id} variant="outline" className="text-[11px]">
															{label}
														</Badge>
													);
												})}
											</div>
										)}
									</div>
								);
							})()
						)}

						{/* Details section */}
						{request && section === "details" && request.requestType === ServiceRequestType.PREVENTIVE_MAINTENANCE && (
							<div className="space-y-4">
								<PreventiveMaintenanceForm
									equipment={request.equipment}
									value={pmDetails}
									onChange={setPmDetails}
									editable={canEditDetails}
								/>
							</div>
						)}
						{request && section === "details" && request.requestType !== ServiceRequestType.PREVENTIVE_MAINTENANCE && (
							<div className="space-y-4">
								<div className="flex flex-col gap-2">
									<Label>{t("serviceRequest.problemDescription")}</Label>
									<Textarea value={form.problemDescription} onChange={(e) => setForm((s) => ({ ...s, problemDescription: e.target.value }))} placeholder={t("serviceRequest.problemPlaceholder")} className="min-h-24" disabled={!canEditDetails} />
								</div>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div className="flex flex-col gap-2">
										<Label>{t("serviceRequest.technicalAssessment")}</Label>
										<Textarea value={form.technicalAssessment} onChange={(e) => setForm((s) => ({ ...s, technicalAssessment: e.target.value }))} placeholder={t("serviceRequest.assessmentPlaceholder")} className="min-h-20" disabled={!canEditDetails} />
									</div>
									<div className="flex flex-col gap-2">
										<Label>{t("serviceRequest.recommendation")}</Label>
										<Textarea value={form.recommendation} onChange={(e) => setForm((s) => ({ ...s, recommendation: e.target.value }))} placeholder={t("serviceRequest.recommendationPlaceholder")} className="min-h-20" disabled={!canEditDetails} />
									</div>
								</div>

								<div className="flex items-center gap-2 p-4 bg-muted rounded-md">
									<Switch id="spare-parts-needed" checked={sparePartsNeeded} onCheckedChange={(checked) => {
										setSparePartsNeeded(checked);
										if (!checked) {
											setParts([]);
											setDraft({ sparePartId: "", sparePartName: "", part: "", description: "", quantity: 1, cost: 0, source: "", manufacturer: "", serialNumber: "" });
											setSparePartChanged(false);
										}
									}} disabled={!canEditDetails} />
									<label htmlFor="spare-parts-needed" className="text-sm font-medium cursor-pointer">Spare Parts Needed</label>
								</div>

								{sparePartsNeeded && (
									<div className="space-y-4 p-4 border rounded-lg bg-muted/30">
										<div className="flex items-center justify-between">
											<Label className="text-base font-medium">{t("serviceRequest.spareParts.title")}</Label>
											<div className="text-sm text-muted-foreground">{t("serviceRequest.spareParts.total", { amount: totalCost.toFixed(2) })}</div>
										</div>
										<div className="grid grid-cols-1 md:grid-cols-4 gap-3">
											<div className="md:col-span-2 flex flex-col gap-2">
												<Label htmlFor="spare-part" className="text-sm font-medium">{t("serviceRequest.spareParts.part")}</Label>
												<Select value={draft.sparePartId || ""} onValueChange={(value) => {
													if (value === "__custom__") {
														setDraft((d) => ({ ...d, sparePartId: "", sparePartName: "", part: "", manufacturer: "", serialNumber: "", source: "" }));
														setOriginalSparePartValues({});
														setSparePartChanged(false);
													} else {
														const selected = availableSpareParts.find(sp => sp.id === value);
														if (selected) {
															const values = { manufacturer: selected.manufacturer || "", serialNumber: selected.serialNumber || "", source: selected.supplier || "" };
															setDraft((d) => ({ ...d, sparePartId: selected.id, sparePartName: selected.name, part: selected.name, ...values }));
															setOriginalSparePartValues(values);
															setSparePartChanged(false);
														}
													}
												}} disabled={sparePartsLoading || !canEditDetails}>
												<SelectTrigger>
													<SelectValue placeholder={sparePartsLoading ? "Loading spare parts..." : "Select spare part"} />
												</SelectTrigger>
												<SelectContent>
													<div className="p-2">
														<Input value={sparePartFilter} onChange={(e) => setSparePartFilter(e.target.value)} placeholder="Type to filter spare parts..." className="h-8" onClick={(e) => e.stopPropagation()} disabled={!canEditDetails} />
													</div>
													<SelectItem value="__custom__">Custom (not from inventory)</SelectItem>
													{availableSpareParts
														.filter((sp) => {
															const q = sparePartFilter.trim().toLowerCase();
															if (!q) return true;
															const name = sp.name?.toLowerCase() || "";
															const serial = sp.serialNumber?.toLowerCase() || "";
															return name.includes(q) || serial.includes(q);
														})
														.map((sp) => (
															<SelectItem key={sp.id} value={sp.id}>{sp.name} {sp.serialNumber ? `(${sp.serialNumber})` : ""} - Qty: {sp.quantity}</SelectItem>
														))}
												</SelectContent>
											</Select>
										</div>
										<div className="flex flex-col gap-2">
											<Label htmlFor="spare-quantity" className="text-sm font-medium">{t("serviceRequest.spareParts.quantity")}</Label>
											<Input id="spare-quantity" type="number" min={1} placeholder={t("serviceRequest.spareParts.quantity")} value={draft.quantity} onChange={(e) => setDraft((d) => ({ ...d, quantity: Number(e.target.value || 0) }))} />
										</div>
										<div className="flex flex-col gap-2">
											<Label htmlFor="spare-cost" className="text-sm font-medium">{t("serviceRequest.spareParts.cost")}</Label>
											<Input id="spare-cost" type="number" min={0} step="0.01" placeholder={t("serviceRequest.spareParts.cost")} value={draft.cost} onChange={(e) => setDraft((d) => ({ ...d, cost: Number(e.target.value || 0) }))} />
										</div>
									</div>

									<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
										<div className="flex flex-col gap-2">
											<Label className="text-sm font-medium">{t("serviceRequest.spareParts.description")}</Label>
											<Textarea value={draft.description} onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))} className="min-h-20 resize-y whitespace-pre-wrap" placeholder={t("serviceRequest.spareParts.description")} />
										</div>
										<div className="flex flex-col gap-2">
											<Label className="text-sm font-medium">{t("serviceRequest.spareParts.source")} {draft.sparePartId && (draft.source !== originalSparePartValues.source) ? (<span className="ml-1 text-xs text-amber-600">*</span>) : null}</Label>
											<Textarea value={draft.source} onChange={(e) => {
												setDraft((d) => ({ ...d, source: e.target.value }));
												if (draft.sparePartId) {
													setSparePartChanged(
														draft.manufacturer !== originalSparePartValues.manufacturer ||
														draft.serialNumber !== originalSparePartValues.serialNumber ||
														e.target.value !== originalSparePartValues.source
													);
												}
											}} className="min-h-20 resize-y whitespace-pre-wrap" placeholder={t("serviceRequest.spareParts.source")} />
										</div>
									</div>

									<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
										<div className="flex flex-col gap-2">
											<Label className="text-sm font-medium">Manufacturer {draft.sparePartId && (draft.manufacturer !== originalSparePartValues.manufacturer) ? (<span className="ml-1 text-xs text-amber-600">*</span>) : null}</Label>
											<Input value={draft.manufacturer} onChange={(e) => {
												setDraft((d) => ({ ...d, manufacturer: e.target.value }));
												if (draft.sparePartId) {
													setSparePartChanged(
														e.target.value !== originalSparePartValues.manufacturer ||
														draft.serialNumber !== originalSparePartValues.serialNumber ||
														draft.source !== originalSparePartValues.source
													);
												}
											}} placeholder="Enter manufacturer name" />
										</div>
										<div className="flex flex-col gap-2">
											<Label className="text-sm font-medium">Serial Number {draft.sparePartId && (draft.serialNumber !== originalSparePartValues.serialNumber) ? (<span className="ml-1 text-xs text-amber-600">*</span>) : null}</Label>
											<Input value={draft.serialNumber} onChange={(e) => {
												setDraft((d) => ({ ...d, serialNumber: e.target.value }));
												if (draft.sparePartId) {
													setSparePartChanged(
														draft.manufacturer !== originalSparePartValues.manufacturer ||
														e.target.value !== originalSparePartValues.serialNumber ||
														draft.source !== originalSparePartValues.source
													);
												}
											}} placeholder="Enter serial number" />
										</div>
									</div>

									{!draft.sparePartId && (
										<div className="flex flex-col gap-2">
											<Label htmlFor="custom-part-name" className="text-sm font-medium">Custom Part Name</Label>
											<Input id="custom-part-name" placeholder="Enter custom part name" value={draft.part} onChange={(e) => setDraft((d) => ({ ...d, part: e.target.value }))} />
										</div>
									)}

									{draft.sparePartId && sparePartChanged && (
										<div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-md">
											<span className="text-xs text-amber-900 dark:text-amber-100 flex-1">You&apos;ve modified spare part details. Update the inventory?</span>
											<Button type="button" size="sm" variant="default" disabled={updatingSparePart} onClick={async () => {
												if (!draft.sparePartId) return;
												setUpdatingSparePart(true);
												try {
													const response = await fetch(`/api/spare-parts/${draft.sparePartId}`, {
														method: 'PATCH',
														headers: { 'Content-Type': 'application/json' },
														body: JSON.stringify({ name: draft.part, manufacturer: draft.manufacturer, serialNumber: draft.serialNumber, supplier: draft.source }),
													});
													if (response.ok) {
														toast(t("toast.success"), { description: "Spare part updated in inventory" });
														setOriginalSparePartValues({ manufacturer: draft.manufacturer, serialNumber: draft.serialNumber, source: draft.source });
														setSparePartChanged(false);
														const res = await fetch(`/api/spare-parts?all=true`);
														if (res.ok) {
															const j = await res.json();
															if (Array.isArray(j.data)) setAvailableSpareParts(j.data);
														}
													} else {
														throw new Error('Failed to update spare part');
													}
												} catch {
													toast(t("toast.error"), { description: "Failed to update spare part in inventory" });
												} finally {
													setUpdatingSparePart(false);
												}
											}}>
											{updatingSparePart ? (<span className="inline-flex items-center"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Updating...</span>) : ("Update Inventory")}
											</Button>
										</div>
									)}

									<div className="flex justify-end">
										<Button type="button" onClick={() => {
											if (!draft.part || draft.quantity <= 0) {
												toast(t("toast.error"), { description: t("serviceRequest.spareParts.validation") });
												return;
											}
											setParts((prev) => [...prev, { ...draft }]);
											setDraft({ sparePartId: "", sparePartName: "", part: "", description: "", quantity: 1, cost: 0, source: "", manufacturer: "", serialNumber: "" });
											setSparePartFilter("");
										}}>
											{t("serviceRequest.spareParts.add")}
										</Button>
									</div>

									<div className="space-y-2 max-h-48 overflow-y-auto">
										{parts.length === 0 ? (
											<div className="text-sm text-muted-foreground">{t("serviceRequest.spareParts.empty")}</div>
										) : (
											parts.map((p, idx) => (
												<div key={idx} className="rounded border p-2">
													<div className="flex items-center justify-between">
														<div className="text-sm">
															<span className="font-medium">{p.part}</span>
															{p.sparePartId ? (<Badge variant="outline" className="ml-2 text-xs">From Inventory</Badge>) : null}
															<span className="ml-2 text-muted-foreground">x{p.quantity}</span>
															{p.cost ? (<span className="ml-2 text-muted-foreground">{(p.cost * p.quantity).toFixed(2)}</span>) : null}
														</div>
														<Button size="sm" variant="outline" onClick={() => setParts((prev) => prev.filter((_, i) => i !== idx))}>{t("serviceRequest.spareParts.remove")}</Button>
													</div>
													{p.description ? (<div className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap break-words" title={p.description}>{p.description}</div>) : null}
													{p.source ? (<div className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap break-words" title={p.source}>{p.source}</div>) : null}
												</div>
											))
										)}
									</div>
								</div>
								)}
							</div>
						)}
					</div>
				)}

				<div className="flex items-center justify-end gap-2 pt-6 border-t">
					<Button
						variant="outline"
						onClick={() => router.push("/service-requests")}
						disabled={saving || isBlockingLoading}
					>
						{t("form.cancel")}
					</Button>
					{canEditDetails && (
						<Button
							onClick={handleSave}
							disabled={!isValid || saving || isBlockingLoading}
							className="gap-2"
						>
							{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
							{t("form.save")}
						</Button>
					)}
				</div>
			</main>
			<Dialog open={selfAssignOpen} onOpenChange={setSelfAssignOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Assign yourself to this service request?</DialogTitle>
					</DialogHeader>
					<div className="text-sm text-muted-foreground">
						This request is unassigned. You can self-assign to take ownership.
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setSelfAssignOpen(false)}>Not now</Button>
						<Button onClick={async () => {
							try {
								if (!request || !profile?.id) return;
								await updateDetails(request.id, { assignedTechnicianId: profile.id });
								setSelfAssignOpen(false);
								// refresh local state
								setRequest((r) =>
									r
										? ({
												...r,
												assignedTechnicianId: profile.id,
												technician: {
													...(r.technician || {}),
													id: profile.id,
													displayName: profile.displayName,
													email: profile.email,
												} as JServiceRequest["technician"],
										  })
										: r,
								);
								// reflect assigned technician in PM details (for display/print only)
								setPmDetails((prev) => ({
									...prev,
									technicianName: profile.displayName || profile.email || prev.technicianName || "",
								}));
								toast(t("toast.success"), { description: "You are now assigned to this request" });
							} catch {
								toast(t("toast.error"), { description: "Failed to self-assign" });
							}
						}}>Assign me</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}

