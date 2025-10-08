"use client";

import { Fragment, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SparePart } from "@/lib/types";
import { Pencil, Trash2, Package } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import EquipmentForm from "@/components/AddEquipmentForm";
import SparePartUsageDialog from "@/components/SparePartUsageDialog";

interface SparePartsTableProps {
  items: SparePart[];
  onEdit: (updated: SparePart) => Promise<void> | void;
  onDelete?: (id: string) => Promise<void> | void;
  updating?: boolean;
  loading?: boolean;
}

const headerClass = "px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide";
const cellClass = "px-3 py-3 text-sm align-middle";

const SparePartsTable = ({ items, onEdit, onDelete, updating = false, loading = false }: SparePartsTableProps) => {
  const [selectedSparePart, setSelectedSparePart] = useState<SparePart | null>(null);
  const [usageDialogOpen, setUsageDialogOpen] = useState(false);

  const handleRowClick = (sparePart: SparePart) => {
    console.log('[SparePartsTable] Row clicked, spare part:', sparePart.id, sparePart.name);
    setSelectedSparePart(sparePart);
    setUsageDialogOpen(true);
    console.log('[SparePartsTable] Set selectedSparePart and usageDialogOpen to true');
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (!items || items.length === 0) {
    return <Card className="p-6 text-center text-sm text-muted-foreground">No spare parts found.</Card>;
  }

  return (
    <>
      <div className="rounded-lg border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className={headerClass}>Name</th>
              <th className={headerClass}>Serial Number</th>
              <th className={headerClass}>Quantity</th>
              <th className={headerClass}>Manufacturer</th>
              <th className={headerClass}>Supplier</th>
              <th className={headerClass}></th>
            </tr>
          </thead>
          <tbody>
            {items.map((sparePart) => {
              return (
                <Fragment key={sparePart.id}>
                  <tr 
                    className="border-t hover:bg-muted/30 cursor-pointer" 
                    onClick={() => handleRowClick(sparePart)}
                  >
                    <td className={cellClass}>
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <div className="font-medium">{sparePart.name}</div>
                      </div>
                    </td>
                    <td className={cellClass}>{sparePart.serialNumber || "—"}</td>
                    <td className={cellClass}>
                      <Badge variant="secondary">{sparePart.quantity}</Badge>
                    </td>
                    <td className={cellClass}>{sparePart.manufacturer || "—"}</td>
                    <td className={cellClass}>{sparePart.supplier || "—"}</td>
                    <td className={cellClass}>
                      <div className="flex items-center gap-2 justify-end" onClick={(e) => e.stopPropagation()}>
                        <EquipmentForm
                          mode="edit"
                          sparePart={sparePart}
                          onSubmitEquipment={() => {}}
                          onSubmitSparePart={(updated) => onEdit(updated as SparePart)}
                          submitting={updating}
                          trigger={
                            <Button size="sm" variant="outline" className="gap-1">
                              <Pencil className="h-4 w-4" />
                              Edit
                            </Button>
                          }
                        />
                        {onDelete && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="destructive"
                                aria-label="Delete spare part"
                                disabled={updating}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Spare Part</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete &quot;{sparePart.name}&quot;? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => onDelete(sparePart.id)}>
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </td>
                  </tr>
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {selectedSparePart && (
        <SparePartUsageDialog
          sparePart={selectedSparePart}
          open={usageDialogOpen}
          onOpenChange={setUsageDialogOpen}
        />
      )}
    </>
  );
};

export default SparePartsTable;

