import { DbBaseAudit } from "./database";

export type SparePartOrderStatus = 
  | "Pending Technician Action"
  | "Pending Supervisor Review" 
  | "Completed"
  | "Approved"
  | "Cancelled";

export interface SparePartOrderItem {
  equipmentId?: string;
  equipmentName?: string;
  sparePartName?: string;
  quantityRequested: number;
  quantitySupplied?: number;
  notes?: string;
}

export interface SparePartOrder {
  id: string;
  status: SparePartOrderStatus;
  items: SparePartOrderItem[];
  supervisorNotes?: string;
  technicianNotes?: string;
  createdBy: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt?: string;
  submittedToSupervisorAt?: string;
  completedAt?: string;
}

export interface DbSparePartOrder extends DbBaseAudit {
  status: SparePartOrderStatus;
  items: string; // JSON stringified SparePartOrderItem[]
  supervisor_notes?: string;
  technician_notes?: string;
  submitted_to_supervisor_at?: string;
  completed_at?: string;
}

