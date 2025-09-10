import { useState } from "react";
import { Plus, Package } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useLanguage } from "@/hooks/useLanguage";
import { toast } from "sonner";

interface SparePartRequest {
  id: string;
  partName: string;
  partNumber: string;
  description: string;
  quantity: number;
  estimatedPrice: number;
  supplier: string;
  urgency: string;
}

interface SparePartRequestDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  equipmentId: string;
  equipmentName: string;
}

const SparePartRequestDialog = ({ isOpen, onOpenChange, equipmentId, equipmentName }: SparePartRequestDialogProps) => {
  const { t } = useLanguage();
  const [sparePartRequests, setSparePartRequests] = useState<SparePartRequest[]>([]);
  const [currentRequest, setCurrentRequest] = useState<Partial<SparePartRequest>>({});

  const addSparePartRequest = () => {
    if (!currentRequest.partName || !currentRequest.quantity) {
      toast(t("toast.error"), {
        description: t("spareDialog.fillNameQty"),
      });
      return;
    }

    const newRequest: SparePartRequest = {
      id: Date.now().toString(),
      partName: currentRequest.partName || "",
      partNumber: currentRequest.partNumber || "",
      description: currentRequest.description || "",
      quantity: currentRequest.quantity || 1,
      estimatedPrice: currentRequest.estimatedPrice || 0,
      supplier: currentRequest.supplier || "",
      urgency: currentRequest.urgency || "medium"
    };

    setSparePartRequests(prev => [...prev, newRequest]);
    setCurrentRequest({});
    
    toast(t("spareDialog.addedTitle"),{
      description: t("spareDialog.addedDesc"),
    });
  };

  const removeSparePartRequest = (id: string) => {
    setSparePartRequests(prev => prev.filter(req => req.id !== id));
  };

  const submitAllRequests = () => {
    if (sparePartRequests.length === 0) {
      toast(t("spareDialog.noRequestsTitle"),{
        description: t("spareDialog.noRequestsDesc"),
      });
      return;
    }

    toast(t("spareDialog.submittedTitle"),{
      description: t("spareDialog.submittedDesc", { count: sparePartRequests.length, name: equipmentName }),
    });
    
    setSparePartRequests([]);
    onOpenChange(false);
  };

  const getTotalEstimatedCost = () => {
    return sparePartRequests.reduce((total, req) => total + (req.estimatedPrice * req.quantity), 0);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("spareDialog.title", { name: equipmentName })}</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Add New Spare Part Request */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Plus className="h-5 w-5 mr-2 rtl:mr-0 rtl:ml-2" />
                {t("spareDialog.addTitle")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="partName">{t("spareDialog.partName")} *</Label>
                <Input 
                  id="partName" 
                  placeholder={t("spareDialog.partNamePlaceholder")}
                  value={currentRequest.partName || ""}
                  onChange={(e) => setCurrentRequest(prev => ({ ...prev, partName: e.target.value }))}
                />
              </div>
              
              <div>
                <Label htmlFor="partNumber">{t("spareDialog.partNumber")}</Label>
                <Input 
                  id="partNumber" 
                  placeholder={t("spareDialog.partNumberPlaceholder")}
                  value={currentRequest.partNumber || ""}
                  onChange={(e) => setCurrentRequest(prev => ({ ...prev, partNumber: e.target.value }))}
                />
              </div>
              
              <div>
                <Label htmlFor="description">{t("spareDialog.description")}</Label>
                <Textarea 
                  id="description" 
                  placeholder={t("spareDialog.descriptionPlaceholder")}
                  value={currentRequest.description || ""}
                  onChange={(e) => setCurrentRequest(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="quantity">{t("spareDialog.quantity")} *</Label>
                  <Input 
                    id="quantity" 
                    type="number" 
                    min="1"
                    placeholder="1"
                    value={currentRequest.quantity || ""}
                    onChange={(e) => setCurrentRequest(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                  />
                </div>
                <div>
                  <Label htmlFor="estimatedPrice">{t("spareDialog.estimatedPriceSar")}</Label>
                  <Input 
                    id="estimatedPrice" 
                    type="number" 
                    step="0.01"
                    placeholder="0.00"
                    value={currentRequest.estimatedPrice || ""}
                    onChange={(e) => setCurrentRequest(prev => ({ ...prev, estimatedPrice: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="supplier">{t("spareDialog.supplierLabel")}</Label>
                <Input 
                  id="supplier" 
                  placeholder={t("spareDialog.supplierPlaceholder")}
                  value={currentRequest.supplier || ""}
                  onChange={(e) => setCurrentRequest(prev => ({ ...prev, supplier: e.target.value }))}
                />
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
              
              <Button onClick={addSparePartRequest} className="w-full">
                <Plus className="h-4 w-4 mr-1 rtl:mr-0 rtl:ml-1" />
                {t("spareDialog.addToList")}
              </Button>
            </CardContent>
          </Card>

          {/* Current Requests List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                <div className="flex items-center">
                  <Package className="h-5 w-5 mr-2 rtl:mr-0 rtl:ml-2" />
                  {t("spareDialog.requestedParts")} ({sparePartRequests.length})
                </div>
                {sparePartRequests.length > 0 && (
                  <div className="text-sm font-normal">
                    {t("spareDialog.totalSar", { amount: getTotalEstimatedCost().toFixed(2) })}
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sparePartRequests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>{t("spareDialog.empty.title")}</p>
                  <p className="text-sm">{t("spareDialog.empty.subtitle")}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {sparePartRequests.map((request, index) => (
                    <div key={request.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{request.partName}</h4>
                        <Button 
                          size="sm" 
                          variant="destructive" 
                          onClick={() => removeSparePartRequest(request.id)}
                        >
                          {t("spareDialog.remove")}
                        </Button>
                      </div>
                      {request.partNumber && (
                        <p className="text-sm text-muted-foreground">{t("spareDialog.partNumberShort")} {request.partNumber}</p>
                      )}
                      {request.description && (
                        <p className="text-sm">{request.description}</p>
                      )}
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>{t("spareDialog.qtyShort")} {request.quantity}</div>
                        <div>{t("spareDialog.priceShort")} {request.estimatedPrice.toFixed(2)} SAR</div>
                      </div>
                      <div className="text-sm">
                        <span className="text-muted-foreground">{t("spareDialog.urgencyShort")} </span>
                        <span className={`capitalize ${
                          request.urgency === 'urgent' ? 'text-red-600' : 
                          request.urgency === 'high' ? 'text-orange-600' : 
                          request.urgency === 'medium' ? 'text-blue-600' : 'text-green-600'
                        }`}>
                          {request.urgency}
                        </span>
                      </div>
                      {request.supplier && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">{t("spareDialog.supplierShort")} </span>
                          {request.supplier}
                        </div>
                      )}
                    </div>
                  ))}
                  
                  <Separator />
                  
                  <div className="flex justify-between items-center pt-4">
                    <div className="text-lg font-semibold">
                      {t("spareDialog.totalEstimatedSar", { amount: getTotalEstimatedCost().toFixed(2) })}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex gap-3 pt-6 border-t">
          <Button onClick={submitAllRequests} className="flex-1" disabled={sparePartRequests.length === 0}>
            {t("spareDialog.submitAll")}
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("form.cancel")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SparePartRequestDialog;