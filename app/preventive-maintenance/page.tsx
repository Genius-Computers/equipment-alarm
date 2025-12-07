"use client";

import { useEffect, useMemo, useState } from "react";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useLanguage } from "@/hooks/useLanguage";
import { useSelfProfile } from "@/hooks/useSelfProfile";
import { ClipboardList, Loader2, MapPin, Search, Wrench } from "lucide-react";
import type { Location } from "@/lib/types/location";

type EquipmentItem = {
	id: string;
	name: string;
	partNumber: string | null;
	model: string | null;
	manufacturer: string | null;
	serialNumber: string | null;
	locationId: string | null;
	locationName: string | null;
	subLocation: string | null;
	campus: string | null;
};

type EquipmentApiItem = {
	id: string;
	name: string;
	partNumber?: string | null;
	model?: string | null;
	manufacturer?: string | null;
	serialNumber?: string | null;
	locationId?: string | null;
	locationName?: string | null;
	subLocation?: string | null;
	campus?: string | null;
};

type Step = "locations" | "equipment";

export default function PreventiveMaintenanceLocationPage() {
	const { t } = useLanguage();
	const { profile, loading: profileLoading } = useSelfProfile();
	const role = profile?.role || null;

	const [step, setStep] = useState<Step>("locations");

	const [locations, setLocations] = useState<Location[]>([]);
	const [locationsLoading, setLocationsLoading] = useState(true);
	const [locationsSearch, setLocationsSearch] = useState("");

	const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);

	const [equipment, setEquipment] = useState<EquipmentItem[]>([]);
	const [equipmentLoading, setEquipmentLoading] = useState(false);
	const [equipmentSearch, setEquipmentSearch] = useState("");
	const [selectedEquipment, setSelectedEquipment] = useState<Set<string>>(new Set());
	const [creating, setCreating] = useState(false);
	const [previewLoading, setPreviewLoading] = useState(false);
	const [ticketPreview, setTicketPreview] = useState<{
		countToCreate: number;
		firstTicketId: string | null;
		lastTicketId: string | null;
	} | null>(null);

	const isManager = role === "admin" || role === "admin_x" || role === "supervisor";
	const canCreateTickets = isManager;

	// Load all primary locations
	useEffect(() => {
		if (profileLoading) return;
		if (!role) return;

		// End users are not allowed to see PM module
		if (role === "end_user") {
			setLocationsLoading(false);
			return;
		}

		const load = async () => {
			try {
				setLocationsLoading(true);
				const res = await fetch("/api/locations", { cache: "no-store" });
				if (!res.ok) {
					const j = await res.json().catch(() => ({}));
					const msg = typeof j?.error === "string" ? j.error : "Failed to load locations";
					throw new Error(msg);
				}
				const j = await res.json();
				const data: Location[] = Array.isArray(j?.data) ? j.data : [];
				setLocations(data);
			} catch (err) {
				console.error(err);
				toast.error(err instanceof Error ? err.message : "Failed to load locations");
			} finally {
				setLocationsLoading(false);
			}
		};

		void load();
	}, [profileLoading, role]);

	const filteredLocations = useMemo(() => {
		if (!locationsSearch.trim()) return locations;
		const term = locationsSearch.toLowerCase();
		return locations.filter((loc) => {
			return (
				loc.name.toLowerCase().includes(term) ||
				(loc.campus || "").toLowerCase().includes(term) ||
				(loc.nameAr || "").toLowerCase().includes(term)
			);
		});
	}, [locations, locationsSearch]);

	const loadEquipmentForLocation = async (location: Location) => {
		try {
			setEquipmentLoading(true);
			setSelectedEquipment(new Set());
			setEquipment([]);
			setEquipmentSearch("");

			const params = new URLSearchParams({
				page: "1",
				pageSize: "500",
				status: "all",
				locationId: location.id,
			});
			const res = await fetch(`/api/equipment?${params.toString()}`, { cache: "no-store" });
			if (!res.ok) {
				const j = await res.json().catch(() => ({}));
				const msg = typeof j?.error === "string" ? j.error : "Failed to load equipment for location";
				throw new Error(msg);
			}
			const j = await res.json();
			const data: EquipmentApiItem[] = Array.isArray(j?.data) ? j.data : [];
			const items: EquipmentItem[] = data.map((e) => ({
				id: e.id,
				name: e.name,
				partNumber: e.partNumber ?? null,
				model: e.model ?? null,
				manufacturer: e.manufacturer ?? null,
				serialNumber: e.serialNumber ?? null,
				locationId: e.locationId ?? null,
				locationName: e.locationName ?? null,
				subLocation: e.subLocation ?? null,
				campus: e.campus ?? null,
			}));
			setEquipment(items);
			// Select all by default
			setSelectedEquipment(new Set(items.map((e) => e.id)));
		} catch (err) {
			console.error(err);
			toast.error(err instanceof Error ? err.message : "Failed to load equipment for location");
		} finally {
			setEquipmentLoading(false);
		}
	};

	const handleSelectLocation = async (location: Location) => {
		setSelectedLocation(location);
		setStep("equipment");
		await loadEquipmentForLocation(location);
	};

	const filteredEquipment = useMemo(() => {
		if (!equipmentSearch.trim()) return equipment;
		const term = equipmentSearch.toLowerCase();
		return equipment.filter((eq) => {
			return (
				eq.name.toLowerCase().includes(term) ||
				(eq.partNumber || "").toLowerCase().includes(term) ||
				(eq.model || "").toLowerCase().includes(term) ||
				(eq.manufacturer || "").toLowerCase().includes(term) ||
				(eq.serialNumber || "").toLowerCase().includes(term) ||
				(eq.subLocation || "").toLowerCase().includes(term)
			);
		});
	}, [equipment, equipmentSearch]);

	const toggleEquipment = (id: string) => {
		setSelectedEquipment((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	};

	const handleSelectNone = () => {
		setSelectedEquipment(new Set());
	};

	const handleSelectAllEquipment = () => {
		setSelectedEquipment(new Set(filteredEquipment.map((e) => e.id)));
	};

	// Ticket range preview for current selection
	useEffect(() => {
		if (step !== "equipment" || !selectedLocation) {
			setTicketPreview(null);
			return;
		}
		if (!selectedEquipment.size) {
			setTicketPreview(null);
			return;
		}

		let cancelled = false;

		const runPreview = async () => {
			try {
				setPreviewLoading(true);
				const res = await fetch("/api/preventive-maintenance/sync", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						equipmentIds: Array.from(selectedEquipment),
						preview: true,
					}),
				});
				const j = await res.json().catch(() => ({}));
				if (!res.ok) {
					if (!cancelled) {
						setTicketPreview(null);
					}
					return;
				}
				const p = j?.data?.preview as
					| { countToCreate: number; firstTicketId: string | null; lastTicketId: string | null }
					| undefined;
				if (!cancelled) {
					setTicketPreview(
						p && typeof p.countToCreate === "number"
							? {
									countToCreate: p.countToCreate,
									firstTicketId: p.firstTicketId ?? null,
									lastTicketId: p.lastTicketId ?? null,
							  }
							: null,
					);
				}
			} catch (err) {
				console.error("Failed to preview PM tickets", err);
				if (!cancelled) {
					setTicketPreview(null);
				}
			} finally {
				if (!cancelled) {
					setPreviewLoading(false);
				}
			}
		};

		void runPreview();

		return () => {
			cancelled = true;
		};
	}, [step, selectedLocation, selectedEquipment]);

	const handleCreateTickets = async () => {
		if (!canCreateTickets) {
			toast.error("Only supervisors and admins can create preventive maintenance tickets");
			return;
		}
		if (!selectedEquipment.size) {
			toast.error("Please select at least one equipment item");
			return;
		}
		try {
			setCreating(true);
			const res = await fetch("/api/preventive-maintenance/sync", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ equipmentIds: Array.from(selectedEquipment) }),
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
							<div className="text-sm text-muted-foreground">
								You are not authorized to view preventive maintenance overview.
							</div>
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
								<p className="text-muted-foreground">
									Create preventive maintenance tickets in batches by primary location.
								</p>
							</div>
						</div>
						{step === "equipment" && selectedLocation ? (
							<div className="flex gap-2">
								<Button
									variant="outline"
									onClick={() => {
										setStep("locations");
										setSelectedLocation(null);
										setEquipment([]);
										setSelectedEquipment(new Set());
									}}
								>
									Back to locations
								</Button>
								<Button
									onClick={handleCreateTickets}
									disabled={creating || selectedEquipment.size === 0 || !canCreateTickets}
									className="gap-2"
								>
									{creating ? (
										<Loader2 className="h-4 w-4 animate-spin" />
									) : (
										<ClipboardList className="h-4 w-4" />
									)}
									Create ticket{selectedEquipment.size === 1 ? "" : "s"}
								</Button>
							</div>
						) : null}
					</div>

					{step === "locations" && (
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center justify-between">
									<span>Primary locations</span>
									<span className="text-sm text-muted-foreground">
										{locationsLoading
											? "Loading..."
											: `${filteredLocations.length} location${
													filteredLocations.length === 1 ? "" : "s"
											  }`}
									</span>
								</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="mb-4">
									<div className="relative max-w-md">
										<Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
										<Input
											placeholder="Search locations..."
											value={locationsSearch}
											onChange={(e) => setLocationsSearch(e.target.value)}
											className="pl-10"
										/>
									</div>
								</div>

								{locationsLoading ? (
									<div className="flex items-center justify-center py-8 text-muted-foreground">
										<Loader2 className="h-5 w-5 animate-spin mr-2" />
										<span>Loading locations...</span>
									</div>
								) : filteredLocations.length === 0 ? (
									<div className="py-8 text-center text-muted-foreground">
										<p>No locations found.</p>
									</div>
								) : (
									<div className="grid gap-3 md:grid-cols-2">
										{filteredLocations.map((loc) => (
											<button
												key={loc.id}
												type="button"
												onClick={() => void handleSelectLocation(loc)}
												className="text-left border rounded-lg p-4 hover:border-primary/70 hover:bg-primary/5 transition-colors"
											>
												<div className="flex items-center justify-between gap-2">
													<div>
														<div className="font-semibold">{loc.name}</div>
														{loc.nameAr && (
															<div className="text-xs text-muted-foreground">{loc.nameAr}</div>
														)}
													</div>
													{loc.campus && (
														<Badge variant="outline" className="text-xs">
															{loc.campus}
														</Badge>
													)}
												</div>
											</button>
										))}
									</div>
								)}
							</CardContent>
						</Card>
					)}

					{step === "equipment" && selectedLocation && (
						<div className="space-y-4">
							<Card>
								<CardHeader>
									<CardTitle className="flex items-center justify-between">
										<div className="space-y-1">
											<div className="text-sm text-muted-foreground uppercase tracking-wide">
												Selected location
											</div>
											<div className="flex items-center gap-2">
												<span className="font-semibold">{selectedLocation.name}</span>
												{selectedLocation.campus && (
													<Badge variant="outline" className="text-xs">
														{selectedLocation.campus}
													</Badge>
												)}
											</div>
											{selectedLocation.nameAr && (
												<div className="text-xs text-muted-foreground">
													{selectedLocation.nameAr}
												</div>
											)}
										</div>
										<div className="text-sm text-muted-foreground text-right space-y-1">
											<div>Equipment: {equipment.length}</div>
											<div>Selected: {selectedEquipment.size}</div>
											{ticketPreview && ticketPreview.countToCreate > 0 && (
												<div className="mt-1">
													<div className="text-xs uppercase tracking-wide text-muted-foreground">
														Ticket range (preview)
													</div>
													<div className="mt-0.5 inline-flex items-center rounded-md border border-primary/50 bg-primary/5 px-2 py-1 text-sm font-mono text-primary">
														<span>
															{ticketPreview.firstTicketId}{" "}
															{ticketPreview.lastTicketId &&
															ticketPreview.lastTicketId !== ticketPreview.firstTicketId
																? `to ${ticketPreview.lastTicketId}`
																: ""}
														</span>
													</div>
												</div>
											)}
											{ticketPreview && ticketPreview.countToCreate === 0 && (
												<div className="mt-1 text-sm text-yellow-700">
													All selected equipment already have open PM tickets.
												</div>
											)}
											{previewLoading && (
												<div className="mt-1 text-[11px] text-muted-foreground">
													Calculating ticket range…
												</div>
											)}
										</div>
									</CardTitle>
								</CardHeader>
								<CardContent>
									<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
										<div className="relative w-full md:max-w-md">
											<Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
											<Input
												placeholder="Search equipment or sublocation..."
												value={equipmentSearch}
												onChange={(e) => setEquipmentSearch(e.target.value)}
												className="pl-10"
											/>
										</div>
										<div className="flex flex-wrap gap-2">
											<Button
												variant="outline"
												size="sm"
												onClick={handleSelectAllEquipment}
												disabled={equipment.length === 0}
											>
												Select all
											</Button>
											<Button
												variant="outline"
												size="sm"
												onClick={handleSelectNone}
												disabled={equipment.length === 0}
											>
												Select none
											</Button>
										</div>
									</div>
								</CardContent>
							</Card>

							<Card>
								<CardHeader>
									<CardTitle className="flex items-center justify-between">
										<span>
											Equipment in location{" "}
											<span className="text-sm text-muted-foreground">
												({filteredEquipment.length} item
												{filteredEquipment.length === 1 ? "" : "s"})
											</span>
										</span>
										<span className="text-sm text-muted-foreground">
											Selected: {selectedEquipment.size}
										</span>
									</CardTitle>
								</CardHeader>
								<CardContent>
									{equipmentLoading ? (
										<div className="flex items-center justify-center py-8 text-muted-foreground">
											<Loader2 className="h-5 w-5 animate-spin mr-2" />
											<span>Loading equipment...</span>
										</div>
									) : filteredEquipment.length === 0 ? (
										<div className="py-8 text-center text-muted-foreground">
											<p>No equipment found for this location.</p>
										</div>
									) : (
										<div className="grid gap-3">
											{filteredEquipment.map((eq) => {
												const isSelected = selectedEquipment.has(eq.id);
												return (
													<div
														key={eq.id}
														className={`flex items-start gap-4 p-4 border rounded-lg cursor-pointer transition-colors ${
															isSelected
																? "border-primary bg-primary/5"
																: "border-border hover:border-primary/50"
														}`}
														onClick={() => toggleEquipment(eq.id)}
													>
														<Checkbox
															checked={isSelected}
															onCheckedChange={() => toggleEquipment(eq.id)}
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
																			{eq.subLocation || eq.locationName || "-"}
																		</span>
																		{eq.campus && (
																			<span className="text-xs">{eq.campus}</span>
																		)}
																	</div>
																</div>
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
					)}
				</div>
			</div>
		</div>
	);
}


