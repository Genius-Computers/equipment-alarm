import { Equipment } from "./equipment";
import { ServiceRequest, ServiceRequestType, ServiceRequestPriority, ServiceRequestApprovalStatus, ServiceRequestWorkStatus } from "./service-request";
import { JobOrder } from "./job-order";
import { SparePart } from "./spare-parts";
import { SparePartOrder, SparePartOrderStatus } from "./spare-part-order";
import { Location } from "./location";
import { User } from "./user";

export interface EquipmentStats {
  total: number;
  byStatus: Record<string, number>;
  byManufacturer: Record<string, number>;
  bySublocation: Record<string, number>;
  maintenanceDue: number;
  maintenanceOverdue: number;
  newThisMonth: number;
  equipment: Equipment[];
}

export interface ServiceRequestStats {
  total: number;
  byType: Record<ServiceRequestType, number>;
  byPriority: Record<ServiceRequestPriority, number>;
  byApprovalStatus: Record<ServiceRequestApprovalStatus, number>;
  byWorkStatus: Record<ServiceRequestWorkStatus, number>;
  averageCompletionTime: number; // in hours
  byEquipment: Record<string, number>;
  byTechnician: Record<string, number>;
  totalSparePartsCost: number;
  serviceRequests: ServiceRequest[];
}

export interface JobOrderStats {
  total: number;
  byStatus: Record<string, number>;
  bySublocation: Record<string, number>;
  totalEquipmentItems: number;
  mostActiveSublocations: Array<{ sublocation: string; count: number }>;
  jobOrders: JobOrder[];
}

export interface SparePartsStats {
  totalItems: number;
  lowStockAlerts: number;
  totalValue: number;
  topRequested: Array<{ name: string; quantity: number; cost: number }>;
  monthlyUsage: number;
  monthlyCost: number;
  spareParts: SparePart[];
}

export interface SparePartOrderStats {
  total: number;
  byStatus: Record<SparePartOrderStatus, number>;
  totalQuantityRequested: number;
  totalQuantitySupplied: number;
  averageProcessingTime: number; // in hours
  totalCost: number;
  sparePartOrders: SparePartOrder[];
}

export interface AttendanceStats {
  totalTechnicians: number;
  totalWorkingDays: number;
  averageHoursPerDay: number;
  lateArrivals: number;
  earlyDepartures: number;
  byTechnician: Array<{
    technician: User;
    workingDays: number;
    averageHours: number;
    serviceRequestsAssigned: number;
    serviceRequestsCompleted: number;
    completionRate: number;
  }>;
}

export interface MonthlyReport {
  period: {
    month: number;
    year: number;
    monthName: string;
  };
  location?: Location;
  generatedAt: string;
  generatedBy: string;
  
  equipment: EquipmentStats;
  serviceRequests: ServiceRequestStats;
  jobOrders: JobOrderStats;
  spareParts: SparePartsStats;
  sparePartOrders: SparePartOrderStats;
  attendance: AttendanceStats;
  
  summary: {
    totalEquipment: number;
    totalServiceRequests: number;
    totalJobOrders: number;
    totalSparePartsCost: number;
    totalTechnicians: number;
  };
}

export interface ReportFilters {
  month: number;
  year: number;
  locationId?: string;
}

export interface ReportGenerationRequest {
  month: number;
  year: number;
  locationId?: string;
}

