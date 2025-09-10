import { DbBaseAudit } from "./database";

export interface Equipment {
    id: string;
    machineName: string;
    partNumber: string;
    location: string;
    lastMaintenance: string;
    maintenanceInterval: string;
    inUse: boolean;
}

export interface DbEquipment extends DbBaseAudit {
    machine_name: string;
    part_number: string;
    location: string;
    last_maintenance: string;
    maintenance_interval: string;
    in_use: boolean;
}