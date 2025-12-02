"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { stringifyCSV } from "@/lib/csv";
import { Download, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import type { JServiceRequest } from "@/lib/types/service-request";

interface ServiceRequestsCSVExportProps {
  items: JServiceRequest[];
  filters: {
    scope: "pending" | "completed";
    priority: "all" | JServiceRequest["priority"] | "overdue";
    approval: "all" | JServiceRequest["approvalStatus"];
    requestType: "all" | JServiceRequest["requestType"];
    assignedToMe: boolean;
  };
}

const USER_FRIENDLY_NAMES = {
  ticketNo: "Ticket No",
  tagNumber: "Tag Number",
  equipmentName: "Equipment Name",
  requestType: "Request Type",
  priority: "Priority",
  schedule: "Schedule",
  technician: "Technician",
  status: "Status",
  operationalStatus: "Operational Status",
  approvalStatus: "Approval Status",
};

const buildTechnicianLabel = (item: JServiceRequest): string => {
  const names: string[] = [];
  if (Array.isArray(item.technicians) && item.technicians.length > 0) {
    for (const tech of item.technicians) {
      const label = (tech as unknown as { displayName?: string | null; email?: string | null }).displayName
        || (tech as unknown as { displayName?: string | null; email?: string | null }).email
        || "";
      if (label && !names.includes(label)) {
        names.push(label);
      }
    }
  } else if (item.technician) {
    const tech = item.technician as unknown as { displayName?: string | null; email?: string | null };
    const label = tech.displayName || tech.email || "";
    if (label) names.push(label);
  }
  if (names.length === 0 && item.assignedTechnicianId) {
    names.push(item.assignedTechnicianId);
  }
  return names.join(", ");
};

const generateCSV = (data: JServiceRequest[]) => {
  const headers = [
    USER_FRIENDLY_NAMES.ticketNo,
    USER_FRIENDLY_NAMES.tagNumber,
    USER_FRIENDLY_NAMES.equipmentName,
    USER_FRIENDLY_NAMES.requestType,
    USER_FRIENDLY_NAMES.priority,
    USER_FRIENDLY_NAMES.schedule,
    USER_FRIENDLY_NAMES.technician,
    USER_FRIENDLY_NAMES.status,
    USER_FRIENDLY_NAMES.operationalStatus,
    USER_FRIENDLY_NAMES.approvalStatus,
  ];

  const rows = data.map((sr) => ({
    [USER_FRIENDLY_NAMES.ticketNo]: sr.ticketId ?? "",
    [USER_FRIENDLY_NAMES.tagNumber]: sr.equipment?.partNumber ?? "",
    [USER_FRIENDLY_NAMES.equipmentName]: sr.equipment?.name ?? "",
    [USER_FRIENDLY_NAMES.requestType]: sr.requestType ?? "",
    [USER_FRIENDLY_NAMES.priority]: sr.priority ?? "",
    [USER_FRIENDLY_NAMES.schedule]: sr.scheduledAt ?? "",
    [USER_FRIENDLY_NAMES.technician]: buildTechnicianLabel(sr),
    [USER_FRIENDLY_NAMES.status]: sr.workStatus ?? "",
    [USER_FRIENDLY_NAMES.operationalStatus]: sr.equipment?.status ?? "",
    [USER_FRIENDLY_NAMES.approvalStatus]: sr.approvalStatus ?? "",
  }));

  const csvContent = stringifyCSV(headers, rows);
  const BOM = "\uFEFF";
  const csv = BOM + csvContent;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `service-requests-export-${new Date().toISOString().split("T")[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const ServiceRequestsCSVExport = ({ items, filters }: ServiceRequestsCSVExportProps) => {
  const [exporting, setExporting] = useState(false);

  const handleExportCurrentPage = () => {
    if (!items || items.length === 0) {
      toast("Info", { description: "No service requests on this page to export." });
      return;
    }
    generateCSV(items);
  };

  const handleExportAll = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (filters.scope) params.append("scope", filters.scope);

      const priorityParam =
        filters.priority === "overdue" ? "all" : (filters.priority || "all");
      params.append("priority", priorityParam);

      params.append("approval", filters.approval || "all");
      params.append("requestType", filters.requestType || "all");
      if (filters.assignedToMe) params.append("assignedTo", "me");

      const url = `/api/service-request/export${params.toString() ? `?${params.toString()}` : ""}`;
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Export failed with status ${response.status}`);
      }

      const result = await response.json();
      if (!result?.success || !Array.isArray(result.data)) {
        throw new Error(result?.error || "Invalid export response");
      }

      const data = result.data as JServiceRequest[];
      if (data.length === 0) {
        toast("Info", { description: "No matching service requests to export." });
        return;
      }

      generateCSV(data);

      let message = `Exported ${data.length} service request(s)`;
      const filtersUsed: string[] = [];
      if (filters.scope) filtersUsed.push(`Scope: ${filters.scope}`);
      if (filters.priority && filters.priority !== "all") filtersUsed.push(`Priority: ${filters.priority}`);
      if (filters.approval && filters.approval !== "all") filtersUsed.push(`Approval: ${filters.approval}`);
      if (filters.requestType && filters.requestType !== "all") filtersUsed.push(`Type: ${filters.requestType}`);
      if (filters.assignedToMe) filtersUsed.push("Assigned to: me");
      if (filtersUsed.length > 0) {
        message += ` (Filtered by: ${filtersUsed.join(", ")})`;
      }

      toast.success(message);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      toast.error(`Failed to export service requests: ${msg}`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="outline" disabled={exporting} aria-label="Export CSV">
          {exporting ? (
            <Loader2 className="h-4 w-4 mr-2 rtl:mr-0 rtl:ml-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2 rtl:mr-0 rtl:ml-2" />
          )}
          {exporting ? "Exporting..." : "Export CSV"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleExportCurrentPage}>
          <Download className="h-4 w-4 mr-2 rtl:mr-0 rtl:ml-2" />
          Export Current Page ({items.length} items)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportAll}>
          <Download className="h-4 w-4 mr-2 rtl:mr-0 rtl:ml-2" />
          Export All Matching
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ServiceRequestsCSVExport;




