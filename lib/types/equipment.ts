import { DbBaseAudit } from "./database";
import { ServiceRequest } from "./service-request";

export enum EquipmentMaintenanceStatus {
    GOOD = "good",
    DUE = "due",
    OVERDUE = "overdue",
}

export interface Equipment {
    id: string;
    name: string;
    partNumber: string;
    location: string;
    subLocation: string;
    lastMaintenance?: string;
    maintenanceInterval?: string;
    inUse: boolean;
    status: string;
    model: string;
    manufacturer: string;
    serialNumber: string;

    // Derived properties
    maintenanceStatus?: EquipmentMaintenanceStatus; 
    nextMaintenance?: string;
    daysUntil?: number
}

export interface JEquipment extends Equipment {
    latestPendingServiceRequest: ServiceRequest
}

export interface EquipmentCache {
    id: string;
    name: string;
    partNumber: string;
    location: string;
    subLocation: string;
    model: string;
    manufacturer: string;
    serialNumber: string;
}

export interface DbEquipment extends DbBaseAudit {
    name: string;
    model: string;
    manufacturer: string;
    serial_number: string;
    status: string;
    part_number: string;
    location: string;
    sub_location: string;
    last_maintenance?: string;
    maintenance_interval?: string;
    in_use: boolean;
}