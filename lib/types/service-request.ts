import { DbBaseAudit } from "./database";

export interface SparePartNeeded {
    part: string;
    description?: string;
    quantity: number;
    cost: number;
    source: string;
}

export enum ServiceRequestType {
    PREVENTIVE_MAINTENANCE = "preventive_maintenance",
    CORRECTIVE_MAINTENANCE = "corrective_maintenence",
    INSTALL = "install",
    ASSESS = "assess",
    OTHER = "other",
}

export enum ServiceRequestPriority {
    LOW = "low",
    MEDIUM = "medium",
    HIGH = "high",
}

export enum ServiceRequestApprovalStatus {
    PENDING = "pending",
    APPROVED = "approved",
    REJECTED = "rejected",
}

export enum ServiceRequestWorkStatus {
    PENDING = "pending",
    COMPLETED = "completed",
    CANCELLED = "cancelled",
}

export interface ServiceRequest {
    id: string;
    equipmentId: string;
    requestType: ServiceRequestType;
    scheduledAt: string;
    priority: ServiceRequestPriority;
    approvalStatus: ServiceRequestApprovalStatus;
    workStatus: ServiceRequestWorkStatus;
    problemDescription?: string;
    technicalAssessment?: string;
    recommendation?: string;
    sparePartsNeeded?: SparePartNeeded[];
}

export interface DbServiceRequest extends DbBaseAudit {
    equipment_id: string;
    request_type: ServiceRequestType;
    scheduled_at: string;
    priority: ServiceRequestPriority;
    approval_status: ServiceRequestApprovalStatus;
    work_status: ServiceRequestWorkStatus;
    problem_description?: string;
    technical_assessment?: string;
    recommendation?: string;
    spare_parts_needed?: SparePartNeeded[];
}
