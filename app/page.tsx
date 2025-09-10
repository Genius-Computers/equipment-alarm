'use client'
import { useEffect, useMemo, useState } from "react";
import Header from "@/components/Header";
import EquipmentCard from "@/components/EquipmentCard";
import AddEquipmentForm from "@/components/AddEquipmentForm";
import MaintenanceAlert from "@/components/MaintenanceAlert";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/hooks/useLanguage";
import { Equipment } from "@/lib/types";

type DerivedEquipment = Equipment & { status: 'good' | 'due' | 'overdue'; nextMaintenance: string };

const intervalDaysMap: Record<string, number> = {
  '1 week': 7,
  '2 weeks': 14,
  '1 month': 30,
  '3 months': 90,
  '6 months': 180,
  '1 year': 365
};

const deriveStatus = (item: Equipment) => {
  const last = item.lastMaintenance ? new Date(item.lastMaintenance) : new Date();
  const next = new Date(last);
  const addDays = intervalDaysMap[item.maintenanceInterval] ?? 30;
  next.setDate(last.getDate() + addDays);
  const today = new Date();
  const diffDays = Math.ceil((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const status: 'good' | 'due' | 'overdue' = diffDays < 0 ? 'overdue' : diffDays <= 7 ? 'due' : 'good';
  return { status, nextMaintenance: next.toLocaleDateString() };
};

const Index = () => {
  const { t } = useLanguage();
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch('/api/equipment', { cache: 'no-store' });
        if (!res.ok) throw new Error('Failed to load equipment');
        const json = await res.json();
        const rows = Array.isArray(json.data) ? json.data : [];
        setEquipment(rows);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Error loading equipment';
        setError(message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filteredEquipment = useMemo(() => {
    const updatedEquipment: DerivedEquipment[] = equipment.map((item) => ({ ...item, ...deriveStatus(item) }));

    return updatedEquipment.filter((item) => {
      const matchesSearch =
        item.machineName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.partNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.location.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === "all" || item.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [equipment, searchTerm, statusFilter]);

  const handleAddEquipment = async (newEquipment: Omit<Equipment, 'id'>) => {
    try {
      const res = await fetch('/api/equipment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEquipment),
      });
      if (!res.ok) throw new Error('Failed to add equipment');
      const { data } = await res.json();
      setEquipment((prev) => [...prev, data as Equipment]);
      toast(t("toast.success"), { description: t("toast.equipmentAdded") });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to add equipment';
      toast(t("toast.error"), { description: message });
    }
  };

  // Note: maintenance completion is performed via inline edit in cards

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <AddEquipmentForm onAddEquipment={handleAddEquipment} />

            {loading ? (
              <div className="space-y-4">
                <div className="border rounded-lg p-4 bg-secondary/10">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-64 mt-2" />
                </div>
                <div className="border rounded-lg p-4 bg-warning/10">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-56 mt-2" />
                </div>
                <div className="rounded-lg border">
                  <div className="p-4">
                    <Skeleton className="h-4 w-40" />
                  </div>
                  <div className="p-4 space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div>
                          <Skeleton className="h-4 w-40" />
                          <Skeleton className="h-3 w-24 mt-1" />
                        </div>
                        <div className="text-right">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-5 w-20 mt-1 rounded-full" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <MaintenanceAlert equipment={equipment.map((e) => ({ id: e.id, machineName: e.machineName, location: e.location, nextMaintenance: deriveStatus(e).nextMaintenance, status: deriveStatus(e).status }))} />
            )}
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder={t("search.placeholder")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 rtl:pl-4 rtl:pr-10"
                />
              </div>

              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder={t("filter.byStatus")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("filter.allEquipment")}</SelectItem>
                    <SelectItem value="good">{t("filter.upToDate")}</SelectItem>
                    <SelectItem value="due">{t("filter.dueSoon")}</SelectItem>
                    <SelectItem value="overdue">{t("filter.overdue")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {loading && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[...Array(4)].map((_, index) => (
                  <div key={index} className="rounded-lg border p-0">
                    <div className="p-4 border-b">
                      <div className="flex items-center justify-between">
                        <Skeleton className="h-5 w-40" />
                        <Skeleton className="h-6 w-24 rounded-full" />
                      </div>
                      <Skeleton className="h-4 w-32 mt-2" />
                    </div>
                    <div className="p-4 space-y-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Skeleton className="h-4 w-4 rounded" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <Skeleton className="h-3 w-24 mb-2" />
                          <Skeleton className="h-4 w-28" />
                        </div>
                        <div>
                          <Skeleton className="h-3 w-28 mb-2" />
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-24 mt-1" />
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-4 w-4 rounded" />
                          <Skeleton className="h-4 w-36" />
                        </div>
                      </div>
                      <div className="bg-muted p-3 rounded-lg">
                        <Skeleton className="h-4 w-40 mb-2" />
                        <div className="flex items-center justify-between">
                          <Skeleton className="h-3 w-44" />
                          <Skeleton className="h-8 w-28" />
                        </div>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Skeleton className="h-8 w-28" />
                        <Skeleton className="h-8 w-24" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {!loading && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredEquipment.map((item) => (
                  <EquipmentCard
                    key={item.id}
                    equipment={item}
                    onEditEquipment={async (updated) => {
                      try {
                        const res = await fetch(`/api/equipment/${updated.id}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            machineName: updated.machineName,
                            partNumber: updated.partNumber,
                            location: updated.location,
                            lastMaintenance: updated.lastMaintenance,
                            maintenanceInterval: updated.maintenanceInterval,
                            inUse: updated.inUse,
                          }),
                        });
                        if (!res.ok) throw new Error('Failed to update equipment');
                        const { data } = await res.json();
                        setEquipment((prev) => prev.map((e) => (e.id === (data as Equipment).id ? (data as Equipment) : e)));
                        toast(t("toast.success"), { description: t("toast.equipmentUpdated") });
                      } catch (e: unknown) {
                        const message = e instanceof Error ? e.message : 'Failed to update equipment';
                        toast(t("toast.error"), { description: message });
                      }
                    }}
                  />
                ))}
              </div>
            )}

            {!loading && filteredEquipment.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">{t("search.noResults")}</p>
              </div>
            )}
            {error && (
              <div className="text-center py-4">
                <p className="text-destructive text-sm">{error}</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
