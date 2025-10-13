"use client";

import { Button } from "@/components/ui/button";
import { SparePart } from "@/lib/types";
import { stringifyCSV } from "@/lib/csv";
import { Download } from "lucide-react";

interface SparePartsCSVExportProps {
  items: SparePart[];
}

// User-friendly column names
const USER_FRIENDLY_NAMES = {
  name: "Name",
  serialNumber: "Serial Number",
  quantity: "Quantity",
  manufacturer: "Manufacturer",
  supplier: "Supplier",
};

const SparePartsCSVExport = ({ items }: SparePartsCSVExportProps) => {
  const handleExport = () => {
    const headers = [
      USER_FRIENDLY_NAMES.name,
      USER_FRIENDLY_NAMES.serialNumber,
      USER_FRIENDLY_NAMES.quantity,
      USER_FRIENDLY_NAMES.manufacturer,
      USER_FRIENDLY_NAMES.supplier,
    ];
    const rows = items.map((sp) => ({
      [USER_FRIENDLY_NAMES.name]: sp.name,
      [USER_FRIENDLY_NAMES.serialNumber]: sp.serialNumber ?? "",
      [USER_FRIENDLY_NAMES.quantity]: sp.quantity.toString(),
      [USER_FRIENDLY_NAMES.manufacturer]: sp.manufacturer ?? "",
      [USER_FRIENDLY_NAMES.supplier]: sp.supplier ?? "",
    }));
    const csvContent = stringifyCSV(headers, rows);
    const BOM = '\uFEFF'; // UTF-8 BOM for Excel compatibility
    const csv = BOM + csvContent;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `spare-parts-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Button size="sm" variant="outline" onClick={handleExport} aria-label="Export CSV">
      <Download className="h-4 w-4 mr-2 rtl:mr-0 rtl:ml-2" />
      Export CSV
    </Button>
  );
};

export default SparePartsCSVExport;

