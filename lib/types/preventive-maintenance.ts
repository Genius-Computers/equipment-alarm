export interface PmQualitativeRow {
	/** 1-based row index for display only */
	index: number;
	componentArea: string;
	inspectionCriteria: string;
	/** true = ✔, false = ✘, null = not set */
	pass: boolean | null;
	comments?: string;
}

export interface PmQuantitativeRow {
	/** 1-based row index for display only */
	index: number;
	parameter: string;
	acceptableRange: string;
	measuredValue: string;
	/** true = Pass, false = Fail, null = not set */
	pass: boolean | null;
}

export interface PmDetails {
	/** Captured for audit; can be set from current user display name */
	technicianName?: string;
	/** Free-form notes if needed */
	notes?: string;
	qualitative: PmQualitativeRow[];
	quantitative: PmQuantitativeRow[];
}




