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
import { useLanguage } from "@/hooks/useLanguage";

type Equipment = {
  id: string;
  machineName: string;
  partNumber: string;
  location: string;
  lastMaintenance: string;
  nextMaintenance: string;
  maintenanceInterval: string;
  sparePartsNeeded: boolean;
  sparePartsApproved?: boolean;
  status: 'good' | 'due' | 'overdue';
};

type DbEquipment = {
  id: string;
  machine_name: string;
  part_number: string;
  location: string;
  last_maintenance: string;
  next_maintenance: string;
  maintenance_interval: string;
  spare_parts_needed: boolean;
  spare_parts_approved: boolean;
};

const updateEquipmentStatus = (equipmentList: Equipment[]): Equipment[] => {
  return equipmentList.map((item) => {
    const nextDate = new Date(item.nextMaintenance);
    const today = new Date();
    const diffTime = nextDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let status: "good" | "due" | "overdue";
    if (diffDays < 0) {
      status = "overdue";
    } else if (diffDays <= 7) {
      status = "due";
    } else {
      status = "good";
    }

    return { ...item, status };
  });
};

const Index = () => {
  const { t } = useLanguage();
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mapFromDb = (row: DbEquipment): Equipment => ({
    id: row.id,
    machineName: row.machine_name,
    partNumber: row.part_number,
    location: row.location,
    lastMaintenance: row.last_maintenance,
    nextMaintenance: row.next_maintenance,
    maintenanceInterval: row.maintenance_interval,
    sparePartsNeeded: row.spare_parts_needed,
    sparePartsApproved: row.spare_parts_approved,
    status: 'good',
  });

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch('/api/equipment', { cache: 'no-store' });
        if (!res.ok) throw new Error('Failed to load equipment');
        const json = await res.json();
        const rows = Array.isArray(json.data) ? json.data : [];
        const mapped = rows.map(mapFromDb);
        setEquipment(mapped);
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
    const updatedEquipment = updateEquipmentStatus(equipment);

    return updatedEquipment.filter((item) => {
      const matchesSearch =
        item.machineName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.partNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.location.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === "all" || item.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [equipment, searchTerm, statusFilter]);

  const handleAddEquipment = async (newEquipment: Equipment) => {
    try {
      const res = await fetch('/api/equipment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEquipment),
      });
      if (!res.ok) throw new Error('Failed to add equipment');
      const { data } = await res.json();
      const inserted = mapFromDb(data);
      setEquipment((prev) => [...prev, inserted]);
      toast(t("toast.success"), { description: t("toast.equipmentAdded") });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to add equipment';
      toast(t("toast.error"), { description: message });
    }
  };

  const handleScheduleMaintenance = (id: string) => {
    const item = equipment.find((eq) => eq.id === id);
    toast(t("toast.maintenanceScheduled"), {
      description: t("toast.maintenanceScheduledDesc", { name: item?.machineName }),
    });
  };

  const handleUpdateSpares = (id: string) => {
    setEquipment((prev) => prev.map((item) => (item.id === id ? { ...item, sparePartsApproved: true } : item)));
    toast(t("toast.sparePartsApproved"), {
      description: t("toast.sparePartsApprovedDesc"),
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <AddEquipmentForm onAddEquipment={handleAddEquipment} />

            <MaintenanceAlert equipment={updateEquipmentStatus(equipment)} />
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
              <div className="text-center py-12">
                <p className="text-muted-foreground">{t("loading") || 'Loading...'}</p>
              </div>
            )}
            {!loading && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredEquipment.map((item) => (
                  <EquipmentCard
                    key={item.id}
                    equipment={item}
                    onScheduleMaintenance={handleScheduleMaintenance}
                    onUpdateSpares={handleUpdateSpares}
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
