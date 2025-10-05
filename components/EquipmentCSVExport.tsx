"use client";

import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";
import { JEquipment } from "@/lib/types";
import { stringifyCSV } from "@/lib/csv";
import { Download } from "lucide-react";

interface EquipmentCSVExportProps {
  items: JEquipment[];
}

// User-friendly column names matching the form labels
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

const EquipmentCSVExport = ({ items }: EquipmentCSVExportProps) => {
  const { t } = useLanguage();

  const handleExport = () => {
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
    const rows = items.map((e) => ({
      [USER_FRIENDLY_NAMES.name]: e.name,
      [USER_FRIENDLY_NAMES.partNumber]: e.partNumber,
      [USER_FRIENDLY_NAMES.location]: e.location,
      [USER_FRIENDLY_NAMES.subLocation]: e.subLocation ?? "",
      [USER_FRIENDLY_NAMES.model]: e.model ?? "",
      [USER_FRIENDLY_NAMES.manufacturer]: e.manufacturer ?? "",
      [USER_FRIENDLY_NAMES.serialNumber]: e.serialNumber ?? "",
      [USER_FRIENDLY_NAMES.status]: e.status ?? "",
    }));
    const csv = stringifyCSV(headers, rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `equipment-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Button size="sm" variant="outline" onClick={handleExport} aria-label={t("csv.export")}>
      <Download className="h-4 w-4 mr-2 rtl:mr-0 rtl:ml-2" />
      {t("csv.export")}
    </Button>
  );
};

export default EquipmentCSVExport;
