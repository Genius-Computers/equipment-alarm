export interface BaseAudit {
    id: string;

    createdBy: string;
    updatedBy: string;
    deletedBy: string;
    createdAt: string;
    updatedAt: string;
    deletedAt: string;
}

export interface DbBaseAudit {
    id: string;

    created_by: string;
    updated_by: string;
    deleted_by: string;
    created_at: string;
    updated_at: string;
    deleted_at: string;
}

export interface DbLocation extends DbBaseAudit {
    campus: string;
    name: string;
}

export interface Location {
    id: string;
    campus: string;
    name: string;
    createdAt: string;
    createdBy: string;
}

export interface DbJobOrder extends DbBaseAudit {
    order_number: string;
    campus: string;
    sublocation: string;
    items: string;
    status: string;
    submitted_by?: string;
    submitted_at?: string;
}