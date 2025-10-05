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
  "Equipment/Device name": "name",
  "Tag Number": "partNumber",
  "Location": "location",
  "Sub-location": "subLocation",
  "Model": "model",
  "Manufacturer": "manufacturer",
  "Serial Number": "serialNumber",
  "Status": "status",
};

const REQUIRED_FIELDS = ["name", "partNumber", "location"];
const USER_FRIENDLY_NAMES = {
  name: "Equipment/Device name",
  partNumber: "Tag Number",
  location: "Location",
  subLocation: "Sub-location",
  model: "Model",
  manufacturer: "Manufacturer",
  serialNumber: "Serial Number",
  status: "Status",
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
      USER_FRIENDLY_NAMES.location,
      USER_FRIENDLY_NAMES.subLocation,
      USER_FRIENDLY_NAMES.model,
      USER_FRIENDLY_NAMES.manufacturer,
      USER_FRIENDLY_NAMES.serialNumber,
      USER_FRIENDLY_NAMES.status,
    ];

    const exampleRows = [
      {
        [USER_FRIENDLY_NAMES.name]: "HVAC Unit A1",
        [USER_FRIENDLY_NAMES.partNumber]: "AC-2024-001",
        [USER_FRIENDLY_NAMES.location]: "Engineering Building - Floor 2",
        [USER_FRIENDLY_NAMES.subLocation]: "Room 204 (North Wing)",
        [USER_FRIENDLY_NAMES.model]: "Model X100",
        [USER_FRIENDLY_NAMES.manufacturer]: "Acme Corp",
        [USER_FRIENDLY_NAMES.serialNumber]: "SN-00012345",
        [USER_FRIENDLY_NAMES.status]: "Working",
      },
      {
        [USER_FRIENDLY_NAMES.name]: "Ventilator B2",
        [USER_FRIENDLY_NAMES.partNumber]: "VT-2024-002",
        [USER_FRIENDLY_NAMES.location]: "Medical Center - ICU",
        [USER_FRIENDLY_NAMES.subLocation]: "Ward 3",
        [USER_FRIENDLY_NAMES.model]: "V-500",
        [USER_FRIENDLY_NAMES.manufacturer]: "MedTech Inc",
        [USER_FRIENDLY_NAMES.serialNumber]: "SN-98765432",
        [USER_FRIENDLY_NAMES.status]: "Maintenance",
      },
    ];

    const csvContent = stringifyCSV(headers, exampleRows);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
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
        location: r.location ?? "",
        subLocation: r.subLocation ?? "",
        model: r.model ?? "",
        manufacturer: r.manufacturer ?? "",
        serialNumber: r.serialNumber ?? "",
        status: r.status ?? "Working",
      }));

      const res = await fetch("/api/equipment/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: payload }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to import CSV");
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
  );
};

export default EquipmentCSVImport;
