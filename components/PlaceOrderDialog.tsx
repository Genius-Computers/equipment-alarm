"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Equipment, SparePartOrderItem } from "@/lib/types";
import { useLanguage } from "@/hooks/useLanguage";
import { Trash2, ShoppingCart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface PlaceOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (items: SparePartOrderItem[], notes?: string) => Promise<void>;
  submitting?: boolean;
}

export default function PlaceOrderDialog({
  open,
  onOpenChange,
  onSubmit,
  submitting = false,
}: PlaceOrderDialogProps) {
  const { t } = useLanguage();
  const [step, setStep] = useState<"select" | "review">("select");
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState<Map<string, SparePartOrderItem>>(new Map());
  const [searchTerm, setSearchTerm] = useState("");
  const [supervisorNotes, setSupervisorNotes] = useState("");

  useEffect(() => {
    if (open) {
      fetchEquipment();
      setStep("select");
      setSelectedItems(new Map());
      setSupervisorNotes("");
      setSearchTerm("");
    }
  }, [open]);

  const fetchEquipment = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/equipment?all=true");
      if (res.ok) {
        const data = await res.json();
        setEquipment(data?.data || []);
      }
    } catch (error) {
      console.error("Failed to load equipment:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredEquipment = equipment.filter((eq) =>
    eq.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    eq.serialNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    eq.location?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleToggleEquipment = (eq: Equipment) => {
    const newMap = new Map(selectedItems);
    const key = eq.id;
    
    if (newMap.has(key)) {
      newMap.delete(key);
    } else {
      newMap.set(key, {
        equipmentId: eq.id,
        equipmentName: eq.name,
        sparePartName: "",
        quantityRequested: 1,
      });
    }
    
    setSelectedItems(newMap);
  };

  const handleUpdateItem = (key: string, field: keyof SparePartOrderItem, value: string | number) => {
    const newMap = new Map(selectedItems);
    const item = newMap.get(key);
    if (item) {
      newMap.set(key, { ...item, [field]: value });
      setSelectedItems(newMap);
    }
  };

  const handleRemoveItem = (key: string) => {
    const newMap = new Map(selectedItems);
    newMap.delete(key);
    setSelectedItems(newMap);
  };

  const handleNext = () => {
    if (selectedItems.size === 0) {
      alert(t("orders.selectAtLeastOne"));
      return;
    }
    setStep("review");
  };

  const handleSubmit = async () => {
    const items = Array.from(selectedItems.values());
    await onSubmit(items, supervisorNotes);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              {step === "select" ? t("orders.placeOrder") : t("orders.reviewOrder")}
            </div>
          </DialogTitle>
        </DialogHeader>

        {step === "select" && (
          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              <Label>{t("orders.searchEquipment")}</Label>
              <Input
                placeholder={t("orders.searchPlaceholder")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="border rounded-lg p-2 max-h-96 overflow-y-auto">
              {loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : filteredEquipment.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {t("orders.noEquipmentFound")}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredEquipment.map((eq) => (
                    <div
                      key={eq.id}
                      className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50"
                    >
                      <Checkbox
                        checked={selectedItems.has(eq.id)}
                        onCheckedChange={() => handleToggleEquipment(eq)}
                      />
                      <div className="flex-1">
                        <div className="font-medium">{eq.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {eq.serialNumber && <span>SN: {eq.serialNumber} • </span>}
                          {eq.location && <span>{eq.location}</span>}
                          {eq.subLocation && <span> / {eq.subLocation}</span>}
                        </div>
                        
                        {selectedItems.has(eq.id) && (
                          <div className="mt-2 space-y-2">
                            <div className="flex flex-col gap-1">
                              <Label className="text-xs">{t("orders.sparePartName")} ({t("common.optional")})</Label>
                              <Input
                                size={1}
                                placeholder={t("orders.sparePartNamePlaceholder")}
                                value={selectedItems.get(eq.id)?.sparePartName || ""}
                                onChange={(e) => handleUpdateItem(eq.id, "sparePartName", e.target.value)}
                              />
                            </div>
                            <div className="flex flex-col gap-1">
                              <Label className="text-xs">{t("orders.quantity")}</Label>
                              <Input
                                type="number"
                                size={1}
                                min="1"
                                value={selectedItems.get(eq.id)?.quantityRequested || 1}
                                onChange={(e) => handleUpdateItem(eq.id, "quantityRequested", parseInt(e.target.value) || 1)}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {selectedItems.size > 0 && (
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="text-sm font-medium">
                  {t("orders.itemsSelected", { count: selectedItems.size })}
                </span>
                <Badge variant="secondary">{selectedItems.size}</Badge>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {t("common.cancel")}
              </Button>
              <Button onClick={handleNext} disabled={selectedItems.size === 0}>
                {t("common.next")}
              </Button>
            </div>
          </div>
        )}

        {step === "review" && (
          <div className="space-y-4">
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium">{t("orders.equipment")}</th>
                    <th className="px-3 py-2 text-left text-xs font-medium">{t("orders.sparePart")}</th>
                    <th className="px-3 py-2 text-left text-xs font-medium">{t("orders.quantity")}</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from(selectedItems.entries()).map(([key, item]) => (
                    <tr key={key} className="border-t">
                      <td className="px-3 py-2">{item.equipmentName}</td>
                      <td className="px-3 py-2">{item.sparePartName || "—"}</td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          min="1"
                          className="w-20"
                          value={item.quantityRequested}
                          onChange={(e) => handleUpdateItem(key, "quantityRequested", parseInt(e.target.value) || 1)}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveItem(key)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-2">
              <Label>{t("orders.notes")} ({t("common.optional")})</Label>
              <Textarea
                placeholder={t("orders.notesPlaceholder")}
                value={supervisorNotes}
                onChange={(e) => setSupervisorNotes(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex justify-between gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setStep("select")}>
                {t("common.back")}
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  {t("common.cancel")}
                </Button>
                <Button onClick={handleSubmit} disabled={submitting || selectedItems.size === 0}>
                  {submitting ? t("orders.submitting") : t("orders.submitOrder")}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

