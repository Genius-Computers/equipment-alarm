"use client";

import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";
import { JEquipment } from "@/lib/types";
import { stringifyCSV } from "@/lib/csv";
import { Download } from "lucide-react";

interface EquipmentCSVExportProps {
  items: JEquipment[];
}

const EquipmentCSVExport = ({ items }: EquipmentCSVExportProps) => {
  const { t } = useLanguage();

  const handleExport = () => {
    const headers = [
      "name",
      "partNumber",
      "location",
      "subLocation",
      "lastMaintenance",
      "maintenanceInterval",
      "inUse",
      "model",
      "manufacturer",
      "serialNumber",
      "status",
    ];
    const rows = items.map((e) => ({
      name: e.name,
      partNumber: e.partNumber,
      location: e.location,
      subLocation: e.subLocation ?? "",
      lastMaintenance: e.lastMaintenance ?? "",
      maintenanceInterval: e.maintenanceInterval ?? "",
      inUse: e.inUse ? "true" : "false",
      model: e.model ?? "",
      manufacturer: e.manufacturer ?? "",
      serialNumber: e.serialNumber ?? "",
      status: e.status ?? "",
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
