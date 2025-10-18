import { DbBaseAudit } from ".";

export interface DbLocation extends DbBaseAudit {
    campus: string;
    name: string;
    name_ar?: string;
}

export interface Location {
    id: string;
    campus: string;
    name: string;
    nameAr?: string;
    createdAt: string;
    createdBy: string;
}