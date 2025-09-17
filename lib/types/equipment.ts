import { DbBaseAudit } from "./database";
import { ServiceRequest } from "./service-request";

export interface Equipment {
    id: string;
    name: string;
    partNumber: string;
    location: string;
    lastMaintenance: string;
    maintenanceInterval: string;
    inUse: boolean;
}

export interface JEquipment extends Equipment {
    latestPendingServiceRequest: ServiceRequest
}

export interface DbEquipment extends DbBaseAudit {
    name: string;
    part_number: string;
    location: string;
    last_maintenance: string;
    maintenance_interval: string;
    in_use: boolean;
}