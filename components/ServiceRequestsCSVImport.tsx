"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { parseCSV, stringifyCSV } from "@/lib/csv";
import { Upload, Loader2, Download } from "lucide-react";
import { toast } from "sonner";

interface ServiceRequestsCSVImportProps {
  onImported?: () => void;
}

const FIELD_MAPPINGS: Record<string, string> = {
  "Ticket No": "ticketNo",
  "Tag Number": "tagNumber",
  "Equipment Name": "equipmentName",
  "Model": "model",
  "Manufacturer": "manufacturer",
  "Serial Number": "serialNumber",
  "Location": "location",
  "Sublocation": "sublocation",
  "Request Type": "requestType",
  "Priority": "priority",
  "Schedule": "schedule",
  "Technician": "technician",
  "Status": "status",
  "Operational Status": "operationalStatus",
};

const REQUIRED_FIELDS = ["ticketNo", "tagNumber", "requestType", "schedule"];

const USER_FRIENDLY_NAMES: Record<string, string> = {
  ticketNo: "Ticket No",
  tagNumber: "Tag Number",
  equipmentName: "Equipment Name",
  model: "Model",
  manufacturer: "Manufacturer",
  serialNumber: "Serial Number",
  location: "Location",
  sublocation: "Sublocation",
  requestType: "Request Type",
  priority: "Priority",
  schedule: "Schedule",
  technician: "Technician",
  status: "Status",
  operationalStatus: "Operational Status",
};

const ServiceRequestsCSVImport = ({ onImported }: ServiceRequestsCSVImportProps) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleClick = () => inputRef.current?.click();

  const handleDownloadTemplate = () => {
    const headers = [
      USER_FRIENDLY_NAMES.ticketNo,
      USER_FRIENDLY_NAMES.tagNumber,
      USER_FRIENDLY_NAMES.equipmentName,
      USER_FRIENDLY_NAMES.model,
      USER_FRIENDLY_NAMES.manufacturer,
      USER_FRIENDLY_NAMES.serialNumber,
      USER_FRIENDLY_NAMES.location,
      USER_FRIENDLY_NAMES.sublocation,
      USER_FRIENDLY_NAMES.requestType,
      USER_FRIENDLY_NAMES.priority,
      USER_FRIENDLY_NAMES.schedule,
      USER_FRIENDLY_NAMES.technician,
      USER_FRIENDLY_NAMES.status,
      USER_FRIENDLY_NAMES.operationalStatus,
    ];

    const exampleRows = [
      {
        [USER_FRIENDLY_NAMES.ticketNo]: "",
        [USER_FRIENDLY_NAMES.tagNumber]: "25-0001",
        [USER_FRIENDLY_NAMES.equipmentName]: "",
        [USER_FRIENDLY_NAMES.model]: "",
        [USER_FRIENDLY_NAMES.manufacturer]: "",
        [USER_FRIENDLY_NAMES.serialNumber]: "",
        [USER_FRIENDLY_NAMES.location]: "",
        [USER_FRIENDLY_NAMES.sublocation]: "",
        [USER_FRIENDLY_NAMES.requestType]: "",
        [USER_FRIENDLY_NAMES.priority]: "medium",
        [USER_FRIENDLY_NAMES.schedule]: "2026-01-01T00:00",
        [USER_FRIENDLY_NAMES.technician]: "",
        [USER_FRIENDLY_NAMES.status]: "",
        [USER_FRIENDLY_NAMES.operationalStatus]: "Operational",
      },
    ];

    const csvContent = stringifyCSV(headers, exampleRows);
    const BOM = "\uFEFF";
    const csvWithBOM = BOM + csvContent;
    const blob = new Blob([csvWithBOM], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "service_requests_template.csv";
    link.click();
    URL.revokeObjectURL(url);
    toast("Success", { description: "Template downloaded successfully" });
  };

  const normalizeHeaders = (row: Record<string, string>): Record<string, string> => {
    const normalized: Record<string, string> = {};
    Object.keys(row).forEach((header) => {
      const fieldName = FIELD_MAPPINGS[header] || header;
      normalized[fieldName] = row[header];
    });
    return normalized;
  };

  const handleFile = async (file: File) => {
    try {
      setUploading(true);
      const text = await file.text();
      const rows = parseCSV(text);
      if (rows.length === 0) {
        toast("Error", { description: "No rows found in CSV file" });
        return;
      }

      const normalizedRows = rows.map(normalizeHeaders);
      const headers = Object.keys(normalizedRows[0] ?? {});

      const missing = REQUIRED_FIELDS.filter((field) => !headers.includes(field));
      if (missing.length > 0) {
        const human = missing
          .map((f) => USER_FRIENDLY_NAMES[f] || f)
          .join(", ");
        toast("Error", { description: `Missing required columns: ${human}` });
        return;
      }

      const rowsWithTicketNo: number[] = [];
      normalizedRows.forEach((r, index) => {
        const ticketNo = (r.ticketNo ?? "").toString().trim();
        if (ticketNo.length > 0) {
          rowsWithTicketNo.push(index + 1);
        }
      });

      if (rowsWithTicketNo.length > 0) {
        toast("Error", {
          description:
            "Ticket No must be blank for all rows. Found non-empty values in row(s): " +
            rowsWithTicketNo.join(", "),
        });
        return;
      }

      const payload = normalizedRows.map((r) => ({
        ticketNo: r.ticketNo ?? "",
        tagNumber: r.tagNumber ?? "",
        requestType: r.requestType ?? "",
        priority: r.priority ?? "",
        schedule: r.schedule ?? "",
        technician: r.technician ?? "",
        status: r.status ?? "",
        operationalStatus: r.operationalStatus ?? "",
        location: r.location ?? "",
        sublocation: r.sublocation ?? "",
      }));

      const res = await fetch("/api/service-request/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: payload }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const description =
          typeof data?.error === "string" && data.error.length > 0
            ? data.error
            : "Failed to import service requests CSV";
        toast("Error", { description, duration: 10000 });
        return;
      }

      const data = await res.json();
      const createdCount = Number(data?.createdCount || 0);
      const orderNumber = data?.jobOrder?.orderNumber as string | undefined;

      let description = `Imported ${createdCount} service request(s)`;
      if (orderNumber) {
        description += ` • Job order: ${orderNumber}`;
      }

      const unresolved = Array.isArray(data?.unresolvedTechnicians) ? data.unresolvedTechnicians : [];
      if (unresolved.length > 0) {
        description += `\nUnresolved technicians (left unassigned): ${unresolved.join(", ")}`;
      }

      toast("Success", { description, duration: 10000 });
      onImported?.();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to import CSV";
      toast("Error", { description: message });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="flex gap-2">
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />
      <Button size="sm" variant="outline" onClick={handleDownloadTemplate} aria-label="Download Template">
        <Download className="h-4 w-4 mr-2 rtl:mr-0 rtl:ml-2" />
        Download Template
      </Button>
      <Button size="sm" variant="outline" onClick={handleClick} disabled={uploading} aria-label="Import CSV">
        {uploading ? (
          <Loader2 className="h-4 w-4 mr-2 rtl:mr-0 rtl:ml-2 animate-spin" />
        ) : (
          <Upload className="h-4 w-4 mr-2 rtl:mr-0 rtl:ml-2" />
        )}
        {uploading ? "Importing..." : "Import CSV"}
      </Button>
    </div>
  );
};

export default ServiceRequestsCSVImport;




