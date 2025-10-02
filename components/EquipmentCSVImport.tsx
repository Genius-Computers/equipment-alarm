"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";
import { parseCSV, normalizeBoolean } from "@/lib/csv";
import { Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface EquipmentCSVImportProps {
  onImported?: () => void;
}

const REQUIRED_HEADERS = [
  "name",
  "partNumber",
  "location",
  "maintenanceInterval",
];

const EquipmentCSVImport = ({ onImported }: EquipmentCSVImportProps) => {
  const { t } = useLanguage();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleClick = () => inputRef.current?.click();

  const handleFile = async (file: File) => {
    try {
      setUploading(true);
      const text = await file.text();
      const rows = parseCSV(text);
      if (rows.length === 0) {
        toast(t("toast.error"), { description: t("csv.noRows") });
        return;
      }
      const headers = Object.keys(rows[0]);
      const missing = REQUIRED_HEADERS.filter((h) => !headers.includes(h));
      if (missing.length > 0) {
        toast(t("toast.error"), { description: t("csv.missingHeaders", { missing: missing.join(", ") }) });
        return;
      }

      const payload = rows.map((r) => ({
        name: r.name ?? "",
        partNumber: r.partNumber ?? "",
        location: r.location ?? "",
        subLocation: r.subLocation ?? "",
        lastMaintenance: r.lastMaintenance ? new Date(r.lastMaintenance).toISOString() : "",
        maintenanceInterval: r.maintenanceInterval ?? "",
        inUse: normalizeBoolean(r.inUse ?? "true"),
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
    <>
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
      <Button size="sm" variant="outline" onClick={handleClick} disabled={uploading} aria-label={t("csv.import")}>
        {uploading ? (
          <Loader2 className="h-4 w-4 mr-2 rtl:mr-0 rtl:ml-2 animate-spin" />
        ) : (
          <Upload className="h-4 w-4 mr-2 rtl:mr-0 rtl:ml-2" />
        )}
        {uploading ? t("csv.importing") : t("csv.import")}
      </Button>
    </>
  );
};

export default EquipmentCSVImport;
