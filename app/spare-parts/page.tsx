"use client";
import Header from "@/components/Header";
import SparePartsFilters from "@/components/SparePartsFilters";
import SparePartsTable from "@/components/SparePartsTable";
import { useSpareParts } from "@/hooks/useSpareParts";
import CustomPagination from "@/components/CustomPagination";
import { SparePart, SparePartOrderItem } from "@/lib/types";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Plus, ShoppingCart } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import SparePartsCSVImport from "@/components/SparePartsCSVImport";
import SparePartsCSVExport from "@/components/SparePartsCSVExport";
import PlaceOrderDialog from "@/components/PlaceOrderDialog";
import { useLanguage } from "@/hooks/useLanguage";
import { useSelfProfile } from "@/hooks/useSelfProfile";
import { useSparePartOrders } from "@/hooks/useSparePartOrders";
import { useRouter } from "next/navigation";

const Page = () => {
  const { t } = useLanguage();
  const router = useRouter();
  const { profile } = useSelfProfile();
  const {
    filteredSpareParts,
    loading,
    error,
    isUpdating,
    isInserting,
    page,
    pageSize,
    total,
    searchTerm,
    setSearchTerm,
    setPage,
    refresh,
    addSparePart,
    updateSparePart,
    deleteSparePart,
  } = useSpareParts();
  const { createOrder, isCreating } = useSparePartOrders();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    serialNumber: "",
    quantity: 0,
    manufacturer: "",
    supplier: "",
  });

  const isSupervisor = profile?.role === "supervisor" || profile?.role === "admin" || profile?.role === "admin_x";

  const handleAddSparePart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      toast(t("common.error"), {
        description: t("spareParts.nameRequired"),
      });
      return;
    }
    try {
      await addSparePart({
        name: formData.name,
        serialNumber: formData.serialNumber,
        quantity: formData.quantity,
        manufacturer: formData.manufacturer,
        supplier: formData.supplier,
      });
      setFormData({ name: "", serialNumber: "", quantity: 0, manufacturer: "", supplier: "" });
      setIsFormOpen(false);
      toast(t("common.success"), {
        description: t("spareParts.addSuccess"),
      });
    } catch {
      toast(t("common.error"), {
        description: t("spareParts.addError"),
      });
    }
  };

  const handleUpdateSparePart = async (sparePart: SparePart | Omit<SparePart, "id">) => {
    try {
      await updateSparePart(sparePart as SparePart);
      toast(t("common.success"), {
        description: t("spareParts.updateSuccess"),
      });
    } catch {
      toast(t("common.error"), {
        description: t("spareParts.updateError"),
      });
    }
  };

  const handleDeleteSparePart = async (id: string) => {
    if (!confirm(t("spareParts.deleteConfirm"))) {
      return;
    }
    try {
      await deleteSparePart(id);
      toast(t("common.success"), {
        description: t("spareParts.deleteSuccess"),
      });
    } catch {
      toast(t("common.error"), {
        description: t("spareParts.deleteError"),
      });
    }
  };

  const handlePlaceOrder = async (items: SparePartOrderItem[], notes?: string) => {
    try {
      await createOrder(items, notes);
      toast(t("common.success"), {
        description: t("orders.createSuccess"),
      });
      setIsOrderDialogOpen(false);
      router.push("/spare-parts/orders");
    } catch {
      toast(t("common.error"), {
        description: t("orders.createError"),
      });
    }
  };


  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-6 py-8">
          <div className="space-y-6">
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h1 className="text-3xl font-bold">{t("spareParts.title")}</h1>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => router.push("/spare-parts/orders")}>
                  <ShoppingCart className="h-4 w-4 mr-2 rtl:mr-0 rtl:ml-2" />
                  {t("orders.viewOrders")}
                </Button>
                {isSupervisor && (
                  <Button onClick={() => setIsOrderDialogOpen(true)} disabled={isCreating}>
                    <ShoppingCart className="h-4 w-4 mr-2 rtl:mr-0 rtl:ml-2" />
                    {t("orders.placeOrder")}
                  </Button>
                )}
                <Sheet open={isFormOpen} onOpenChange={setIsFormOpen}>
              <SheetTrigger asChild>
                <Button disabled={isInserting}>
                  <Plus className="h-4 w-4 mr-2 rtl:mr-0 rtl:ml-2" />
                  {t("spareParts.addSparePart")}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="p-4 overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>{t("spareParts.addSparePart")}</SheetTitle>
                </SheetHeader>
                <form onSubmit={handleAddSparePart} className="mt-4 space-y-4">
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="sp-name">
                      {t("spareParts.name")} <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="sp-name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder={t("spareParts.namePlaceholder")}
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <Label htmlFor="sp-serialNumber">{t("spareParts.serialNumber")}</Label>
                    <Input
                      id="sp-serialNumber"
                      value={formData.serialNumber}
                      onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                      placeholder={t("spareParts.serialNumberPlaceholder")}
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <Label htmlFor="sp-quantity">{t("spareParts.quantity")}</Label>
                    <Input
                      id="sp-quantity"
                      type="number"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                      placeholder={t("spareParts.quantityPlaceholder")}
                      min="0"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <Label htmlFor="sp-manufacturer">{t("spareParts.manufacturer")}</Label>
                    <Input
                      id="sp-manufacturer"
                      value={formData.manufacturer}
                      onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                      placeholder={t("spareParts.manufacturerPlaceholder")}
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <Label htmlFor="sp-supplier">{t("spareParts.supplier")}</Label>
                    <Input
                      id="sp-supplier"
                      value={formData.supplier}
                      onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                      placeholder={t("spareParts.supplierPlaceholder")}
                    />
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button type="submit" disabled={isInserting}>
                      {isInserting && <span className="mr-2 rtl:mr-0 rtl:ml-2">{t("spareParts.adding")}</span>}
                      {!isInserting && t("spareParts.addSparePart")}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                      {t("common.cancel")}
                    </Button>
                  </div>
                </form>
              </SheetContent>
            </Sheet>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <SparePartsCSVExport items={filteredSpareParts} />
              <SparePartsCSVImport onImported={refresh} />
            </div>
          </div>

          <SparePartsFilters
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
          />

          <SparePartsTable
            items={filteredSpareParts}
            onEdit={handleUpdateSparePart}
            onDelete={handleDeleteSparePart}
            updating={isUpdating}
            loading={loading}
          />

          <CustomPagination
            page={page}
            pageSize={pageSize}
            total={total}
            onPrev={() => setPage((p) => Math.max(1, p - 1))}
            onNext={() => {
              const totalPages = Math.max(1, Math.ceil(total / pageSize));
              setPage((p) => Math.min(totalPages, p + 1));
            }}
            onPageChange={(newPage) => setPage(newPage)}
          />

          {error && (
            <div className="text-center py-4">
              <p className="text-destructive text-sm">{error}</p>
            </div>
          )}
        </div>
      </main>

      <PlaceOrderDialog
        open={isOrderDialogOpen}
        onOpenChange={setIsOrderDialogOpen}
        onSubmit={handlePlaceOrder}
        submitting={isCreating}
      />
    </div>
  );
};

export default Page;


