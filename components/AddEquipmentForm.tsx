import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, Plus, Pencil } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useLanguage } from "@/hooks/useLanguage";
import { toast } from "sonner";
import { Equipment, EquipmentStatus } from "@/lib/types";

interface EquipmentFormProps {
  onSubmitEquipment: (equipment: Omit<Equipment, "id"> | Equipment) => void;
  submitting?: boolean;
  mode?: "add" | "edit";
  equipment?: Equipment;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const EquipmentForm = ({ 
  onSubmitEquipment, 
  submitting = false, 
  mode = "add",
  equipment,
  trigger,
  open: controlledOpen,
  onOpenChange
}: EquipmentFormProps) => {
  const { t } = useLanguage();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;

  const getInitialFormData = () => {
    if (mode === "edit" && equipment) {
      return {
        name: equipment.name,
        partNumber: equipment.partNumber,
        location: equipment.location,
        subLocation: equipment.subLocation || "",
        maintenanceInterval: equipment.maintenanceInterval,
        lastMaintenance: equipment.lastMaintenance ? new Date(equipment.lastMaintenance).toISOString().split('T')[0] : "",
        model: equipment.model || "",
        manufacturer: equipment.manufacturer || "",
        serialNumber: equipment.serialNumber || "",
        status: equipment.status || EquipmentStatus.NEW_INSTALLATION,
        inUse: equipment.inUse ?? true,
      };
    }
    return {
      name: "",
      partNumber: "",
      location: "",
      subLocation: "",
      maintenanceInterval: "",
      lastMaintenance: "",
      model: "",
      manufacturer: "",
      serialNumber: "",
      status: EquipmentStatus.NEW_INSTALLATION,
      inUse: true,
    };
  };

  const [formData, setFormData] = useState(getInitialFormData());

  // Update form data when equipment changes (for edit mode)
  useEffect(() => {
    if (mode === "edit" && equipment) {
      setFormData(getInitialFormData());
    }
  }, [equipment, mode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.partNumber || !formData.location || !formData.maintenanceInterval) {
      toast(t("toast.error"), {
        description: t("toast.fillRequired"),
      });
      return;
    }

    const lastDate = new Date(formData.lastMaintenance || new Date());
    
    if (mode === "edit" && equipment) {
      // Edit mode: preserve the equipment ID
      onSubmitEquipment({
        ...equipment,
        name: formData.name,
        partNumber: formData.partNumber,
        location: formData.location,
        subLocation: formData.subLocation,
        maintenanceInterval: formData.maintenanceInterval,
        lastMaintenance: lastDate.toISOString(),
        inUse: formData.inUse,
        model: formData.model,
        manufacturer: formData.manufacturer,
        serialNumber: formData.serialNumber,
        status: formData.status,
      });
    } else {
      // Add mode: create new equipment
      onSubmitEquipment({
        name: formData.name,
        partNumber: formData.partNumber,
        location: formData.location,
        subLocation: formData.subLocation,
        maintenanceInterval: formData.maintenanceInterval,
        lastMaintenance: lastDate.toISOString(),
        inUse: formData.inUse,
        model: formData.model,
        manufacturer: formData.manufacturer,
        serialNumber: formData.serialNumber,
        status: formData.status,
      });
    }

    if (mode === "add") {
      // Reset form only in add mode
      setFormData({
        name: "",
        partNumber: "",
        location: "",
        subLocation: "",
        maintenanceInterval: "",
        lastMaintenance: "",
        model: "",
        manufacturer: "",
        serialNumber: "",
        status: EquipmentStatus.NEW_INSTALLATION,
        inUse: true,
      });
    }
    
    setOpen(false);

    toast(t("toast.success"), {
      description: mode === "edit" ? t("toast.equipmentUpdated") : t("toast.equipmentAdded"),
    });
  };

  const defaultTrigger = mode === "add" ? (
    <Button className="w-full" disabled={submitting}>
      {submitting ? (
        <span className="inline-flex items-center">
          <Loader2 className="h-4 w-4 mr-1 rtl:mr-0 rtl:ml-1 animate-spin" />
        </span>
      ) : (
        <span className="inline-flex items-center">
          <Plus className="h-4 w-4 mr-2 rtl:mr-0 rtl:ml-2" />
          {t("form.addNewEquipment")}
        </span>
      )}
    </Button>
  ) : (
    <Button size="sm" variant="outline" disabled={submitting}>
      {submitting ? (
        <Loader2 className="h-4 w-4 mr-1 rtl:mr-0 rtl:ml-1 animate-spin" />
      ) : (
        <Pencil className="h-4 w-4 mr-1 rtl:mr-0 rtl:ml-1" />
      )}
      {!submitting && t("equipment.edit")}
    </Button>
  );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger || defaultTrigger}
      </SheetTrigger>
      <SheetContent side="right" className="p-4">
        <SheetHeader>
          <SheetTitle>{mode === "edit" ? t("equipment.edit") : t("form.addNewEquipment")}</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <Label htmlFor="name">
                {t("form.machineName")} {t("form.required")}
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., HVAC Unit A1"
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="partNumber">
                {t("form.partNumber")} {t("form.required")}
              </Label>
              <Input
                id="partNumber"
                value={formData.partNumber}
                onChange={(e) => setFormData({ ...formData, partNumber: e.target.value })}
                placeholder="e.g., AC-2024-001"
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor="location">
              {t("form.location")} {t("form.required")}
            </Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="e.g., Engineering Building - Floor 2"
              required
            />
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor="subLocation">
              {t("form.subLocation") || "Sub-location"}
            </Label>
            <Input
              id="subLocation"
              value={formData.subLocation}
              onChange={(e) => setFormData({ ...formData, subLocation: e.target.value })}
              placeholder="e.g., Room 204 (North Wing)"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <Label htmlFor="maintenanceInterval">
                {t("form.maintenanceInterval")} {t("form.required")}
              </Label>
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
            <div className="flex flex-col gap-1">
              <Label htmlFor="lastMaintenance">{t("form.lastMaintenanceDate")}</Label>
              <Input
                id="lastMaintenance"
                type="date"
                value={formData.lastMaintenance}
                onChange={(e) => setFormData({ ...formData, lastMaintenance: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <Label htmlFor="model">{t("form.model")}</Label>
              <Input
                id="model"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                placeholder="e.g., Model X100"
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="manufacturer">{t("form.manufacturer")}</Label>
              <Input
                id="manufacturer"
                value={formData.manufacturer}
                onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                placeholder="e.g., Acme Corp"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <Label htmlFor="serialNumber">{t("form.serialNumber")}</Label>
              <Input
                id="serialNumber"
                value={formData.serialNumber}
                onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                placeholder="e.g., SN-00012345"
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="status">{t("form.status")}</Label>
              <Select onValueChange={(value) => setFormData({ ...formData, status: value as EquipmentStatus })}>
                <SelectTrigger>
                  <SelectValue placeholder={t("form.selectStatus")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={EquipmentStatus.NEW_INSTALLATION}>{t("status.newInstallation")}</SelectItem>
                  <SelectItem value={EquipmentStatus.WORKING}>{t("status.working")}</SelectItem>
                  <SelectItem value={EquipmentStatus.REPAIR}>{t("status.repair")}</SelectItem>
                  <SelectItem value={EquipmentStatus.MAINTENANCE}>{t("status.maintenance")}</SelectItem>
                  <SelectItem value={EquipmentStatus.PART_REPLACEMENT}>{t("status.partReplacement")}</SelectItem>
                  <SelectItem value={EquipmentStatus.FOR_INSTALLATION}>{t("status.forInstallation")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Spare parts fields removed as status is derived and not stored */}

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
            <Button type="submit" disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 mr-1 rtl:mr-0 rtl:ml-1 animate-spin" /> : null}
              {!submitting && (mode === "edit" ? t("form.save") : t("form.addEquipment"))}
            </Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 mr-1 rtl:mr-0 rtl:ml-1 animate-spin" /> : null}
              {!submitting && t("form.cancel")}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
};

export default EquipmentForm;

// Backward compatibility export
export const AddEquipmentForm = EquipmentForm;
