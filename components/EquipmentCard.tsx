import { MapPin, Wrench, Pencil, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";
import ServiceRequestDialog from "./ServiceRequestDialog";
//
import { Equipment, ServiceRequestApprovalStatus, ServiceRequestWorkStatus } from "@/lib/types";

interface EquipmentCardProps {
  equipment: Equipment;
  onEditEquipment?: (updated: Equipment) => void;
}

const EquipmentCard = ({ equipment, onEditEquipment }: EquipmentCardProps) => {
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

  // status badge function currently unused; keep for future status-based UI

  const [hasOpenRequest, setHasOpenRequest] = useState<boolean>(false);

  const getDaysUntilMaintenance = () => {
    const last = equipment.lastMaintenance ? new Date(equipment.lastMaintenance) : new Date();
    const next = new Date(last);
    const intervalDaysMap: Record<string, number> = {
      '1 week': 7,
      '2 weeks': 14,
      '1 month': 30,
      '3 months': 90,
      '6 months': 180,
      '1 year': 365
    };
    const addDays = intervalDaysMap[equipment.maintenanceInterval] ?? 30;
    next.setDate(last.getDate() + addDays);
    const today = new Date();
    const diffDays = Math.ceil((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysUntil = getDaysUntilMaintenance();

  // Prefer joined latest pending request if present on the object
  useEffect(() => {
    const joined = (equipment as unknown as { latestPendingServiceRequest?: { approvalStatus?: string; workStatus?: string } })
      .latestPendingServiceRequest;
    if (joined) {
      const open = (joined.approvalStatus === ServiceRequestApprovalStatus.PENDING) || (joined.workStatus === ServiceRequestWorkStatus.PENDING);
      setHasOpenRequest(open);
      return;
    }
    // Fallback: keep existing behavior without extra joins
    setHasOpenRequest(false);
  }, [equipment]);

  return (
    <Card className="hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">{equipment.name}</CardTitle>
          <div className="flex items-center gap-2">
            {/* {getStatusBadge(equipment.status)} */}
            {!equipment.inUse && (
              <Badge variant='destructive'>
                <XCircle className="h-3 w-3 mr-1 rtl:mr-0 rtl:ml-1" />
                {t('equipment.notInUse')}
              </Badge>
            )}
            {hasOpenRequest && (
              <Badge className="bg-primary/10 text-primary border-primary/20">
                {t('serviceRequest.openRequest')}
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
                <Button size="sm" variant="outline">
                  <Pencil className="h-4 w-4 mr-1 rtl:mr-0 rtl:ml-1" />
                  {t("equipment.edit")}
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
                      onClick={() => {
                        const updated: Equipment = {
                          ...equipment,
                          ...formData,
                        };
                        onEditEquipment(updated);
                        setOpen(false);
                      }}>
                      {t("form.save")}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setOpen(false)}>
                      {t("form.cancel")}
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <ServiceRequestDialog
            equipmentId={equipment.id}
            equipmentName={equipment.name}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default EquipmentCard;
