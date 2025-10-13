"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";
import { JEquipment } from "@/lib/types";
import { stringifyCSV } from "@/lib/csv";
import { Download, Loader2 } from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

interface EquipmentCSVExportProps {
  items: JEquipment[];
  filters?: {
    location?: string;
    subLocation?: string;
    status?: string;
  };
}

// User-friendly column names matching the form labels
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

const EquipmentCSVExport = ({ items, filters }: EquipmentCSVExportProps) => {
  const { t } = useLanguage();
  const [exporting, setExporting] = useState(false);

  const generateCSV = (data: JEquipment[]) => {
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
    const rows = data.map((e) => ({
      [USER_FRIENDLY_NAMES.name]: e.name,
      [USER_FRIENDLY_NAMES.partNumber]: e.partNumber ?? "",
      [USER_FRIENDLY_NAMES.model]: e.model ?? "",
      [USER_FRIENDLY_NAMES.manufacturer]: e.manufacturer ?? "",
      [USER_FRIENDLY_NAMES.serialNumber]: e.serialNumber ?? "",
      [USER_FRIENDLY_NAMES.location]: e.location,
      [USER_FRIENDLY_NAMES.subLocation]: e.subLocation ?? "",
      [USER_FRIENDLY_NAMES.status]: e.status ?? "",
      [USER_FRIENDLY_NAMES.lastMaintenance]: e.lastMaintenance ?? "",
      [USER_FRIENDLY_NAMES.maintenanceInterval]: e.maintenanceInterval ?? "",
    }));
    const csvContent = stringifyCSV(headers, rows);
    const BOM = '\uFEFF'; // UTF-8 BOM for Excel compatibility
    const csv = BOM + csvContent;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `equipment-export-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportCurrentPage = () => {
    generateCSV(items);
  };

  const handleExportAll = async () => {
    setExporting(true);
    try {
      // Build query parameters for filtering
      const params = new URLSearchParams();
      if (filters?.location) params.append('location', filters.location);
      if (filters?.subLocation) params.append('subLocation', filters.subLocation);
      if (filters?.status) params.append('status', filters.status);

      const url = `/api/equipment/export${params.toString() ? `?${params.toString()}` : ''}`;
      console.log('Exporting from URL:', url);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Export API error:', response.status, errorText);
        throw new Error(`Failed to fetch equipment data: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('Export API result:', result);
      
      if (result.success) {
        console.log(`Exporting ${result.data.length} items from API (vs ${items.length} from current page)`);
        generateCSV(result.data);
        
        // Show success message with filter info
        let message = `Exported ${result.count} equipment items`;
        if (filters?.location || filters?.subLocation || filters?.status) {
          const filterParts = [];
          if (filters.location) filterParts.push(`Location: ${filters.location}`);
          if (filters.subLocation) filterParts.push(`Sub-location: ${filters.subLocation}`);
          if (filters.status) filterParts.push(`Status: ${filters.status}`);
          message += ` (Filtered by: ${filterParts.join(', ')})`;
        }
        
        toast.success(message);
      } else {
        throw new Error(result.error || 'Export failed');
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error(`Failed to export equipment data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="outline" disabled={exporting} aria-label={t("csv.export")}>
          {exporting ? (
            <Loader2 className="h-4 w-4 mr-2 rtl:mr-0 rtl:ml-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2 rtl:mr-0 rtl:ml-2" />
          )}
          {exporting ? "Exporting..." : t("csv.export")}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleExportCurrentPage}>
          <Download className="h-4 w-4 mr-2 rtl:mr-0 rtl:ml-2" />
          Export Current Page ({items.length} items)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportAll}>
          <Download className="h-4 w-4 mr-2 rtl:mr-0 rtl:ml-2" />
          {filters?.location || filters?.subLocation || filters?.status 
            ? 'Export Filtered Equipment' 
            : 'Export All Equipment'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default EquipmentCSVExport;
