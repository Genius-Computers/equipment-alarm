
export interface JobOrderItem {
    equipmentId: string;
    equipmentName: string;
    partNumber: string;
    serialNumber: string;
    ticketNumber: string;
}

export interface JobOrder {
    id: string;
    orderNumber: string;
    campus: string;
    sublocation: string;
    items: JobOrderItem[];
    status: "submitted" | "in_progress" | "completed" | "cancelled";
    submittedBy: string;
    submittedAt: string;
    createdAt: string;
}


export interface CreateJobOrderRequest {
    campus: string;
    sublocation: string;
    equipmentIds: string[];
}


