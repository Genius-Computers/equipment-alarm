"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useLanguage } from "@/hooks/useLanguage";
import { useSelfProfile } from "@/hooks/useSelfProfile";
import { formatSaudiDate } from "@/lib/utils";
import { ClipboardList, Loader2, MapPin, RefreshCw, Search, Wrench } from "lucide-react";

type OverdueEquipment = {
	id: string;
	name: string;
	partNumber: string | null;
	model: string | null;
	manufacturer: string | null;
	serialNumber: string | null;
	location: string | null;
	subLocation: string | null;
	locationId: string | null;
	locationName: string | null;
	campus: string | null;
	lastMaintenance: string | null;
	maintenanceInterval: string | null;
	nextMaintenance: string;
	overdueDays: number;
};

export default function PreventiveMaintenanceOverduePage() {
	const router = useRouter();
	const { t } = useLanguage();
	const { profile, loading: profileLoading } = useSelfProfile();
	const role = profile?.role || null;

	const [loading, setLoading] = useState(true);
	const [creating, setCreating] = useState(false);
	const [items, setItems] = useState<OverdueEquipment[]>([]);
	const [search, setSearch] = useState("");
	const [selected, setSelected] = useState<Set<string>>(new Set());

	const isManager = role === "admin" || role === "admin_x" || role === "supervisor";
	const canCreateTickets = isManager;

	const loadOverdue = useCallback(async () => {
		try {
			setLoading(true);
			const res = await fetch("/api/preventive-maintenance/sync", { cache: "no-store" });
			if (!res.ok) {
				const j = await res.json().catch(() => ({}));
				const msg = typeof j?.error === "string" ? j.error : "Failed to load overdue equipment";
				throw new Error(msg);
			}
			const j = await res.json();
			const data: OverdueEquipment[] = Array.isArray(j?.data) ? j.data : [];
			setItems(data);
			setSelected(new Set());
		} catch (err) {
			console.error(err);
			toast.error(err instanceof Error ? err.message : "Failed to load overdue equipment");
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		if (profileLoading) return;
		// End users are not allowed to see PM module
		if (role === "end_user") {
			setLoading(false);
			return;
		}
		void loadOverdue();
	}, [profileLoading, role, loadOverdue]);

	const filtered = useMemo(() => {
		if (!search.trim()) return items;
		const term = search.toLowerCase();
		return items.filter((eq) => {
			return (
				eq.name.toLowerCase().includes(term) ||
				(eq.partNumber || "").toLowerCase().includes(term) ||
				(eq.model || "").toLowerCase().includes(term) ||
				(eq.manufacturer || "").toLowerCase().includes(term) ||
				(eq.serialNumber || "").toLowerCase().includes(term) ||
				(eq.locationName || "").toLowerCase().includes(term) ||
				(eq.campus || "").toLowerCase().includes(term) ||
				(eq.subLocation || "").toLowerCase().includes(term)
			);
		});
	}, [items, search]);

	const toggleSelect = (id: string) => {
		setSelected((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	};

	const handleSelectAll = () => {
		setSelected((prev) => {
			if (prev.size === filtered.length) return new Set();
			return new Set(filtered.map((eq) => eq.id));
		});
	};

	const handleCreateTickets = async () => {
		if (!canCreateTickets) {
			toast.error("Only supervisors and admins can create preventive maintenance tickets");
			return;
		}
		if (!selected.size) {
			toast.error("Please select at least one equipment item");
			return;
		}
		try {
			setCreating(true);
			const res = await fetch("/api/preventive-maintenance/sync", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ equipmentIds: Array.from(selected) }),
			});
			if (!res.ok) {
				const j = await res.json().catch(() => ({}));
				const msg = typeof j?.error === "string" ? j.error : "Failed to create preventive maintenance tickets";
				throw new Error(msg);
			}
			const j = await res.json();
			const created = j?.data?.created ?? 0;
			const skippedExisting = j?.data?.skippedExisting ?? 0;
			if (created > 0) {
				toast.success(
					`Created ${created} preventive maintenance ticket${created === 1 ? "" : "s"}${
						skippedExisting ? `, skipped ${skippedExisting} with existing PM` : ""
					}`,
				);
			} else if (skippedExisting) {
				toast.info(`Skipped ${skippedExisting} equipment with existing preventive maintenance tickets`);
			} else {
				toast.info("No tickets were created");
			}
			await loadOverdue();
		} catch (err) {
			console.error(err);
			toast.error(err instanceof Error ? err.message : "Failed to create preventive maintenance tickets");
		} finally {
			setCreating(false);
		}
	};

	// While profile is loading, show a basic spinner
	if (profileLoading) {
		return (
			<div className="min-h-screen bg-background">
				<Header />
				<div className="flex items-center justify-center py-12">
					<Loader2 className="h-8 w-8 animate-spin text-primary" />
				</div>
			</div>
		);
	}

	// Not authorized (end users)
	if (role === "end_user") {
		return (
			<div className="min-h-screen bg-background">
				<Header />
				<div className="container mx-auto px-4 py-8">
					<Card>
						<CardHeader>
							<CardTitle>Preventive Maintenance</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="text-sm text-muted-foreground">You are not authorized to view preventive maintenance overview.</div>
						</CardContent>
					</Card>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-background">
			<Header />
			<div className="container mx-auto px-4 py-8">
				<div className="max-w-6xl mx-auto">
					{/* Header */}
					<div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
						<div className="flex items-center gap-3">
							<Wrench className="h-8 w-8 text-primary" />
							<div>
								<h1 className="text-3xl font-bold">Preventive Maintenance</h1>
								<p className="text-muted-foreground">Overdue equipment awaiting ticket creation</p>
							</div>
						</div>
						<div className="flex gap-2">
							<Button variant="outline" onClick={loadOverdue} disabled={loading}>
								<RefreshCw className="mr-2 h-4 w-4" />
								Refresh list
							</Button>
							<Button
								onClick={handleCreateTickets}
								disabled={creating || selected.size === 0 || !canCreateTickets}
								className="gap-2"
							>
								{creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardList className="h-4 w-4" />}
								Create ticket{selected.size === 1 ? "" : "s"}
							</Button>
						</div>
					</div>

					{/* Filters */}
					<Card className="mb-6">
						<CardHeader>
							<CardTitle>Filter equipment</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div className="relative">
									<Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
									<Input
										placeholder="Search equipment..."
										value={search}
										onChange={(e) => setSearch(e.target.value)}
										className="pl-10"
									/>
								</div>
								<div className="flex items-center md:justify-end">
									<Button
										variant="outline"
										size="sm"
										onClick={handleSelectAll}
										disabled={filtered.length === 0}
									>
										{selected.size === filtered.length && filtered.length > 0
											? "Deselect all"
											: "Select all"}
									</Button>
								</div>
							</div>
						</CardContent>
					</Card>

					{/* Overdue equipment list */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center justify-between">
								<span>
									Overdue equipment{" "}
									<span className="text-sm text-muted-foreground">
										({filtered.length} item{filtered.length === 1 ? "" : "s"})
									</span>
								</span>
								<span className="text-sm text-muted-foreground">
									Selected: {selected.size}
								</span>
							</CardTitle>
						</CardHeader>
						<CardContent>
							{loading ? (
								<div className="flex items-center justify-center py-8 text-muted-foreground">
									<Loader2 className="h-5 w-5 animate-spin mr-2" />
									<span>Loading overdue equipment...</span>
								</div>
							) : filtered.length === 0 ? (
								<div className="py-8 text-center text-muted-foreground">
									<p>No overdue equipment found without tickets.</p>
								</div>
							) : (
								<div className="grid gap-3">
									{filtered.map((eq) => {
										const isSelected = selected.has(eq.id);
										return (
											<div
												key={eq.id}
												className={`flex items-start gap-4 p-4 border rounded-lg cursor-pointer transition-colors ${
													isSelected
														? "border-primary bg-primary/5"
														: "border-border hover:border-primary/50"
												}`}
												onClick={() => toggleSelect(eq.id)}
											>
												<Checkbox
													checked={isSelected}
													onCheckedChange={() => toggleSelect(eq.id)}
													onClick={(e) => e.stopPropagation()}
												/>
												<div className="flex-1 space-y-1">
													<div className="flex flex-wrap items-center gap-2">
														<span className="font-semibold">{eq.name}</span>
														{eq.partNumber && (
															<Badge variant="secondary" className="uppercase">
																Tag: {eq.partNumber}
															</Badge>
														)}
														{eq.model && (
															<Badge variant="outline" className="capitalize">
																Model: {eq.model}
															</Badge>
														)}
													</div>
													<div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
														{eq.manufacturer && <span>Make: {eq.manufacturer}</span>}
														{eq.serialNumber && <span>Serial: {eq.serialNumber}</span>}
														<div className="flex items-center gap-1">
															<MapPin className="h-3 w-3" />
															<div className="flex flex-col">
																<span className="font-medium">
																	{eq.locationName || eq.subLocation || eq.location || "-"}
																</span>
																{eq.campus && (
																	<span className="text-xs">{eq.campus}</span>
																)}
																{eq.subLocation && (
																	<span className="text-xs">Room: {eq.subLocation}</span>
																)}
															</div>
														</div>
													</div>
													<div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
														<span>
															Last PM:{" "}
															{eq.lastMaintenance
																? formatSaudiDate(eq.lastMaintenance)
																: "Unknown"}
														</span>
														<span>
															Due date:{" "}
															{eq.nextMaintenance
																? formatSaudiDate(eq.nextMaintenance)
																: "Unknown"}
														</span>
														<span>
															Interval: {eq.maintenanceInterval || "Not set"}
														</span>
														<span className="font-semibold text-red-600">
															Overdue by {eq.overdueDays} day
															{eq.overdueDays === 1 ? "" : "s"}
														</span>
													</div>
												</div>
											</div>
										);
									})}
								</div>
							)}
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}

