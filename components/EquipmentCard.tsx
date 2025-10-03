import { MapPin, Wrench, Pencil, XCircle, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";
import ServiceRequestDialog from "./ServiceRequestDialog";
import EquipmentForm from "./AddEquipmentForm";

import { Equipment, JEquipment, JServiceRequest } from "@/lib/types";
import { MAINTENANCE_INTERVAL_DAYS_MAP } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useSelfProfile } from "@/hooks/useSelfProfile";
import { canApprove } from "@/lib/types/user";

interface EquipmentCardProps {
  equipment: JEquipment;
  onEditEquipment?: (updated: Equipment) => void;
  onDeleteEquipment?: (id: string) => void;
  disabled?: boolean;
}

export const getDaysUntilMaintenance = (equipment: JEquipment) => {
  const last = equipment.lastMaintenance ? new Date(equipment.lastMaintenance) : new Date();
  const next = new Date(last);
  const addDays = MAINTENANCE_INTERVAL_DAYS_MAP[equipment.maintenanceInterval] ?? 30;
  next.setDate(last.getDate() + addDays);
  const today = new Date();
  const diffDays = Math.ceil((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays;
};

const EquipmentCard = ({ equipment, onEditEquipment, onDeleteEquipment, disabled = false }: EquipmentCardProps) => {
  const { t } = useLanguage();
  const { profile } = useSelfProfile();
  const daysUntil = getDaysUntilMaintenance(equipment);
  const pathname = usePathname();
  const href = `/equipments/${equipment.id}`;
  const isSameRoute = pathname === href;
  const canDelete = canApprove(profile?.role);

  return (
    <Link
      href={href}
      onClick={(e) => {
        if (isSameRoute || disabled) e.preventDefault();
      }}
    >
      <Card className="hover:shadow-lg transition-shadow duration-200">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">{equipment.name}</CardTitle>
            <div className="flex items-center gap-2">
              {!equipment.inUse && (
                <Badge variant="destructive">
                  <XCircle className="h-3 w-3 mr-1 rtl:mr-0 rtl:ml-1" />
                  {t("equipment.notInUse")}
                </Badge>
              )}
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            {t("equipment.part")}: {equipment.partNumber}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 mr-2 rtl:mr-0 rtl:ml-2" />
            {equipment.location}
          </div>
          {equipment.subLocation ? (
            <div className="flex items-center text-xs text-muted-foreground">
              <span className="ml-6 rtl:ml-0 rtl:mr-6">{t("form.subLocation")}: {equipment.subLocation}</span>
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">{t("equipment.lastMaintenance")}</p>
              <p className="font-medium">{new Date(equipment.lastMaintenance).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-muted-foreground">{t("equipment.nextMaintenance")}</p>
              {/* <p className="font-medium">{equipment.nextMaintenance}</p> */}
              {daysUntil <= 7 && daysUntil > 0 && (
                <p className="text-warning text-xs">{t("equipment.inDays", { days: daysUntil })}</p>
              )}
              {daysUntil <= 0 && (
                <p className="text-destructive text-xs font-medium">
                  {t("equipment.overdueBy", { days: Math.abs(daysUntil) })}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-1">
              <p className="text-muted-foreground">{t("form.model")}</p>
              <p className="font-medium">{equipment.model || "—"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">{t("form.manufacturer")}</p>
              <p className="font-medium">{equipment.manufacturer || "—"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">{t("form.serialNumber")}</p>
              <p className="font-medium">{equipment.serialNumber || "—"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">{t("equipment.status")}</p>
              <p className="font-medium capitalize">{equipment.status}</p>
            </div>
          </div>

          {equipment.latestPendingServiceRequest && (
            <div
              className="rounded-md border p-3 space-y-2"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center justify-between w-full gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Wrench className="h-4 w-4 text-muted-foreground" />
                    <span className="capitalize font-medium">
                      {equipment.latestPendingServiceRequest.requestType.replaceAll("_", " ")}
                    </span>
                  </div>
                  <Badge variant="secondary" className="capitalize">
                    {equipment.latestPendingServiceRequest.priority}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="bg-primary/10 text-primary border-primary/20 capitalize">
                  {t("serviceRequest.approvalStatus")}: {equipment.latestPendingServiceRequest.approvalStatus}
                </Badge>
                <Badge className="bg-muted text-foreground/80 border border-border capitalize">
                  {t("serviceRequest.workStatus")}: {equipment.latestPendingServiceRequest.workStatus}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div>
                  {t("serviceRequest.scheduledAt")}:{" "}
                  {new Date(equipment.latestPendingServiceRequest.scheduledAt).toLocaleString()}
                </div>
                <ServiceRequestDialog
                  equipmentId={equipment.id}
                  equipmentName={equipment.name}
                  existing={equipment.latestPendingServiceRequest as JServiceRequest}
                  trigger={
                    <Button size="sm" variant="outline">
                      <Pencil className="h-4 w-4 mr-1 rtl:mr-0 rtl:ml-1" />
                    </Button>
                  }
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center">
              <Wrench className="h-4 w-4 mr-2 rtl:mr-0 rtl:ml-2 text-muted-foreground" />
              <span>
                {t("equipment.every")} {equipment.maintenanceInterval}
              </span>
            </div>
            <div className="text-muted-foreground text-xs">
              {t("equipment.inUse")}: {equipment.inUse ? t("equipment.inUse") : t("equipment.notInUse")}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            {onEditEquipment && (
              <EquipmentForm
                mode="edit"
                equipment={equipment}
                onSubmitEquipment={(updated) => onEditEquipment(updated as Equipment)}
                submitting={disabled}
              />
            )}
            {onDeleteEquipment && canDelete && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    size="sm"
                    aria-label={t("equipment.delete")}
                    disabled={disabled}
                  >
                    <Trash2 className="h-4 w-4 mr-1 rtl:mr-0 rtl:ml-1" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("equipment.deleteTitle")}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t("equipment.deleteDescription", { name: equipment.name })}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t("form.cancel")}</AlertDialogCancel>
                    <AlertDialogAction onClick={() => onDeleteEquipment(equipment.id)}>
                      {t("equipment.delete")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <ServiceRequestDialog equipmentId={equipment.id} equipmentName={equipment.name} />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

export default EquipmentCard;
