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
    model: string;
    manufacturer: string;
    serialNumber: string;
    // Legacy location fields (will be deprecated)
    location: string; // campus
    subLocation: string; // free text sublocation (room, etc.)
    // New location structure
    locationId?: string;
    // Expanded location info for display
    locationName?: string;
    campus?: string;
    status: string;
    lastMaintenance?: string;
    maintenanceInterval?: string;

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
    model: string;
    manufacturer: string;
    serialNumber: string;
    location: string;
    subLocation: string;
}

export interface DbEquipment extends DbBaseAudit {
    name: string;
    part_number: string;
    model: string;
    manufacturer: string;
    serial_number: string;
    // Legacy location fields (will be deprecated)
    location: string;
    sub_location: string;
    // New location structure
    location_id?: string;
    status: string;
    last_maintenance?: string;
    maintenance_interval?: string;
}