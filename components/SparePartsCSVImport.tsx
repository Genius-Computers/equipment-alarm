"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { parseCSV, stringifyCSV } from "@/lib/csv";
import { Upload, Loader2, Download } from "lucide-react";
import { toast } from "sonner";

interface SparePartsCSVImportProps {
  onImported?: () => void;
}

// Mapping of user-friendly names to database field names
const FIELD_MAPPINGS: Record<string, string> = {
  "Name": "name",
  "Serial Number": "serialNumber",
  "Quantity": "quantity",
  "Manufacturer": "manufacturer",
  "Supplier": "supplier",
};

const REQUIRED_FIELDS = ["name"];
const USER_FRIENDLY_NAMES = {
  name: "Name",
  serialNumber: "Serial Number",
  quantity: "Quantity",
  manufacturer: "Manufacturer",
  supplier: "Supplier",
};

const SparePartsCSVImport = ({ onImported }: SparePartsCSVImportProps) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleClick = () => inputRef.current?.click();

  const handleDownloadTemplate = () => {
    const headers = [
      USER_FRIENDLY_NAMES.name,
      USER_FRIENDLY_NAMES.serialNumber,
      USER_FRIENDLY_NAMES.quantity,
      USER_FRIENDLY_NAMES.manufacturer,
      USER_FRIENDLY_NAMES.supplier,
    ];

    const exampleRows = [
      {
        [USER_FRIENDLY_NAMES.name]: "Air Filter",
        [USER_FRIENDLY_NAMES.serialNumber]: "AF-12345",
        [USER_FRIENDLY_NAMES.quantity]: "25",
        [USER_FRIENDLY_NAMES.manufacturer]: "FilterCo",
        [USER_FRIENDLY_NAMES.supplier]: "Parts Warehouse Inc.",
      },
      {
        [USER_FRIENDLY_NAMES.name]: "Oil Filter",
        [USER_FRIENDLY_NAMES.serialNumber]: "OF-67890",
        [USER_FRIENDLY_NAMES.quantity]: "15",
        [USER_FRIENDLY_NAMES.manufacturer]: "LubeTech",
        [USER_FRIENDLY_NAMES.supplier]: "Industrial Supplies Ltd.",
      },
    ];

    const csvContent = stringifyCSV(headers, exampleRows);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "spare_parts_template.csv";
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

      // Normalize headers to database field names
      const normalizedRows = rows.map(normalizeHeaders);
      const headers = Object.keys(normalizedRows[0]);
      
      // Check for required fields
      const missing = REQUIRED_FIELDS.filter((field) => !headers.includes(field));
      if (missing.length > 0) {
        const userFriendlyMissing = missing.map((f) => USER_FRIENDLY_NAMES[f as keyof typeof USER_FRIENDLY_NAMES] || f);
        toast("Error", { description: `Missing required columns: ${userFriendlyMissing.join(", ")}` });
        return;
      }

      const payload = normalizedRows.map((r) => ({
        name: r.name ?? "",
        serialNumber: r.serialNumber ?? "",
        quantity: parseInt(r.quantity) || 0,
        manufacturer: r.manufacturer ?? "",
        supplier: r.supplier ?? "",
      }));

      const res = await fetch("/api/spare-parts/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: payload }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to import CSV");
      }
      toast("Success", { description: "Spare parts imported successfully" });
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

export default SparePartsCSVImport;

