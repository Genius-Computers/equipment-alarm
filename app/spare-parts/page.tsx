"use client";
import Header from "@/components/Header";
import SparePartsFilters from "@/components/SparePartsFilters";
import SparePartsTable from "@/components/SparePartsTable";
import { useSpareParts } from "@/hooks/useSpareParts";
import CustomPagination from "@/components/CustomPagination";
import { SparePart } from "@/lib/types";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const Page = () => {
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

  const [editingSparePart, setEditingSparePart] = useState<SparePart | undefined>(undefined);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    serialNumber: "",
    quantity: 0,
    manufacturer: "",
    supplier: "",
  });

  const handleAddSparePart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      toast("Error", {
        description: "Name is required",
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
      toast("Success", {
        description: "Spare part added successfully!",
      });
    } catch (err) {
      toast("Error", {
        description: "Failed to add spare part",
      });
    }
  };

  const handleUpdateSparePart = async (sparePart: SparePart | Omit<SparePart, "id">) => {
    try {
      await updateSparePart(sparePart as SparePart);
      toast("Success", {
        description: "Spare part updated successfully!",
      });
    } catch (err) {
      toast("Error", {
        description: "Failed to update spare part",
      });
    }
  };

  const handleDeleteSparePart = async (id: string) => {
    if (!confirm("Are you sure you want to delete this spare part?")) {
      return;
    }
    try {
      await deleteSparePart(id);
      toast("Success", {
        description: "Spare part deleted successfully!",
      });
    } catch (err) {
      toast("Error", {
        description: "Failed to delete spare part",
      });
    }
  };


  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-6 py-8">
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold">Spare Parts</h1>
            <Sheet open={isFormOpen} onOpenChange={setIsFormOpen}>
              <SheetTrigger asChild>
                <Button disabled={isInserting}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Spare Part
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="p-4 overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Add Spare Part</SheetTitle>
                </SheetHeader>
                <form onSubmit={handleAddSparePart} className="mt-4 space-y-4">
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="sp-name">
                      Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="sp-name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Air Filter"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <Label htmlFor="sp-serialNumber">Serial Number</Label>
                    <Input
                      id="sp-serialNumber"
                      value={formData.serialNumber}
                      onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                      placeholder="e.g., SN-12345"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <Label htmlFor="sp-quantity">Quantity</Label>
                    <Input
                      id="sp-quantity"
                      type="number"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                      placeholder="e.g., 10"
                      min="0"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <Label htmlFor="sp-manufacturer">Manufacturer</Label>
                    <Input
                      id="sp-manufacturer"
                      value={formData.manufacturer}
                      onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                      placeholder="e.g., Acme Corp"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <Label htmlFor="sp-supplier">Supplier</Label>
                    <Input
                      id="sp-supplier"
                      value={formData.supplier}
                      onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                      placeholder="e.g., Parts Warehouse Inc."
                    />
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button type="submit" disabled={isInserting}>
                      {isInserting && <span className="mr-2">Adding...</span>}
                      Add Spare Part
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </SheetContent>
            </Sheet>
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
          />

          {!loading && filteredSpareParts.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No spare parts found.</p>
            </div>
          )}
          {error && (
            <div className="text-center py-4">
              <p className="text-destructive text-sm">{error}</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Page;


