import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useLanguage } from "@/hooks/useLanguage";
import { toast } from "sonner";
import { Equipment } from "@/lib/types";

interface AddEquipmentFormProps {
  onAddEquipment: (equipment: Omit<Equipment, 'id'>) => void;
}

const AddEquipmentForm = ({ onAddEquipment }: AddEquipmentFormProps) => {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    machineName: '',
    partNumber: '',
    location: '',
    maintenanceInterval: '',
    lastMaintenance: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.machineName || !formData.partNumber || !formData.location || !formData.maintenanceInterval) {
      toast(t("toast.error"),{
        description: t("toast.fillRequired"),
      });
      return;
    }

    const lastDate = new Date(formData.lastMaintenance || new Date());
    onAddEquipment({
      machineName: formData.machineName,
      partNumber: formData.partNumber,
      location: formData.location,
      maintenanceInterval: formData.maintenanceInterval,
      lastMaintenance: lastDate.toLocaleDateString(),
      inUse: true,
    });
    setFormData({
      machineName: '',
      partNumber: '',
      location: '',
      maintenanceInterval: '',
      lastMaintenance: ''
    });
    setOpen(false);
    
    toast(t("toast.success"), {
      description: t("toast.equipmentAdded"),
    });
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button className="w-full">
          <Plus className="h-4 w-4 mr-2 rtl:mr-0 rtl:ml-2" />
          {t("form.addNewEquipment")}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="p-4">
        <SheetHeader>
          <SheetTitle>{t("form.addNewEquipment")}</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="machineName">{t("form.machineName")} {t("form.required")}</Label>
              <Input
                id="machineName"
                value={formData.machineName}
                onChange={(e) => setFormData({ ...formData, machineName: e.target.value })}
                placeholder="e.g., HVAC Unit A1"
                required
              />
            </div>
            <div>
              <Label htmlFor="partNumber">{t("form.partNumber")} {t("form.required")}</Label>
              <Input
                id="partNumber"
                value={formData.partNumber}
                onChange={(e) => setFormData({ ...formData, partNumber: e.target.value })}
                placeholder="e.g., AC-2024-001"
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="location">{t("form.location")} {t("form.required")}</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="e.g., Engineering Building - Floor 2"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="maintenanceInterval">{t("form.maintenanceInterval")} {t("form.required")}</Label>
              <Select onValueChange={(value) => setFormData({ ...formData, maintenanceInterval: value })} required>
                <SelectTrigger>
                  <SelectValue placeholder={t("form.selectInterval")} />
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
              <Label htmlFor="lastMaintenance">{t("form.lastMaintenanceDate")}</Label>
              <Input
                id="lastMaintenance"
                type="date"
                value={formData.lastMaintenance}
                onChange={(e) => setFormData({ ...formData, lastMaintenance: e.target.value })}
              />
            </div>
          </div>

          {/* Spare parts fields removed as status is derived and not stored */}

          <div className="flex gap-2 pt-4">
            <Button type="submit">{t("form.addEquipment")}</Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t("form.cancel")}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
};

export default AddEquipmentForm;