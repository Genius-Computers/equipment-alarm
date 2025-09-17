"use client";

import AddEquipmentForm from "@/components/AddEquipmentForm";
import MaintenanceAlert from "@/components/MaintenanceAlert";
import { Skeleton } from "@/components/ui/skeleton";
import { Equipment } from "@/lib/types";

interface EquipmentSidebarProps {
  loading: boolean;
  equipment: Equipment[];
  onAdd: (newEquipment: Omit<Equipment, "id">) => Promise<void> | void;
  submitting?: boolean;
}

const EquipmentSidebar = ({ loading, equipment, onAdd, submitting = false }: EquipmentSidebarProps) => {
  return (
    <div className="space-y-6">
      <AddEquipmentForm onAddEquipment={onAdd} submitting={submitting} />

      {loading ? (
        <div className="space-y-4">
          <div className="border rounded-lg p-4 bg-secondary/10">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-64 mt-2" />
          </div>
          <div className="border rounded-lg p-4 bg-warning/10">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-56 mt-2" />
          </div>
          <div className="rounded-lg border">
            <div className="p-4">
              <Skeleton className="h-4 w-40" />
            </div>
            <div className="p-4 space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-24 mt-1" />
                  </div>
                  <div className="text-right">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-5 w-20 mt-1 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <MaintenanceAlert equipment={equipment} />
      )}
    </div>
  );
};

export default EquipmentSidebar;
