"use client";

import { Fragment } from "react";
import { getDaysUntilMaintenance } from "@/components/EquipmentCard";
import EquipmentForm from "@/components/AddEquipmentForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useLanguage } from "@/hooks/useLanguage";
import { Equipment, JEquipment } from "@/lib/types";
import { Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useSelfProfile } from "@/hooks/useSelfProfile";
import { canApprove } from "@/lib/types/user";
import { formatSaudiDate } from "@/lib/utils";

interface EquipmentTableProps {
  items: JEquipment[];
  onEdit: (updated: Equipment) => Promise<void> | void;
  onDelete?: (id: string) => Promise<void> | void;
  updating?: boolean;
  deleteMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelection?: (id: string) => void;
}

const headerClass = "px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide";
const cellClass = "px-3 py-3 text-sm align-middle";

const EquipmentTable = ({ 
  items, 
  onEdit, 
  onDelete, 
  updating = false,
  deleteMode = false,
  selectedIds = new Set(),
  onToggleSelection,
}: EquipmentTableProps) => {
  const { t } = useLanguage();
  const router = useRouter();
  const { profile } = useSelfProfile();
  const canDelete = canApprove(profile?.role);

  if (!items || items.length === 0) {
    return <Card className="p-6 text-center text-sm text-muted-foreground">{t("common.noResults")}</Card>;
  }

  return (
    <div className="rounded-lg border overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            {deleteMode && (
              <th className={headerClass + " w-10"}>
                <span className="sr-only">Select</span>
              </th>
            )}
            <th className={headerClass}>{t("equipment.name")}</th>
            <th className={headerClass}>Tag Number</th>
            <th className={headerClass}>{t("form.model")}</th>
            <th className={headerClass}>{t("form.manufacturer")}</th>
            <th className={headerClass}>{t("form.serialNumber")}</th>
            <th className={headerClass}>{t("equipment.location")}</th>
            <th className={headerClass}>{t("form.subLocation")}</th>
            <th className={headerClass}>{t("equipment.status")}</th>
            <th className={headerClass}>{t("equipment.lastMaintenance")}</th>
            <th className={headerClass}>{t("equipment.nextMaintenance")}</th>
            <th className={headerClass}>{t("form.maintenanceInterval")}</th>
            <th className={headerClass}></th>
          </tr>
        </thead>
        <tbody>
          {items.map((e) => {
            const daysUntil = getDaysUntilMaintenance(e);
            const nextMaintenanceLabel =
              daysUntil !== null && daysUntil <= 0
                ? t("equipment.overdueBy", { days: Math.abs(daysUntil) })
                : daysUntil !== null && daysUntil <= 7
                ? t("equipment.inDays", { days: daysUntil })
                : "";

            return (
              <Fragment key={e.id}>
                <tr onClick={deleteMode ? undefined : () => router.push(e.partNumber ? `/equipments/tag/${encodeURIComponent(e.partNumber)}` : `/equipments/${e.id}`)} className={deleteMode ? "border-t" : "border-t hover:bg-muted/30"}>
                  {deleteMode && (
                    <td className={cellClass + " w-10"} onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.has(e.id)}
                        onCheckedChange={() => onToggleSelection?.(e.id)}
                      />
                    </td>
                  )}
                  <td className={cellClass}>
                    <div className="flex items-center gap-2">
                      <div className="font-medium">{e.name}</div>
                    </div>
                  </td>
                  <td className={cellClass}>{e.partNumber || "—"}</td>
                  <td className={cellClass}>{e.model || "—"}</td>
                  <td className={cellClass}>{e.manufacturer || "—"}</td>
                  <td className={cellClass}>{e.serialNumber || "—"}</td>
                  <td className={cellClass}>
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium">{e.locationName || e.subLocation || "—"}</span>
                      {e.campus && <span className="text-xs text-muted-foreground">{e.campus}</span>}
                    </div>
                  </td>
                  <td className={cellClass}>{e.subLocation || "—"}</td>
                  <td className={cellClass}>
                    <Badge variant="secondary" className="capitalize">
                      {e.status}
                    </Badge>
                  </td>
                  <td className={cellClass}>
                    {formatSaudiDate(e.lastMaintenance)}
                  </td>
                  <td className={cellClass}>
                    {nextMaintenanceLabel ? (
                      <span className={daysUntil !== null && daysUntil <= 0 ? "text-destructive" : "text-warning"}>
                        {nextMaintenanceLabel}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className={cellClass}>{e.maintenanceInterval || "—"}</td>
                <td className={cellClass}>
                  <div className="flex items-center gap-2 justify-end" onClick={(e) => e.stopPropagation()}>
                    <EquipmentForm
                        mode="edit"
                        equipment={e as unknown as Equipment}
                        onSubmitEquipment={(updated) => onEdit(updated as Equipment)}
                        submitting={updating}
                        trigger={
                          <Button size="sm" variant="outline" className="gap-1">
                            <Pencil className="h-4 w-4" />
                            {t("form.edit")}
                          </Button>
                        }
                      />
                      {onDelete && canDelete && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="destructive"
                              aria-label={t("equipment.delete")}
                              disabled={updating}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t("equipment.deleteTitle")}</AlertDialogTitle>
                              <AlertDialogDescription>
                                {t("equipment.deleteDescription", { name: e.name })}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t("form.cancel")}</AlertDialogCancel>
                              <AlertDialogAction onClick={() => onDelete(e.id)}>
                                {t("equipment.delete")}
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
  );
};

export default EquipmentTable;
