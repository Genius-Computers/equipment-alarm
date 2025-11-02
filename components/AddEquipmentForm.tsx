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
import { Equipment, SparePart } from "@/lib/types";
import { normalizeMaintenanceInterval } from "@/lib/utils";

interface EquipmentFormProps {
  onSubmitEquipment: (equipment: Omit<Equipment, "id"> | Equipment) => void;
  onSubmitSparePart?: (sparePart: Omit<SparePart, "id"> | SparePart) => void;
  submitting?: boolean;
  mode?: "add" | "edit";
  equipment?: Equipment;
  sparePart?: SparePart;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const EquipmentForm = ({ 
  onSubmitEquipment,
  onSubmitSparePart, 
  submitting = false, 
  mode = "add",
  equipment,
  sparePart,
  trigger,
  open: controlledOpen,
  onOpenChange
}: EquipmentFormProps) => {
  const { t } = useLanguage();
  const [internalOpen, setInternalOpen] = useState(false);
  const [isSparePartsMode, setIsSparePartsMode] = useState(false);
  const [locations, setLocations] = useState<Array<{id: string, name: string, nameAr?: string, campus: string}>>([]);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;

  const getInitialFormData = () => {
    if (mode === "edit" && equipment) {
      return {
        name: equipment.name,
        partNumber: equipment.partNumber || "",
        model: equipment.model || "",
        manufacturer: equipment.manufacturer || "",
        serialNumber: equipment.serialNumber || "",
        // Legacy fields for backward compatibility
        location: equipment.location,
        subLocation: equipment.subLocation || "",
        // New location structure
        locationId: equipment.locationId || "",
        status: equipment.status,
        lastMaintenance: equipment.lastMaintenance ? new Date(equipment.lastMaintenance).toISOString().split('T')[0] : "",
        maintenanceInterval: equipment.maintenanceInterval,
      };
    }
    return {
      name: "",
      partNumber: "",
      model: "",
      manufacturer: "",
      serialNumber: "",
      location: "",
      subLocation: "",
      locationId: "",
      status: "",
      lastMaintenance: "",
      maintenanceInterval: "",
    };
  };

  const getInitialSparePartFormData = () => {
    if (mode === "edit" && sparePart) {
      return {
        name: sparePart.name,
        serialNumber: sparePart.serialNumber || "",
        quantity: sparePart.quantity,
        manufacturer: sparePart.manufacturer || "",
        supplier: sparePart.supplier || "",
      };
    }
    return {
      name: "",
      serialNumber: "",
      quantity: 0,
      manufacturer: "",
      supplier: "",
    };
  };

  const [formData, setFormData] = useState(getInitialFormData());
  const [sparePartFormData, setSparePartFormData] = useState(getInitialSparePartFormData());

  // Fetch all locations on component mount
  const fetchLocations = async () => {
    try {
      setLoadingLocations(true);
      const response = await fetch('/api/locations');
      if (response.ok) {
        const data = await response.json();
        setLocations(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch locations:', error);
    } finally {
      setLoadingLocations(false);
    }
  };

  useEffect(() => {
    if (open) {
      void fetchLocations();
    }
  }, [open]);

  // Update form data when equipment or spare part changes (for edit mode)
  useEffect(() => {
    if (mode === "edit" && equipment) {
      // Try to find the location by name if locationId is missing
      let locationId = equipment.locationId || "";
      if (!locationId && equipment.location && locations.length > 0) {
        const matchingLocation = locations.find(
          loc => loc.name.toLowerCase() === equipment.location.toLowerCase()
        );
        if (matchingLocation) {
          locationId = matchingLocation.id;
        }
      }
      
      setFormData({
        name: equipment.name,
        partNumber: equipment.partNumber || "",
        model: equipment.model || "",
        manufacturer: equipment.manufacturer || "",
        serialNumber: equipment.serialNumber || "",
        location: equipment.location,
        subLocation: equipment.subLocation || "",
        locationId: locationId,
        status: equipment.status,
        lastMaintenance: equipment.lastMaintenance ? new Date(equipment.lastMaintenance).toISOString().split('T')[0] : "",
        maintenanceInterval: equipment.maintenanceInterval,
      });
      
      setIsSparePartsMode(false);
    }
  }, [equipment, mode, locations]);

  useEffect(() => {
    if (mode === "edit" && sparePart) {
      setSparePartFormData({
        name: sparePart.name,
        serialNumber: sparePart.serialNumber || "",
        quantity: sparePart.quantity,
        manufacturer: sparePart.manufacturer || "",
        supplier: sparePart.supplier || "",
      });
      setIsSparePartsMode(true);
    }
  }, [sparePart, mode]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSparePartsMode) {
      // Spare parts mode
      if (!sparePartFormData.name) {
        toast(t("toast.error"), {
          description: "Please fill in the required fields (Name).",
        });
        return;
      }

      if (onSubmitSparePart) {
        if (mode === "edit" && sparePart) {
          onSubmitSparePart({
            ...sparePart,
            name: sparePartFormData.name,
            serialNumber: sparePartFormData.serialNumber,
            quantity: sparePartFormData.quantity,
            manufacturer: sparePartFormData.manufacturer,
            supplier: sparePartFormData.supplier,
          });
        } else {
          onSubmitSparePart({
            name: sparePartFormData.name,
            serialNumber: sparePartFormData.serialNumber,
            quantity: sparePartFormData.quantity,
            manufacturer: sparePartFormData.manufacturer,
            supplier: sparePartFormData.supplier,
          });
        }

        if (mode === "add") {
          setSparePartFormData({
            name: "",
            serialNumber: "",
            quantity: 0,
            manufacturer: "",
            supplier: "",
          });
        }
      }

      setOpen(false);
      toast(t("toast.success"), {
        description: mode === "edit" ? "Spare part updated successfully!" : "Spare part added successfully!",
      });
    } else {
      // Equipment mode
      if (!formData.name || !formData.location) {
        toast(t("toast.error"), {
          description: t("toast.fillRequired"),
        });
        return;
      }

      const lastDate = formData.lastMaintenance ? new Date(formData.lastMaintenance).toISOString() : undefined;
      const normalizedInterval = formData.maintenanceInterval 
        ? normalizeMaintenanceInterval(formData.maintenanceInterval)
        : undefined;
      
      if (mode === "edit" && equipment) {
        // Edit mode: preserve the equipment ID
        onSubmitEquipment({
          ...equipment,
          name: formData.name,
          partNumber: formData.partNumber,
          model: formData.model,
          manufacturer: formData.manufacturer,
          serialNumber: formData.serialNumber,
          location: formData.location,
          locationId: formData.locationId,
          subLocation: formData.subLocation,
          status: formData.status,
          lastMaintenance: lastDate,
          maintenanceInterval: normalizedInterval,
        });
      } else {
        // Add mode: create new equipment
        onSubmitEquipment({
          name: formData.name,
          partNumber: formData.partNumber,
          model: formData.model,
          manufacturer: formData.manufacturer,
          serialNumber: formData.serialNumber,
          location: formData.location,
          locationId: formData.locationId,
          subLocation: formData.subLocation,
          status: formData.status,
          lastMaintenance: lastDate,
          maintenanceInterval: normalizedInterval,
        });
      }

      if (mode === "add") {
        // Reset form only in add mode
        setFormData({
          name: "",
          partNumber: "",
          model: "",
          manufacturer: "",
          serialNumber: "",
          location: "",
          subLocation: "",
          locationId: "",
          status: "",
          lastMaintenance: "",
          maintenanceInterval: "",
        });
      }
      
      setOpen(false);

      toast(t("toast.success"), {
        description: mode === "edit" ? t("toast.equipmentUpdated") : t("toast.equipmentAdded"),
      });
    }
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
      <SheetContent side="right" className="p-4 overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {mode === "edit" 
              ? (isSparePartsMode ? "Edit Spare Part" : t("equipment.edit"))
              : (isSparePartsMode ? "Add Spare Part" : t("form.addNewEquipment"))
            }
          </SheetTitle>
        </SheetHeader>
        
        {mode === "add" && (
          <div className="mt-4 flex items-center gap-2 p-3 bg-muted rounded-md">
            <Switch
              id="spare-parts-toggle"
              checked={isSparePartsMode}
              onCheckedChange={setIsSparePartsMode}
            />
            <label htmlFor="spare-parts-toggle" className="text-sm font-medium cursor-pointer">
              {isSparePartsMode ? "Adding Spare Part" : "Adding Equipment"}
            </label>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">{isSparePartsMode ? (
          // Spare Parts Form
          <>
            <div className="flex flex-col gap-1">
              <Label htmlFor="sp-name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="sp-name"
                value={sparePartFormData.name}
                onChange={(e) => setSparePartFormData({ ...sparePartFormData, name: e.target.value })}
                placeholder="e.g., Air Filter"
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <Label htmlFor="sp-serialNumber">Serial Number</Label>
              <Input
                id="sp-serialNumber"
                value={sparePartFormData.serialNumber}
                onChange={(e) => setSparePartFormData({ ...sparePartFormData, serialNumber: e.target.value })}
                placeholder="e.g., SN-12345"
              />
            </div>

            <div className="flex flex-col gap-1">
              <Label htmlFor="sp-quantity">Quantity</Label>
              <Input
                id="sp-quantity"
                type="number"
                value={sparePartFormData.quantity}
                onChange={(e) => setSparePartFormData({ ...sparePartFormData, quantity: parseInt(e.target.value) || 0 })}
                placeholder="e.g., 10"
                min="0"
              />
            </div>

            <div className="flex flex-col gap-1">
              <Label htmlFor="sp-manufacturer">Manufacturer</Label>
              <Input
                id="sp-manufacturer"
                value={sparePartFormData.manufacturer}
                onChange={(e) => setSparePartFormData({ ...sparePartFormData, manufacturer: e.target.value })}
                placeholder="e.g., Acme Corp"
              />
            </div>

            <div className="flex flex-col gap-1">
              <Label htmlFor="sp-supplier">Supplier</Label>
              <Input
                id="sp-supplier"
                value={sparePartFormData.supplier}
                onChange={(e) => setSparePartFormData({ ...sparePartFormData, supplier: e.target.value })}
                placeholder="e.g., Parts Warehouse Inc."
              />
            </div>
          </>
        ) : (
          // Equipment Form
          <>
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
            <Label htmlFor="partNumber">Tag Number <span className="text-destructive">*</span></Label>
            <Input
              id="partNumber"
              value={formData.partNumber}
              onChange={(e) => setFormData({ ...formData, partNumber: e.target.value })}
              placeholder="e.g., TAG-001"
              required
            />
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
            <Label htmlFor="location">
              {t("form.location")} {t("form.required")}
            </Label>
            <Select 
              onValueChange={(value) => {
                const selectedLocation = locations.find(loc => loc.id === value);
                setFormData({ 
                  ...formData, 
                  locationId: value,
                  // Store the location name for validation and display
                  location: selectedLocation?.name || "",
                  // Reset sublocation when location changes
                  subLocation: ""
                });
              }} 
              value={formData.locationId}
              required
              disabled={loadingLocations || locations.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder={
                  loadingLocations ? "Loading locations..." : 
                  locations.length === 0 ? "No locations available" :
                  "Select Location"
                } />
              </SelectTrigger>
              <SelectContent>
                {locations.map((location) => {
                  const currentLang = t("lang");
                  const displayName = currentLang === "ar" 
                    ? (location.nameAr || location.name)  // Arabic mode: prefer Arabic, fallback to English
                    : location.name;                       // English mode: always show English
                  return (
                    <SelectItem key={location.id} value={location.id}>
                      <div className="flex flex-col items-start">
                        <span>{displayName}</span>
                        <span className="text-xs text-muted-foreground">{location.campus}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor="subLocation">
              {t("form.subLocation") || "Sub-location"} (Optional)
            </Label>
            <Input
              id="subLocation"
              value={formData.subLocation}
              onChange={(e) => setFormData({ ...formData, subLocation: e.target.value })}
              placeholder="e.g., Room 101, Lab A, Workshop"
              disabled={!formData.locationId}
            />
            <p className="text-xs text-muted-foreground">
              Specify a room or area within the location (optional)
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <Label htmlFor="maintenanceInterval">
                {t("form.maintenanceInterval")}
              </Label>
              <Input
                id="maintenanceInterval"
                value={formData.maintenanceInterval}
                onChange={(e) => setFormData({ ...formData, maintenanceInterval: e.target.value })}
                placeholder="e.g., 1 month, 3 months, 1 year"
              />
              <p className="text-xs text-muted-foreground">
                Examples: 1 week, 2 weeks, 1-12 months, 1 year
              </p>
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

          <div className="flex flex-col gap-1">
            <Label htmlFor="status">{t("form.status")}</Label>
            <Input
              id="status"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              placeholder="e.g., New Installation/Working"
            />
          </div>

          {/* Spare parts fields removed as status is derived and not stored */}

          </>
        )}

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
