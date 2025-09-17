"use client";
import Header from "@/components/Header";
import EquipmentFilters from "@/components/EquipmentFilters";
import EquipmentList from "@/components/EquipmentList";
import EquipmentSidebar from "@/components/EquipmentSidebar";
import { useEquipment } from "@/hooks/useEquipment";
import { useLanguage } from "@/hooks/useLanguage";
import CustomPagination from "@/components/CustomPagination";

const Index = () => {
  const { t } = useLanguage();
  const {
    equipment,
    filteredEquipment,
    loading,
    error,
    isUpdating,
    isInserting,
    page,
    pageSize,
    total,
    searchTerm,
    statusFilter,
    setSearchTerm,
    setStatusFilter,
    setPage,
    addEquipment,
    updateEquipment,
  } = useEquipment();

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <EquipmentSidebar loading={loading} equipment={equipment} onAdd={addEquipment} submitting={isInserting} />
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            <EquipmentFilters
              searchTerm={searchTerm}
              statusFilter={statusFilter}
              onSearchChange={setSearchTerm}
              onStatusChange={setStatusFilter}
            />

            <EquipmentList loading={loading} items={filteredEquipment} onEdit={updateEquipment} updating={isUpdating} />
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
