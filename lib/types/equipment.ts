import { DbBaseAudit } from "./database";
import { ServiceRequest } from "./service-request";

export enum EquipmentMaintenanceStatus {
    GOOD = "good",
    DUE = "due",
    OVERDUE = "overdue",
}

export enum EquipmentStatus {
    WORKING = 'Working',
    NEW_INSTALLATION = 'New Unit / For Installation',
    REPAIR = 'For Repair',
    MAINTENANCE = 'For Maintenance',
    PART_REPLACEMENT = 'For Replacement of Parts',
    FOR_INSTALLATION = 'For Installation',
}

export interface Equipment {
    id: string;
    name: string;
    partNumber: string;
    location: string;
    subLocation: string;
    lastMaintenance: string;
    maintenanceInterval: string;
    inUse: boolean;
    status: EquipmentStatus;
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
    status: EquipmentStatus;
    part_number: string;
    location: string;
    sub_location: string;
    last_maintenance: string;
    maintenance_interval: string;
    in_use: boolean;
}