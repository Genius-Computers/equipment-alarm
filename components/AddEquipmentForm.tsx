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
import { VALID_CAMPUSES } from "@/lib/config";

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
  const [subLocationFilter, setSubLocationFilter] = useState("");
  const [isCustomSubLocation, setIsCustomSubLocation] = useState(false);
  const [customSubLocation, setCustomSubLocation] = useState("");
  const [customSubLocations, setCustomSubLocations] = useState<string[]>([]);
  const [loadingSubLocations, setLoadingSubLocations] = useState(false);
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
        location: equipment.location,
        subLocation: equipment.subLocation || "",
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

  // Update form data when equipment or spare part changes (for edit mode)
  useEffect(() => {
    if (mode === "edit" && equipment) {
      setFormData({
        name: equipment.name,
        partNumber: equipment.partNumber || "",
        model: equipment.model || "",
        manufacturer: equipment.manufacturer || "",
        serialNumber: equipment.serialNumber || "",
        location: equipment.location,
        subLocation: equipment.subLocation || "",
        status: equipment.status,
        lastMaintenance: equipment.lastMaintenance ? new Date(equipment.lastMaintenance).toISOString().split('T')[0] : "",
        maintenanceInterval: equipment.maintenanceInterval,
      });
      
      // In edit mode, check if the current sublocation is in the fetched list
      // For now, just set the sublocation value
      setIsCustomSubLocation(false);
      setCustomSubLocation("");
      
      setIsSparePartsMode(false);
    }
  }, [equipment, mode]);

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

  // Fetch sublocations from the locations table when location changes
  useEffect(() => {
    const fetchCustomSubLocations = async () => {
      if (!formData.location) {
        setCustomSubLocations([]);
        return;
      }

      setLoadingSubLocations(true);
      try {
        // Fetch from locations API instead of equipment sublocations
        const response = await fetch(`/api/locations?campus=${encodeURIComponent(formData.location)}`);
        if (response.ok) {
          const data = await response.json();
          const locations = data.data || [];
          const fetchedLocations = locations.map((loc: { name: string }) => loc.name);
          setCustomSubLocations(fetchedLocations);
          
          // In edit mode, check if current sublocation is in the fetched list
          if (mode === "edit" && equipment && equipment.subLocation) {
            const isInList = fetchedLocations.includes(equipment.subLocation);
            if (!isInList) {
              setIsCustomSubLocation(true);
              setCustomSubLocation(equipment.subLocation);
            }
          }
        } else {
          // If API fails (e.g., invalid campus), clear the list
          setCustomSubLocations([]);
        }
      } catch (error) {
        console.error('Failed to fetch sublocations:', error);
        setCustomSubLocations([]);
      } finally {
        setLoadingSubLocations(false);
      }
    };

    void fetchCustomSubLocations();
  }, [formData.location, mode, equipment]);

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
      
      // Use custom sublocation if custom is selected, otherwise use the selected value
      const finalSubLocation = isCustomSubLocation ? customSubLocation : formData.subLocation;
      
      // If sublocation was entered (custom or selected), ensure it exists in locations table
      if (finalSubLocation && finalSubLocation.trim() && formData.location) {
        try {
          await fetch('/api/locations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              campus: formData.location,
              name: finalSubLocation.trim(),
            }),
          });
          // Ignore errors - location might already exist (409) which is fine
        } catch (error) {
          console.log('Location might already exist:', error);
        }
      }
      
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
          subLocation: finalSubLocation,
          status: formData.status,
          lastMaintenance: lastDate,
          maintenanceInterval: formData.maintenanceInterval || undefined,
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
          subLocation: finalSubLocation,
          status: formData.status,
          lastMaintenance: lastDate,
          maintenanceInterval: formData.maintenanceInterval || undefined,
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
          status: "",
          lastMaintenance: "",
          maintenanceInterval: "",
        });
        setIsCustomSubLocation(false);
        setCustomSubLocation("");
        setSubLocationFilter("");
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
            <Label htmlFor="partNumber">Tag Number</Label>
            <Input
              id="partNumber"
              value={formData.partNumber}
              onChange={(e) => setFormData({ ...formData, partNumber: e.target.value })}
              placeholder="e.g., TAG-001"
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
                setFormData({ ...formData, location: value, subLocation: "" });
                // Reset sublocation related state when location changes
                setIsCustomSubLocation(false);
                setCustomSubLocation("");
                setSubLocationFilter("");
              }} 
              value={formData.location}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Campus" />
              </SelectTrigger>
              <SelectContent>
                {VALID_CAMPUSES.map((campus) => (
                  <SelectItem key={campus} value={campus}>
                    {campus}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor="subLocation">
              {t("form.subLocation") || "Sub-location"}
            </Label>
            <Select 
              onValueChange={(value) => {
                if (value === "__custom__") {
                  setIsCustomSubLocation(true);
                  setFormData({ ...formData, subLocation: "" });
                } else {
                  setIsCustomSubLocation(false);
                  setCustomSubLocation("");
                  setFormData({ ...formData, subLocation: value });
                }
              }} 
              value={isCustomSubLocation ? "__custom__" : formData.subLocation}
              disabled={!formData.location || loadingSubLocations}
            >
              <SelectTrigger>
                <SelectValue placeholder={
                  !formData.location 
                    ? "Select location first" 
                    : loadingSubLocations 
                    ? "Loading sub-locations..." 
                    : "Select sub-location"
                } />
              </SelectTrigger>
              <SelectContent>
                <div className="p-2">
                  <Input
                    value={subLocationFilter}
                    onChange={(e) => setSubLocationFilter(e.target.value)}
                    placeholder="Type to filter sub-locations..."
                    className="h-8"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                <SelectItem value="__custom__">Custom sub-location</SelectItem>
                {(() => {
                  // Use only sublocations from locations table
                  return customSubLocations
                    .filter((subLoc) => {
                      const q = subLocationFilter.trim().toLowerCase();
                      if (!q) return true;
                      return subLoc.toLowerCase().includes(q);
                    })
                    .sort()
                    .map((subLoc) => (
                      <SelectItem key={subLoc} value={subLoc}>
                        {subLoc}
                      </SelectItem>
                    ));
                })()}
              </SelectContent>
            </Select>
          </div>

          {isCustomSubLocation && (
            <div className="flex flex-col gap-1">
              <Label htmlFor="customSubLocation">
                Custom Sub-location
              </Label>
              <Input
                id="customSubLocation"
                value={customSubLocation}
                onChange={(e) => setCustomSubLocation(e.target.value)}
                placeholder="Enter custom sub-location"
              />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <Label htmlFor="maintenanceInterval">
                {t("form.maintenanceInterval")}
              </Label>
              <Select onValueChange={(value) => setFormData({ ...formData, maintenanceInterval: value })} value={formData.maintenanceInterval}>
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
