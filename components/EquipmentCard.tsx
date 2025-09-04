import { Calendar, MapPin, Wrench, AlertTriangle, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";

interface Equipment {
  id: string;
  machineName: string;
  partNumber: string;
  location: string;
  lastMaintenance: string;
  nextMaintenance: string;
  maintenanceInterval: string;
  sparePartsNeeded: boolean;
  sparePartsApproved?: boolean;
  status: 'good' | 'due' | 'overdue';
}

interface EquipmentCardProps {
  equipment: Equipment;
  onScheduleMaintenance: (id: string) => void;
  onUpdateSpares: (id: string) => void;
}

const EquipmentCard = ({ equipment, onScheduleMaintenance, onUpdateSpares }: EquipmentCardProps) => {
  const { t, isRTL } = useLanguage();
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'good':
        return <Badge className="bg-secondary text-secondary-foreground"><CheckCircle className="h-3 w-3 mr-1 rtl:mr-0 rtl:ml-1" />{t("equipment.upToDate")}</Badge>;
      case 'due':
        return <Badge className="bg-warning text-warning-foreground"><AlertTriangle className="h-3 w-3 mr-1 rtl:mr-0 rtl:ml-1" />{t("equipment.dueSoon")}</Badge>;
      case 'overdue':
        return <Badge className="bg-destructive text-destructive-foreground"><AlertTriangle className="h-3 w-3 mr-1 rtl:mr-0 rtl:ml-1" />{t("equipment.overdue")}</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getDaysUntilMaintenance = () => {
    const nextDate = new Date(equipment.nextMaintenance);
    const today = new Date();
    const diffTime = nextDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysUntil = getDaysUntilMaintenance();

  return (
    <Card className="hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">{equipment.machineName}</CardTitle>
          {getStatusBadge(equipment.status)}
        </div>
        <p className="text-sm text-muted-foreground">{t("equipment.part")}: {equipment.partNumber}</p>
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
            <p className="font-medium">{equipment.nextMaintenance}</p>
            {daysUntil <= 7 && daysUntil > 0 && (
              <p className="text-warning text-xs">{t("equipment.inDays", { days: daysUntil })}</p>
            )}
            {daysUntil <= 0 && (
              <p className="text-destructive text-xs font-medium">{t("equipment.overdueBy", { days: Math.abs(daysUntil) })}</p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center">
            <Wrench className="h-4 w-4 mr-2 rtl:mr-0 rtl:ml-2 text-muted-foreground" />
            <span>{t("equipment.every")} {equipment.maintenanceInterval}</span>
          </div>
        </div>

        {equipment.sparePartsNeeded && (
          <div className="bg-muted p-3 rounded-lg">
            <p className="text-sm font-medium mb-1">{t("equipment.sparePartsRequired")}</p>
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {t("equipment.approved")}: {equipment.sparePartsApproved ? t("equipment.approved") : t("equipment.pendingApproval")}
              </p>
              {!equipment.sparePartsApproved && (
                <Button size="sm" variant="outline" onClick={() => onUpdateSpares(equipment.id)}>
                  {t("equipment.requestApproval")}
                </Button>
              )}
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button size="sm" onClick={() => onScheduleMaintenance(equipment.id)}>
            <Calendar className="h-4 w-4 mr-1 rtl:mr-0 rtl:ml-1" />
            {t("equipment.scheduleMaintenance")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default EquipmentCard;