"use client";

import { useState } from "react";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useSparePartOrders } from "@/hooks/useSparePartOrders";
import { useSelfProfile } from "@/hooks/useSelfProfile";
import { useLanguage } from "@/hooks/useLanguage";
import { SparePartOrder, SparePartOrderItem } from "@/lib/types";
import { toast } from "sonner";
import { Package, ChevronDown, ChevronUp, Calendar } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const Page = () => {
  const { t } = useLanguage();
  const { profile } = useSelfProfile();
  const { orders, loading, isUpdating, updateOrder, refresh } = useSparePartOrders();
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [editingOrder, setEditingOrder] = useState<SparePartOrder | null>(null);
  const [editedItems, setEditedItems] = useState<SparePartOrderItem[]>([]);
  const [technicianNotes, setTechnicianNotes] = useState("");
  const [supervisorNotes, setSupervisorNotes] = useState("");
  const [newStatus, setNewStatus] = useState("");

  const isSupervisor = profile?.role === "supervisor" || profile?.role === "admin" || profile?.role === "admin_x";
  const isTechnician = profile?.role === "technician" || profile?.role === "admin";

  const toggleExpand = (orderId: string) => {
    const newExpanded = new Set(expandedOrders);
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId);
    } else {
      newExpanded.add(orderId);
    }
    setExpandedOrders(newExpanded);
  };

  const handleEdit = (order: SparePartOrder) => {
    setEditingOrder(order);
    setEditedItems(order.items);
    setTechnicianNotes(order.technicianNotes || "");
    setSupervisorNotes(order.supervisorNotes || "");
    setNewStatus(order.status);
  };

  const handleUpdateItem = (index: number, field: keyof SparePartOrderItem, value: string | number) => {
    const newItems = [...editedItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setEditedItems(newItems);
  };

  const handleSaveChanges = async () => {
    if (!editingOrder) return;

    try {
      await updateOrder(
        editingOrder.id,
        newStatus,
        editedItems,
        isSupervisor ? supervisorNotes : editingOrder.supervisorNotes,
        isTechnician ? technicianNotes : editingOrder.technicianNotes
      );
      
      toast(t("common.success"), {
        description: t("orders.updateSuccess"),
      });
      
      setEditingOrder(null);
      refresh();
    } catch {
      toast(t("common.error"), {
        description: t("orders.updateError"),
      });
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "Pending Technician Action":
        return "default";
      case "Pending Supervisor Review":
        return "secondary";
      case "Completed":
      case "Approved":
        return "outline";
      default:
        return "default";
    }
  };

  const formatDate = (date?: string) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-6 py-8">
          <div className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-6 py-8">
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold">{t("orders.title")}</h1>
            <Button onClick={refresh} variant="outline">
              {t("common.refresh")}
            </Button>
          </div>

          {orders.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              {t("orders.noOrders")}
            </Card>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <Card key={order.id} className="p-4">
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <span className="font-semibold text-sm">
                            {t("orders.orderNumber")}: {order.id.slice(0, 8)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {formatDate(order.createdAt)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={getStatusBadgeVariant(order.status)}>
                          {order.status}
                        </Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleExpand(order.id)}
                        >
                          {expandedOrders.has(order.id) ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Items Summary */}
                    <div className="text-sm text-muted-foreground">
                      {order.items.length} {t("orders.items")}
                    </div>

                    {/* Expanded View */}
                    {expandedOrders.has(order.id) && (
                      <div className="pt-3 border-t space-y-3">
                        <div className="border rounded-lg overflow-hidden">
                          <table className="w-full text-sm">
                            <thead className="bg-muted/50">
                              <tr>
                                <th className="px-3 py-2 text-left text-xs font-medium">{t("orders.equipment")}</th>
                                <th className="px-3 py-2 text-left text-xs font-medium">{t("orders.sparePart")}</th>
                                <th className="px-3 py-2 text-left text-xs font-medium">{t("orders.requested")}</th>
                                <th className="px-3 py-2 text-left text-xs font-medium">{t("orders.supplied")}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {order.items.map((item, idx) => (
                                <tr key={idx} className="border-t">
                                  <td className="px-3 py-2">{item.equipmentName || "—"}</td>
                                  <td className="px-3 py-2">{item.sparePartName || "—"}</td>
                                  <td className="px-3 py-2">{item.quantityRequested}</td>
                                  <td className="px-3 py-2">{item.quantitySupplied || "—"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {order.supervisorNotes && (
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">{t("orders.supervisorNotes")}</Label>
                            <p className="text-sm">{order.supervisorNotes}</p>
                          </div>
                        )}

                        {order.technicianNotes && (
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">{t("orders.technicianNotes")}</Label>
                            <p className="text-sm">{order.technicianNotes}</p>
                          </div>
                        )}

                        <div className="flex gap-2">
                          {/* Technician actions */}
                          {isTechnician && order.status === "Pending Technician Action" && (
                            <Button size="sm" onClick={() => handleEdit(order)}>
                              {t("orders.updateOrder")}
                            </Button>
                          )}

                          {/* Supervisor actions */}
                          {isSupervisor && order.status === "Pending Supervisor Review" && (
                            <>
                              <Button size="sm" onClick={() => handleEdit(order)}>
                                {t("orders.review")}
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Edit Dialog */}
      <Dialog open={!!editingOrder} onOpenChange={(open) => !open && setEditingOrder(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("orders.editOrder")}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium">{t("orders.equipment")}</th>
                    <th className="px-3 py-2 text-left text-xs font-medium">{t("orders.sparePart")}</th>
                    <th className="px-3 py-2 text-left text-xs font-medium">{t("orders.requested")}</th>
                    <th className="px-3 py-2 text-left text-xs font-medium">{t("orders.supplied")}</th>
                  </tr>
                </thead>
                <tbody>
                  {editedItems.map((item, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="px-3 py-2">
                        <Input
                          value={item.equipmentName || ""}
                          onChange={(e) => handleUpdateItem(idx, "equipmentName", e.target.value)}
                          disabled={!isTechnician}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          value={item.sparePartName || ""}
                          onChange={(e) => handleUpdateItem(idx, "sparePartName", e.target.value)}
                          disabled={!isTechnician}
                        />
                      </td>
                      <td className="px-3 py-2">{item.quantityRequested}</td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          min="0"
                          value={item.quantitySupplied || ""}
                          onChange={(e) => handleUpdateItem(idx, "quantitySupplied", parseInt(e.target.value) || 0)}
                          disabled={!isTechnician}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {isTechnician && (
              <div className="space-y-2">
                <Label>{t("orders.technicianNotes")}</Label>
                <Textarea
                  value={technicianNotes}
                  onChange={(e) => setTechnicianNotes(e.target.value)}
                  rows={3}
                />
              </div>
            )}

            {isSupervisor && (
              <div className="space-y-2">
                <Label>{t("orders.supervisorNotes")}</Label>
                <Textarea
                  value={supervisorNotes}
                  onChange={(e) => setSupervisorNotes(e.target.value)}
                  rows={3}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>{t("orders.status")}</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {isTechnician && (
                    <SelectItem value="Pending Supervisor Review">
                      {t("orders.statusPendingSupervisorReview")}
                    </SelectItem>
                  )}
                  {isSupervisor && (
                    <>
                      <SelectItem value="Completed">{t("orders.statusCompleted")}</SelectItem>
                      <SelectItem value="Approved">{t("orders.statusApproved")}</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingOrder(null)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleSaveChanges} disabled={isUpdating}>
              {isUpdating ? t("common.saving") : t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Page;

