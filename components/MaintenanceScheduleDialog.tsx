import { useState } from "react";
import { Calendar, Plus, Wrench, ClipboardList, Package } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/hooks/useLanguage";
import { toast } from "sonner";

interface MaintenanceScheduleDialogProps {
  equipmentId: string;
  equipmentName: string;
}

const MaintenanceScheduleDialog = ({ equipmentId, equipmentName }: MaintenanceScheduleDialogProps) => {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [needsNewSparePart, setNeedsNewSparePart] = useState(false);
  const [sparePartRequests, setSparePartRequests] = useState<Array<{
    id: string;
    partName: string;
    partNumber: string;
    description: string;
    quantity: number;
    estimatedPrice: number;
    supplier: string;
    urgency: string;
  }>>([]);
  const [currentRequest, setCurrentRequest] = useState<{
    partName?: string;
    partNumber?: string;
    description?: string;
    quantity?: number;
    estimatedPrice?: number;
    supplier?: string;
    urgency?: string;
  }>({ urgency: "medium" });

  const handleSchedule = () => {
    toast("Maintenance Scheduled", {
      description: `Maintenance has been scheduled for ${equipmentName} with detailed assessment.`,
    });
    setIsOpen(false);
  };

  const addSparePartRequest = () => {
    if (!currentRequest.partName || !currentRequest.quantity) {
      toast(t("toast.error"), {
        description: t("spareDialog.fillNameQty"),
      });
      return;
    }
    const newItem = {
      id: Date.now().toString(),
      partName: currentRequest.partName || "",
      partNumber: currentRequest.partNumber || "",
      description: currentRequest.description || "",
      quantity: currentRequest.quantity || 1,
      estimatedPrice: currentRequest.estimatedPrice || 0,
      supplier: currentRequest.supplier || "",
      urgency: currentRequest.urgency || "medium",
    };
    setSparePartRequests(prev => [...prev, newItem]);
    setCurrentRequest({ urgency: currentRequest.urgency || "medium" });
    toast(t("spareDialog.addedTitle"), { description: t("spareDialog.addedDesc") });
  };

  const removeSparePartRequest = (id: string) => {
    setSparePartRequests(prev => prev.filter(item => item.id !== id));
  };

  const totalEstimated = sparePartRequests.reduce((sum, it) => sum + (it.estimatedPrice * it.quantity), 0);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button size="sm">
            <Calendar className="h-4 w-4 mr-1 rtl:mr-0 rtl:ml-1" />
            {t("equipment.scheduleMaintenance")}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-h-[90vh] min-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-primary" />
              {t("maintenanceDialog.title", { name: equipmentName })}
            </DialogTitle>
            <DialogDescription>{t("alert.scheduleOverview")}</DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Basic Scheduling */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  {t("maintenanceDialog.scheduleDetails")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="scheduledDate">{t("maintenanceDialog.scheduledDate")}</Label>
                    <Input id="scheduledDate" type="date" />
                  </div>
                  <div>
                    <Label htmlFor="scheduledTime">{t("maintenanceDialog.scheduledTime")}</Label>
                    <Input id="scheduledTime" type="time" />
                  </div>
                </div>

                <div>
                  <Label htmlFor="estimatedDuration">{t("maintenanceDialog.estimatedDuration")}</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder={t("maintenanceDialog.selectDuration")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0.5">{t("maintenanceDialog.duration.30m")}</SelectItem>
                      <SelectItem value="1">{t("maintenanceDialog.duration.1h")}</SelectItem>
                      <SelectItem value="2">{t("maintenanceDialog.duration.2h")}</SelectItem>
                      <SelectItem value="4">{t("maintenanceDialog.duration.4h")}</SelectItem>
                      <SelectItem value="8">{t("maintenanceDialog.duration.8h")}</SelectItem>
                      <SelectItem value="custom">{t("maintenanceDialog.duration.custom")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="priority">{t("maintenanceDialog.priority")}</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder={t("maintenanceDialog.selectPriority")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">{t("priority.low")}</SelectItem>
                      <SelectItem value="medium">{t("priority.medium")}</SelectItem>
                      <SelectItem value="high">{t("priority.high")}</SelectItem>
                      <SelectItem value="urgent">{t("priority.urgent")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Problem Assessment */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-muted-foreground" />
                  {t("maintenanceDialog.problemAssessment")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="problem">{t("maintenanceDialog.problemDescription")}</Label>
                  <Textarea
                    id="problem"
                    placeholder={t("maintenanceDialog.problemPlaceholder")}
                    className="min-h-[100px]"
                  />
                </div>

                <div>
                  <Label htmlFor="assessment">{t("maintenanceDialog.technicalAssessment")}</Label>
                  <Textarea
                    id="assessment"
                    placeholder={t("maintenanceDialog.technicalAssessmentPlaceholder")}
                    className="min-h-[100px]"
                  />
                </div>

                <div>
                  <Label htmlFor="recommendation">{t("maintenanceDialog.recommendation")}</Label>
                  <Textarea
                    id="recommendation"
                    placeholder={t("maintenanceDialog.recommendationPlaceholder")}
                    className="min-h-[100px]"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Spare Parts Requirements */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  {t("maintenanceDialog.sparePartsSection")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="needsSpareParts"
                    checked={needsNewSparePart}
                    onCheckedChange={(checked) => setNeedsNewSparePart(checked === true)}
                  />
                  <Label htmlFor="needsSpareParts">{t("maintenanceDialog.requiresSpareParts")}</Label>
                </div>

                {needsNewSparePart && (
                  <div className="bg-muted/40 p-4 rounded-lg space-y-4">
                    <p className="text-sm text-muted-foreground">{t("maintenanceDialog.sparePartsInfo")}</p>

                    {/* Inline add form */}
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                      <div className="md:col-span-2">
                        <Label htmlFor="partName">{t("spareDialog.partName")}</Label>
                        <Input id="partName" placeholder={t("spareDialog.partNamePlaceholder")} value={currentRequest.partName || ""} onChange={(e) => setCurrentRequest(prev => ({ ...prev, partName: e.target.value }))} />
                      </div>
                      <div>
                        <Label htmlFor="partNumber">{t("spareDialog.partNumber")}</Label>
                        <Input id="partNumber" placeholder={t("spareDialog.partNumberPlaceholder")} value={currentRequest.partNumber || ""} onChange={(e) => setCurrentRequest(prev => ({ ...prev, partNumber: e.target.value }))} />
                      </div>
                      <div>
                        <Label htmlFor="quantity">{t("spareDialog.quantity")}</Label>
                        <Input id="quantity" type="number" min="1" placeholder="1" value={currentRequest.quantity ?? ""} onChange={(e) => setCurrentRequest(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))} />
                      </div>
                      <div>
                        <Label htmlFor="estimatedPrice">{t("spareDialog.estimatedPriceSar")}</Label>
                        <Input id="estimatedPrice" type="number" step="0.01" placeholder="0.00" value={currentRequest.estimatedPrice ?? ""} onChange={(e) => setCurrentRequest(prev => ({ ...prev, estimatedPrice: parseFloat(e.target.value) || 0 }))} />
                      </div>
                      <div>
                        <Label htmlFor="urgency">{t("spareDialog.urgencyLabel")}</Label>
                        <Select value={currentRequest.urgency || "medium"} onValueChange={(value) => setCurrentRequest(prev => ({ ...prev, urgency: value }))}>
                          <SelectTrigger>
                            <SelectValue placeholder={t("spareDialog.selectUrgency")} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">{t("spareDialog.urgency.low")}</SelectItem>
                            <SelectItem value="medium">{t("spareDialog.urgency.medium")}</SelectItem>
                            <SelectItem value="high">{t("spareDialog.urgency.high")}</SelectItem>
                            <SelectItem value="urgent">{t("spareDialog.urgency.urgent")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="description">{t("spareDialog.description")}</Label>
                      <Textarea id="description" placeholder={t("spareDialog.descriptionPlaceholder")} value={currentRequest.description || ""} onChange={(e) => setCurrentRequest(prev => ({ ...prev, description: e.target.value }))} />
                    </div>

                    <div>
                      <Label htmlFor="supplier">{t("spareDialog.supplierLabel")}</Label>
                      <Input id="supplier" placeholder={t("spareDialog.supplierPlaceholder")} value={currentRequest.supplier || ""} onChange={(e) => setCurrentRequest(prev => ({ ...prev, supplier: e.target.value }))} />
                    </div>

                    <div className="flex justify-end">
                      <Button onClick={addSparePartRequest}>
                        <Plus className="h-4 w-4 mr-1 rtl:mr-0 rtl:ml-1" />
                        {t("spareDialog.addToList")}
                      </Button>
                    </div>

                    {/* Table of requested parts */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/60">
                          <tr>
                            <th className="text-left p-2">{t("spareDialog.partName")}</th>
                            <th className="text-left p-2">{t("spareDialog.partNumber")}</th>
                            <th className="text-left p-2">{t("spareDialog.quantity")}</th>
                            <th className="text-left p-2">{t("spareDialog.estimatedPriceSar")}</th>
                            <th className="text-left p-2">{t("spareDialog.urgencyLabel")}</th>
                            <th className="text-left p-2">{t("spareDialog.supplierLabel")}</th>
                            <th className="text-left p-2"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {sparePartRequests.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="p-6 text-center text-muted-foreground">
                                {t("spareDialog.empty.title")}
                              </td>
                            </tr>
                          ) : (
                            sparePartRequests.map((req) => (
                              <tr key={req.id} className="border-b">
                                <td className="p-2 font-medium">{req.partName}</td>
                                <td className="p-2">{req.partNumber || "-"}</td>
                                <td className="p-2">{req.quantity}</td>
                                <td className="p-2">{req.estimatedPrice.toFixed(2)} SAR</td>
                                <td className="p-2 capitalize">{req.urgency}</td>
                                <td className="p-2">{req.supplier || "-"}</td>
                                <td className="p-2 text-right">
                                  <Button size="sm" variant="destructive" onClick={() => removeSparePartRequest(req.id)}>
                                    {t("spareDialog.remove")}
                                  </Button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                        <tfoot>
                          <tr>
                            <td colSpan={3} />
                            <td className="p-2 font-semibold">{t("spareDialog.totalEstimatedSar", { amount: totalEstimated.toFixed(2) })}</td>
                            <td colSpan={3} />
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}

                <div>
                  <Label htmlFor="existingSpareParts">{t("maintenanceDialog.existingSpareParts")}</Label>
                  <Textarea
                    id="existingSpareParts"
                    placeholder={t("maintenanceDialog.existingSparePartsPlaceholder")}
                  />
                </div>
              </CardContent>
            </Card>

            <DialogFooter>
              <Button onClick={handleSchedule} className="flex-1">
                <Wrench className="h-4 w-4 mr-1 rtl:mr-0 rtl:ml-1" />
                {t("maintenanceDialog.scheduleButton")}
              </Button>
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                {t("form.cancel")}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Spare parts table is now inline above */}
    </>
  );
};

export default MaintenanceScheduleDialog;
