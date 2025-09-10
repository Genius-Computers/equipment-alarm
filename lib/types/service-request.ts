import { DbBaseAudit } from "./database";

export interface SparePartNeeded {
    name: string;
    number?: string;
    description?: string;
    quantity: number;
    estimatedUnitPriceSar?: number;
    preferredSupplier?: string;
    urgency?: "low" | "medium" | "high" | "urgent";
}

export interface ServiceRequest {
    id: string;
    equipmentId: string;
    title: string;
    description?: string;
    scheduledAt?: string; // ISO datetime
    estimatedDurationHours?: number;
    priority?: "low" | "medium" | "high" | "urgent";
    technicianId?: string;
    notes?: string;
    sparePartsNeeded?: SparePartNeeded[];
}

export interface DbServiceRequest extends DbBaseAudit {
    equipment_id: string;
    title: string;
    description: string | null;
    scheduled_at: string | null;
    estimated_duration_hours: number | null;
    priority: "low" | "medium" | "high" | "urgent" | null;
    technician_id: string | null;
    notes: string | null;
    spare_parts_needed: string | null; // JSON string of SparePartNeeded[] if stored
}

