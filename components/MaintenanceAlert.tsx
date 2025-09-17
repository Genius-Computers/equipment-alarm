import { AlertTriangle, Clock, Wrench } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/hooks/useLanguage";

interface EquipmentAlertItem {
  id: string;
  name: string;
  location: string;
  nextMaintenance: string;
  status: 'good' | 'due' | 'overdue';
}

interface MaintenanceAlertProps {
  equipment: EquipmentAlertItem[];
}

const MaintenanceAlert = ({ equipment }: MaintenanceAlertProps) => {
  const { t } = useLanguage();
  const dueSoon = equipment.filter(eq => eq.status === 'due');
  const overdue = equipment.filter(eq => eq.status === 'overdue');

  if (dueSoon.length === 0 && overdue.length === 0 && equipment.length > 0) {
    return (
      <Alert className="border-secondary bg-secondary/10">
        <Wrench className="h-4 w-4" />
        <AlertTitle>{t("alert.allCurrent")}</AlertTitle>
        <AlertDescription>
          {t("alert.allCurrentDesc")}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {overdue.length > 0 && (
        <Alert className="border-destructive bg-destructive/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="text-destructive">{t("alert.overdueMaintenance")}</AlertTitle>
          <AlertDescription>
            {t("alert.overdueCount", { count: overdue.length })}
          </AlertDescription>
        </Alert>
      )}

      {dueSoon.length > 0 && (
        <Alert className="border-warning bg-warning/10">
          <Clock className="h-4 w-4" />
          <AlertTitle className="text-warning">{t("alert.dueSoon")}</AlertTitle>
          <AlertDescription>
            {t("alert.dueSoonCount", { count: dueSoon.length })}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("alert.scheduleOverview")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...overdue, ...dueSoon].map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-muted-foreground">{item.location}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{item.nextMaintenance}</p>
                  <Badge variant={item.status === 'overdue' ? 'destructive' : 'secondary'}>
                    {item.status === 'overdue' ? t("equipment.overdue") : t("equipment.dueSoon")}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MaintenanceAlert;