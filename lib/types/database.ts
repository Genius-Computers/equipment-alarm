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