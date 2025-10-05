"use client";

import { Fragment } from "react";
import { getDaysUntilMaintenance } from "@/components/EquipmentCard";
import ServiceRequestDialog from "@/components/ServiceRequestDialog";
import EquipmentForm from "@/components/AddEquipmentForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLanguage } from "@/hooks/useLanguage";
import { Equipment, JEquipment } from "@/lib/types";
import type { JServiceRequest } from "@/lib/types/service-request";
import { Wrench, Pencil, XCircle, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useSelfProfile } from "@/hooks/useSelfProfile";
import { canApprove } from "@/lib/types/user";

interface EquipmentTableProps {
  items: JEquipment[];
  onEdit: (updated: Equipment) => Promise<void> | void;
  onDelete?: (id: string) => Promise<void> | void;
  updating?: boolean;
}

const headerClass = "px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide";
const cellClass = "px-3 py-3 text-sm align-middle";

const EquipmentTable = ({ items, onEdit, onDelete, updating = false }: EquipmentTableProps) => {
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
            <th className={headerClass}>{t("equipment.name")}</th>
            <th className={headerClass}>{t("form.model")}</th>
            <th className={headerClass}>{t("form.manufacturer")}</th>
            <th className={headerClass}>{t("form.serialNumber")}</th>
            <th className={headerClass}>{t("equipment.part")}</th>
            <th className={headerClass}>{t("equipment.location")}</th>
            <th className={headerClass}>{t("form.subLocation")}</th>
            <th className={headerClass}>{t("equipment.lastMaintenance")}</th>
            <th className={headerClass}>{t("equipment.status")}</th>
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
                <tr onClick={() => router.push(`/equipments/${e.id}`)} className="border-t hover:bg-muted/30">
                  <td className={cellClass}>
                    <div className="flex items-center gap-2">
                      {!e.inUse && (
                        <Badge variant="destructive" className="whitespace-nowrap">
                          <XCircle className="h-3 w-3 mr-1 rtl:mr-0 rtl:ml-1" />
                          {t("equipment.notInUse")}
                        </Badge>
                      )}
                      <div className="font-medium">{e.name}</div>
                    </div>
                  </td>
                  <td className={cellClass}>{e.model || "—"}</td>
                  <td className={cellClass}>{e.manufacturer || "—"}</td>
                  <td className={cellClass}>{e.serialNumber || "—"}</td>
                  <td className={cellClass}>{e.partNumber}</td>
                  <td className={cellClass}>
                    <div className="inline-flex items-center gap-1 text-muted-foreground">
                      <span>{e.location}</span>
                    </div>
                  </td>
                  <td className={cellClass}>{e.subLocation || "—"}</td>
                  <td className={cellClass}>
                    {e.lastMaintenance ? new Date(e.lastMaintenance).toLocaleDateString() : "—"}
                  </td>
                  <td className={cellClass}>
                    <Badge variant="secondary" className="capitalize">
                      {e.status}
                    </Badge>
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
                      <ServiceRequestDialog
                        equipmentId={e.id}
                        equipmentName={e.name}
                        existing={e.latestPendingServiceRequest as JServiceRequest}
                        trigger={
                          <Button size="sm" variant="outline">
                            <Wrench className="h-4 w-4 mr-1 rtl:mr-0 rtl:ml-1" />
                            {t("serviceRequest.manage")}
                          </Button>
                        }
                      />
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
