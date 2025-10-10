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
import { useLanguage } from "@/hooks/useLanguage";

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
  const { t } = useLanguage();
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
    return <Card className="p-6 text-center text-sm text-muted-foreground">{t("spareParts.noResults")}</Card>;
  }

  return (
    <>
      <div className="rounded-lg border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className={headerClass}>{t("spareParts.name")}</th>
              <th className={headerClass}>{t("spareParts.serialNumber")}</th>
              <th className={headerClass}>{t("spareParts.quantity")}</th>
              <th className={headerClass}>{t("spareParts.manufacturer")}</th>
              <th className={headerClass}>{t("spareParts.supplier")}</th>
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
                              {t("common.edit")}
                            </Button>
                          }
                        />
                        {onDelete && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="destructive"
                                aria-label={t("common.delete")}
                                disabled={updating}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{t("spareParts.deleteTitle")}</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {t("spareParts.deleteDescription", { name: sparePart.name })}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                                <AlertDialogAction onClick={() => onDelete(sparePart.id)}>
                                  {t("common.delete")}
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

