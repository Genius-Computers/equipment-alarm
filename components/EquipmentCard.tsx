import { MapPin, Wrench, Pencil, XCircle, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import ServiceRequestDialog from "./ServiceRequestDialog";

import { Equipment, JEquipment } from "@/lib/types";
import { MAINTENANCE_INTERVAL_DAYS_MAP } from "@/lib/utils";

interface EquipmentCardProps {
  equipment: JEquipment;
  onEditEquipment?: (updated: Equipment) => void;
  disabled?: boolean;
}

const EquipmentCard = ({ equipment, onEditEquipment, disabled = false }: EquipmentCardProps) => {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: equipment.name,
    partNumber: equipment.partNumber,
    location: equipment.location,
    maintenanceInterval: equipment.maintenanceInterval,
    lastMaintenance: equipment.lastMaintenance,
    inUse: equipment.inUse ?? true,
  });

  const getDaysUntilMaintenance = () => {
    const last = equipment.lastMaintenance ? new Date(equipment.lastMaintenance) : new Date();
    const next = new Date(last);
    const addDays = MAINTENANCE_INTERVAL_DAYS_MAP[equipment.maintenanceInterval] ?? 30;
    next.setDate(last.getDate() + addDays);
    const today = new Date();
    const diffDays = Math.ceil((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysUntil = getDaysUntilMaintenance();

  return (
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

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">{t("equipment.lastMaintenance")}</p>
            <p className="font-medium">{equipment.lastMaintenance}</p>
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

        {equipment.latestPendingServiceRequest && (
          <div className="rounded-md border p-3 space-y-2">
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
                existingId={equipment.latestPendingServiceRequest.id}
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
        </div>

        <div className="flex gap-2 pt-2">
          {/* {equipment.status !== "good" && (
            <Button size="sm" onClick={() => onCompleteMaintenance(equipment.id)}>
              <CheckCircle className="h-4 w-4 mr-1 rtl:mr-0 rtl:ml-1" />
              {t("equipment.markMaintenanceCompleted")}
            </Button>
          )} */}
          {onEditEquipment && (
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button size="sm" variant="outline" disabled={disabled}>
                  {disabled ? (
                    <Loader2 className="h-4 w-4 mr-1 rtl:mr-0 rtl:ml-1 animate-spin" />
                  ) : (
                    <Pencil className="h-4 w-4 mr-1 rtl:mr-0 rtl:ml-1" />
                  )}
                  {!disabled && t("equipment.edit")}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="p-4">
                <SheetHeader>
                  <SheetTitle>{t("equipment.edit")}</SheetTitle>
                </SheetHeader>
                <div className="mt-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Machine name"
                      />
                    </div>
                    <div>
                      <Input
                        value={formData.partNumber}
                        onChange={(e) => setFormData({ ...formData, partNumber: e.target.value })}
                        placeholder="Part number"
                      />
                    </div>
                  </div>
                  <div>
                    <Input
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="Location"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Select
                        value={formData.maintenanceInterval}
                        onValueChange={(value) => setFormData({ ...formData, maintenanceInterval: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Interval" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1 week">{t("form.everyWeek")}</SelectItem>
                          <SelectItem value="2 weeks">{t("form.every2Weeks")}</SelectItem>
                          <SelectItem value="1 month">{t("form.everyMonth")}</SelectItem>
                          <SelectItem value="3 months">{t("form.every3Months")}</SelectItem>
                          <SelectItem value="6 months">{t("form.every6Months")}</SelectItem>
                          <SelectItem value="1 year">{t("form.everyYear")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Input
                        type="date"
                        value={formData.lastMaintenance}
                        onChange={(e) => setFormData({ ...formData, lastMaintenance: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="inUse"
                      checked={formData.inUse}
                      onCheckedChange={(checked) => setFormData({ ...formData, inUse: checked })}
                    />
                    <label htmlFor="inUse" className="text-sm">
                      {formData.inUse ? t("equipment.inUse") : t("equipment.notInUse")}
                    </label>
                  </div>
                  <div className="flex gap-2 pt-4">
                    <Button
                      size="sm"
                      disabled={disabled}
                      onClick={() => {
                        const updated: Equipment = {
                          ...equipment,
                          ...formData,
                        };
                        onEditEquipment(updated);
                        setOpen(false);
                      }}>
                      {disabled ? <Loader2 className="h-4 w-4 mr-1 rtl:mr-0 rtl:ml-1 animate-spin" /> : t("form.save")}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setOpen(false)} disabled={disabled}>
                      {disabled ? <Loader2 className="h-4 w-4 mr-1 rtl:mr-0 rtl:ml-1 animate-spin" /> : null}
                      {!disabled && t("form.cancel")}
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <ServiceRequestDialog equipmentId={equipment.id} equipmentName={equipment.name} />
        </div>
      </CardContent>
    </Card>
  );
};

export default EquipmentCard;
