"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";
import { parseCSV, stringifyCSV } from "@/lib/csv";
import { Upload, Loader2, Download } from "lucide-react";
import { toast } from "sonner";

interface EquipmentCSVImportProps {
  onImported?: () => void;
}

// Mapping of user-friendly names to database field names
const FIELD_MAPPINGS: Record<string, string> = {
  // English user-friendly names
  "Equipment Name": "name",
  "Tag Number": "partNumber",
  "Model": "model",
  "Manufacturer": "manufacturer",
  "Serial Number": "serialNumber",
  "Location": "location",
  "Sub Location": "subLocation",
  "Status": "status",
  "Last Maintenance": "lastMaintenance",
  "Maintenance Interval": "maintenanceInterval",
};

const REQUIRED_FIELDS = ["name", "location"];
const USER_FRIENDLY_NAMES = {
  name: "Equipment Name",
  partNumber: "Tag Number",
  model: "Model",
  manufacturer: "Manufacturer",
  serialNumber: "Serial Number",
  location: "Location",
  subLocation: "Sub Location",
  status: "Status",
  lastMaintenance: "Last Maintenance",
  maintenanceInterval: "Maintenance Interval",
};

const EquipmentCSVImport = ({ onImported }: EquipmentCSVImportProps) => {
  const { t } = useLanguage();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleClick = () => inputRef.current?.click();

  const handleDownloadTemplate = () => {
    const headers = [
      USER_FRIENDLY_NAMES.name,
      USER_FRIENDLY_NAMES.partNumber,
      USER_FRIENDLY_NAMES.model,
      USER_FRIENDLY_NAMES.manufacturer,
      USER_FRIENDLY_NAMES.serialNumber,
      USER_FRIENDLY_NAMES.location,
      USER_FRIENDLY_NAMES.subLocation,
      USER_FRIENDLY_NAMES.status,
      USER_FRIENDLY_NAMES.lastMaintenance,
      USER_FRIENDLY_NAMES.maintenanceInterval,
    ];

    const exampleRows = [
      {
        [USER_FRIENDLY_NAMES.name]: "HVAC Unit A1",
        [USER_FRIENDLY_NAMES.partNumber]: "TAG-001",
        [USER_FRIENDLY_NAMES.model]: "Model X100",
        [USER_FRIENDLY_NAMES.manufacturer]: "Acme Corp",
        [USER_FRIENDLY_NAMES.serialNumber]: "SN-00012345",
        [USER_FRIENDLY_NAMES.location]: "College of Medicine",
        [USER_FRIENDLY_NAMES.subLocation]: "Room 201",
        [USER_FRIENDLY_NAMES.status]: "Working",
        [USER_FRIENDLY_NAMES.lastMaintenance]: "2024-01-15",
        [USER_FRIENDLY_NAMES.maintenanceInterval]: "6 months",
      },
      {
        [USER_FRIENDLY_NAMES.name]: "Ventilator B2",
        [USER_FRIENDLY_NAMES.partNumber]: "TAG-002",
        [USER_FRIENDLY_NAMES.model]: "V-500",
        [USER_FRIENDLY_NAMES.manufacturer]: "MedTech Inc",
        [USER_FRIENDLY_NAMES.serialNumber]: "SN-98765432",
        [USER_FRIENDLY_NAMES.location]: "College of Dentistry",
        [USER_FRIENDLY_NAMES.subLocation]: "Lab A",
        [USER_FRIENDLY_NAMES.status]: "Maintenance",
        [USER_FRIENDLY_NAMES.lastMaintenance]: "2024-02-01",
        [USER_FRIENDLY_NAMES.maintenanceInterval]: "3 months",
      },
    ];

    // Generate CSV with BOM (Byte Order Mark) for better Excel compatibility
    const csvContent = stringifyCSV(headers, exampleRows);
    const BOM = '\uFEFF'; // UTF-8 BOM for Excel compatibility
    const csvWithBOM = BOM + csvContent;
    
    const blob = new Blob([csvWithBOM], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "equipment_template.csv";
    link.click();
    URL.revokeObjectURL(url);
    toast(t("toast.success"), { description: t("csv.templateDownloaded") });
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
        toast(t("toast.error"), { description: t("csv.noRows") });
        return;
      }

      // Normalize headers to database field names
      const normalizedRows = rows.map(normalizeHeaders);
      const headers = Object.keys(normalizedRows[0]);
      
      // Check for required fields
      const missing = REQUIRED_FIELDS.filter((field) => !headers.includes(field));
      if (missing.length > 0) {
        const userFriendlyMissing = missing.map((f) => USER_FRIENDLY_NAMES[f as keyof typeof USER_FRIENDLY_NAMES] || f);
        toast(t("toast.error"), { description: t("csv.missingHeaders", { missing: userFriendlyMissing.join(", ") }) });
        return;
      }

      const payload = normalizedRows.map((r) => ({
        name: r.name ?? "",
        partNumber: r.partNumber ?? "",
        model: r.model ?? "",
        manufacturer: r.manufacturer ?? "",
        serialNumber: r.serialNumber ?? "",
        location: r.location ?? "",
        subLocation: r.subLocation ?? "",
        status: r.status ?? "Working",
        lastMaintenance: r.lastMaintenance ?? "",
        maintenanceInterval: r.maintenanceInterval ?? "",
      }));

      const res = await fetch("/api/equipment/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: payload }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const errorMsg = data?.error || "Failed to import CSV";
        
        // Show more detailed error for missing locations
        if (data?.missingLocations && Array.isArray(data.missingLocations)) {
          toast(t("toast.error"), { 
            description: errorMsg,
            duration: 10000, // Show longer for important validation errors
          });
        } else {
          toast(t("toast.error"), { description: errorMsg });
        }
        return;
      }
      toast(t("toast.success"), { description: t("csv.imported") });
      onImported?.();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to import CSV";
      toast(t("toast.error"), { description: message });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
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
        <Button size="sm" variant="outline" onClick={handleDownloadTemplate} aria-label={t("csv.downloadTemplate")}>
          <Download className="h-4 w-4 mr-2 rtl:mr-0 rtl:ml-2" />
          {t("csv.downloadTemplate")}
        </Button>
        <Button size="sm" variant="outline" onClick={handleClick} disabled={uploading} aria-label={t("csv.import")}>
          {uploading ? (
            <Loader2 className="h-4 w-4 mr-2 rtl:mr-0 rtl:ml-2 animate-spin" />
          ) : (
            <Upload className="h-4 w-4 mr-2 rtl:mr-0 rtl:ml-2" />
          )}
          {uploading ? t("csv.importing") : t("csv.import")}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Note: The "Location" column should contain the location name (e.g., "College of Medicine"), not the campus. 
        All locations must exist in the Locations module before importing.
        The "Sub Location" column is optional and can contain free text (e.g., "Room 101", "Lab A").
      </p>
    </div>
  );
};

export default EquipmentCSVImport;
