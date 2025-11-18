"use client";

import { useMemo } from "react";
import type { Equipment } from "@/lib/types/equipment";
import type { PmDetails, PmQualitativeRow, PmQuantitativeRow } from "@/lib/types/preventive-maintenance";
import { deriveMaintenanceInfo, formatSaudiDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2 } from "lucide-react";

export interface PreventiveMaintenanceFormProps {
	equipment: Equipment;
	value: PmDetails;
	onChange: (next: PmDetails) => void;
	editable?: boolean;
}

function ensureIndex<T extends { index: number }>(rows: T[]): T[] {
	return rows.map((r, i) => ({ ...r, index: i + 1 }));
}

export default function PreventiveMaintenanceForm({ equipment, value, onChange, editable = true }: PreventiveMaintenanceFormProps) {
	const { nextMaintenance } = useMemo(
		() =>
			deriveMaintenanceInfo({
				lastMaintenance: equipment.lastMaintenance || undefined,
				maintenanceInterval: equipment.maintenanceInterval || undefined,
			}),
		[equipment.lastMaintenance, equipment.maintenanceInterval],
	);

	const addQualRow = () => {
		const next: PmQualitativeRow = { index: (value.qualitative?.length || 0) + 1, componentArea: "", inspectionCriteria: "", pass: null, comments: "" };
		onChange({ ...value, qualitative: ensureIndex([...(value.qualitative || []), next]) });
	};
	const removeQualRow = (idx: number) => {
		const next = (value.qualitative || []).filter((_, i) => i !== idx);
		onChange({ ...value, qualitative: ensureIndex(next) });
	};

	const addQuanRow = () => {
		const next: PmQuantitativeRow = { index: (value.quantitative?.length || 0) + 1, parameter: "", acceptableRange: "", measuredValue: "", pass: null };
		onChange({ ...value, quantitative: ensureIndex([...(value.quantitative || []), next]) });
	};
	const removeQuanRow = (idx: number) => {
		const next = (value.quantitative || []).filter((_, i) => i !== idx);
		onChange({ ...value, quantitative: ensureIndex(next) });
	};

	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle className="text-lg">Equipment Information</CardTitle>
				</CardHeader>
				<CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div className="flex flex-col gap-1">
						<Label>Equipment</Label>
						<Input value={equipment.name} disabled />
					</div>
					<div className="flex flex-col gap-1">
						<Label>Manufacturer</Label>
						<Input value={equipment.manufacturer || ""} disabled />
					</div>
					<div className="flex flex-col gap-1">
						<Label>Model</Label>
						<Input value={equipment.model || ""} disabled />
					</div>
					<div className="flex flex-col gap-1">
						<Label>Serial</Label>
						<Input value={equipment.serialNumber || ""} disabled />
					</div>
					<div className="flex flex-col gap-1">
						<Label>Location</Label>
						<Input value={equipment.location || ""} disabled />
					</div>
					<div className="flex flex-col gap-1">
						<Label>Sub-Location</Label>
						<Input value={equipment.subLocation || ""} disabled />
					</div>
					<div className="flex flex-col gap-1">
						<Label>Last PPM</Label>
						<Input value={formatSaudiDate(equipment.lastMaintenance || "")} disabled />
					</div>
					<div className="flex flex-col gap-1">
						<Label>Due PPM</Label>
						<Input value={formatSaudiDate(nextMaintenance)} disabled />
					</div>
					<div className="flex flex-col gap-1 md:col-span-2">
						<Label>Technician Name</Label>
						<Input
							value={value.technicianName || ""}
							disabled
							placeholder="Technician will be set when assigned"
						/>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="text-lg">Checklist / Qualitative</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					{/* Header row */}
					<div
						className="grid gap-2 font-medium text-sm"
						style={{ gridTemplateColumns: "3rem repeat(3, minmax(0, 1fr)) 6rem 3rem" }}
					>
						<div>#</div>
						<div>Component / Area</div>
						<div>Inspection Criteria</div>
						<div>Comments</div>
						<div>✔ / ✘</div>
						<div></div>
					</div>

					{/* Data rows */}
					{(value.qualitative || [{ index: 1, componentArea: "", inspectionCriteria: "", pass: null, comments: "" }]).map((row, i) => (
						<div
							key={i}
							className="grid gap-2 items-start"
							style={{ gridTemplateColumns: "3rem repeat(3, minmax(0, 1fr)) 6rem 3rem" }}
						>
							<div className="pt-2 text-sm w-8 text-center">{i + 1}</div>
							<div>
								<Input
									value={row.componentArea || ""}
									onChange={(e) => {
										const next = [...(value.qualitative || [])];
										if (!next[i]) next[i] = { index: i + 1, componentArea: "", inspectionCriteria: "", pass: null, comments: "" };
										next[i] = { ...next[i], componentArea: e.target.value };
										onChange({ ...value, qualitative: ensureIndex(next) });
									}}
									disabled={!editable}
								/>
							</div>
							<div>
								<Textarea
									value={row.inspectionCriteria || ""}
									onChange={(e) => {
										const next = [...(value.qualitative || [])];
										if (!next[i]) next[i] = {
											index: i + 1,
											componentArea: "",
											inspectionCriteria: "",
											pass: null,
											comments: "",
										};
										next[i] = { ...next[i], inspectionCriteria: e.target.value };
										onChange({ ...value, qualitative: ensureIndex(next) });
									}}
									disabled={!editable}
									className="min-h-10 h-10 resize-none"
								/>
							</div>
							<div>
								<Textarea
									value={row.comments || ""}
									onChange={(e) => {
										const next = [...(value.qualitative || [])];
										if (!next[i]) next[i] = {
											index: i + 1,
											componentArea: "",
											inspectionCriteria: "",
											pass: null,
											comments: "",
										};
										next[i] = { ...next[i], comments: e.target.value };
										onChange({ ...value, qualitative: ensureIndex(next) });
									}}
									disabled={!editable}
									className="min-h-10 h-10 resize-none"
								/>
							</div>
							<div className="flex items-center gap-4 justify-center pt-2">
								<label className="inline-flex items-center gap-1 text-sm">
									<input
										type="checkbox"
										checked={row.pass === true}
										onChange={() => {
											const next = [...(value.qualitative || [])];
											if (!next[i]) next[i] = { index: i + 1, componentArea: "", inspectionCriteria: "", pass: null, comments: "" };
											next[i] = { ...next[i], pass: row.pass === true ? null : true };
											onChange({ ...value, qualitative: ensureIndex(next) });
										}}
										disabled={!editable}
									/>
									<span>✔</span>
								</label>
								<label className="inline-flex items-center gap-1 text-sm">
									<input
										type="checkbox"
										checked={row.pass === false}
										onChange={() => {
											const next = [...(value.qualitative || [])];
											if (!next[i]) next[i] = { index: i + 1, componentArea: "", inspectionCriteria: "", pass: null, comments: "" };
											next[i] = { ...next[i], pass: row.pass === false ? null : false };
											onChange({ ...value, qualitative: ensureIndex(next) });
										}}
										disabled={!editable}
									/>
									<span>✘</span>
								</label>
							</div>
							<div className="flex items-center justify-center">
								{editable && (value.qualitative || []).length > 0 ? (
									<Button type="button" variant="ghost" size="icon" onClick={() => removeQualRow(i)} title="Remove row">
										<Trash2 className="h-4 w-4" />
									</Button>
								) : null}
							</div>
						</div>
					))}
					{editable ? (
						<div>
							<Button type="button" variant="outline" className="gap-2" onClick={addQualRow}>
								<Plus className="h-4 w-4" /> Add row
							</Button>
						</div>
					) : null}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="text-lg">Checklist / Quantitative</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					{/* Header row */}
					<div
						className="grid gap-2 font-medium text-sm"
						style={{ gridTemplateColumns: "3rem repeat(3, minmax(0, 1fr)) 8rem 3rem" }}
					>
						<div>#</div>
						<div>Parameter</div>
						<div>Acceptable Range</div>
						<div>Measured Value</div>
						<div>Pass / Fail</div>
						<div></div>
					</div>

					{/* Data rows */}
					{(value.quantitative || [{ index: 1, parameter: "", acceptableRange: "", measuredValue: "", pass: null }]).map(
						(row, i) => (
							<div
								key={i}
								className="grid gap-2 items-start"
								style={{ gridTemplateColumns: "3rem repeat(3, minmax(0, 1fr)) 8rem 3rem" }}
							>
								<div className="pt-2 text-sm w-8 text-center">{i + 1}</div>
								<div>
								<Input
									value={row.parameter || ""}
									onChange={(e) => {
										const next = [...(value.quantitative || [])];
										if (!next[i]) next[i] = { index: i + 1, parameter: "", acceptableRange: "", measuredValue: "", pass: null };
										next[i] = { ...next[i], parameter: e.target.value };
										onChange({ ...value, quantitative: ensureIndex(next) });
									}}
									disabled={!editable}
								/>
								</div>
								<div>
								<Input
									value={row.acceptableRange || ""}
									onChange={(e) => {
										const next = [...(value.quantitative || [])];
										if (!next[i]) next[i] = { index: i + 1, parameter: "", acceptableRange: "", measuredValue: "", pass: null };
										next[i] = { ...next[i], acceptableRange: e.target.value };
										onChange({ ...value, quantitative: ensureIndex(next) });
									}}
									disabled={!editable}
								/>
								</div>
								<div>
								<Input
									value={row.measuredValue || ""}
									onChange={(e) => {
										const next = [...(value.quantitative || [])];
										if (!next[i]) next[i] = { index: i + 1, parameter: "", acceptableRange: "", measuredValue: "", pass: null };
										next[i] = { ...next[i], measuredValue: e.target.value };
										onChange({ ...value, quantitative: ensureIndex(next) });
									}}
									disabled={!editable}
								/>
								</div>
								<div className="flex items-center gap-2 pt-2 justify-center">
								<label className="inline-flex items-center gap-1 text-sm">
									<input
										type="checkbox"
										checked={row.pass === true}
										onChange={() => {
											const next = [...(value.quantitative || [])];
											if (!next[i]) next[i] = { index: i + 1, parameter: "", acceptableRange: "", measuredValue: "", pass: null };
											next[i] = { ...next[i], pass: row.pass === true ? null : true };
											onChange({ ...value, quantitative: ensureIndex(next) });
										}}
										disabled={!editable}
									/>
										<span>Pass</span>
								</label>
								<label className="inline-flex items-center gap-1 text-sm">
									<input
										type="checkbox"
										checked={row.pass === false}
										onChange={() => {
											const next = [...(value.quantitative || [])];
											if (!next[i]) next[i] = { index: i + 1, parameter: "", acceptableRange: "", measuredValue: "", pass: null };
											next[i] = { ...next[i], pass: row.pass === false ? null : false };
											onChange({ ...value, quantitative: ensureIndex(next) });
										}}
										disabled={!editable}
									/>
										<span>Fail</span>
								</label>
								</div>
								<div className="flex items-center justify-center">
								{editable && (value.quantitative || []).length > 0 ? (
									<Button type="button" variant="ghost" size="icon" onClick={() => removeQuanRow(i)} title="Remove row">
										<Trash2 className="h-4 w-4" />
									</Button>
								) : null}
							</div>
							</div>
						),
					)}
					{editable ? (
						<div>
							<Button type="button" variant="outline" className="gap-2" onClick={addQuanRow}>
								<Plus className="h-4 w-4" /> Add row
							</Button>
						</div>
					) : null}
				</CardContent>
			</Card>
		</div>
	);
}


