import { DbBaseAudit } from "./database";

export interface SparePart {
    id: string;
    name: string;
    serialNumber?: string;
    quantity: number;
    manufacturer?: string;
    supplier?: string;
}

export interface DbSparePart extends DbBaseAudit {
    name: string;
    serial_number?: string;
    quantity: number;
    manufacturer?: string;
    supplier?: string;
}


