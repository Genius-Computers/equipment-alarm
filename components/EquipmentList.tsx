"use client";

import { useState } from "react";
import EquipmentCard from "@/components/EquipmentCard";
import EquipmentTable from "./EquipmentTable";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Equipment, JEquipment } from "@/lib/types";
import { LayoutGrid, List, Trash2, X } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import EquipmentCSVExport from "@/components/EquipmentCSVExport";
import EquipmentCSVImport from "@/components/EquipmentCSVImport";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface EquipmentListProps {
  loading: boolean;
  items: JEquipment[];
  onEdit: (updated: Equipment) => Promise<void> | void;
  onDelete?: (id: string) => Promise<void> | void;
  updating?: boolean;
  // for label context
  total: number;
  page: number;
  pageSize: number;
  searchTerm?: string;
  statusFilter?: "all" | "good" | "due" | "overdue";
  onRefresh?: () => void;
}

const EquipmentList = ({
  loading,
  items,
  onEdit,
  updating = false,
  total,
  page,
  pageSize,
  searchTerm = "",
  statusFilter = "all",
  onRefresh,
  onDelete,
}: EquipmentListProps) => {
  const [view, setView] = useState<"grid" | "table">("table");
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { t } = useLanguage();

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, Math.max(total, items.length));

  const hasSearch = (searchTerm || "").trim().length > 0;
  const hasStatus = statusFilter !== "all";
  const statusLabelMap: Record<string, string> = {
    all: t("filter.all"),
    good: t("filter.upToDate"),
    due: t("filter.dueSoon"),
    overdue: t("filter.overdue"),
  };

  const handleToggleDeleteMode = () => {
    if (deleteMode) {
      // Exiting delete mode - clear selections
      setSelectedIds(new Set());
    }
    setDeleteMode(!deleteMode);
  };

  const handleToggleSelection = (id: string) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedIds(newSelection);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map(item => item.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) {
      toast.error("No items selected");
      return;
    }
    setDeleteDialogOpen(true);
  };

  const confirmBulkDelete = async () => {
    try {
      setDeleting(true);
      const idsArray = Array.from(selectedIds);
      
      // Use bulk delete endpoint for faster deletion
      const response = await fetch('/api/equipment/bulk', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: idsArray }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete items');
      }

      const { deleted, failed } = result;

      if (deleted > 0) {
        toast.success(`Successfully deleted ${deleted} item${deleted !== 1 ? 's' : ''}`);
        if (onRefresh) onRefresh();
      }
      
      if (failed > 0) {
        toast.error(`Failed to delete ${failed} item${failed !== 1 ? 's' : ''}`);
      }

      // Reset state
      setSelectedIds(new Set());
      setDeleteMode(false);
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error('Bulk delete error:', error);
      toast.error(error instanceof Error ? error.message : "Failed to delete items");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        {loading ? (
          <div />
        ) : deleteMode ? (
          <div className="flex items-center gap-3">
            <p className="text-sm font-medium">
              {selectedIds.size} item{selectedIds.size !== 1 ? 's' : ''} selected
            </p>
            {items.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleSelectAll}
              >
                {selectedIds.size === items.length ? 'Deselect All' : 'Select All'}
              </Button>
            )}
            {selectedIds.size > 0 && (
              <Button
                size="sm"
                variant="destructive"
                onClick={handleBulkDelete}
                disabled={deleting}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Selected
              </Button>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {t("list.label.showing", { from: String(from), to: String(to), total: String(total) })}
            {(hasSearch || hasStatus) && (
              <>
                {" "}
                {t("list.label.filteredBy")} {hasSearch && t("list.label.search", { q: searchTerm })}
                {hasSearch && hasStatus && ` ${t("list.label.and")} `}
                {hasStatus && t("list.label.status", { status: statusLabelMap[statusFilter] })}
              </>
            )}
          </p>
        )}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-2" role="tablist" aria-label="View mode">
          {/* Delete Mode Toggle */}
          <Button
            variant={deleteMode ? "destructive" : "outline"}
            size="sm"
            onClick={handleToggleDeleteMode}
            disabled={loading || items.length === 0}
          >
            {deleteMode ? (
              <>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </>
            )}
          </Button>
          
          {/* Separator */}
          <div className="hidden sm:block w-px h-6 bg-border mx-2" />
          
          {/* View Mode Buttons */}
          <div className="flex gap-2">
            <Button
              variant={view === "table" ? "default" : "outline"}
              size="sm"
              onClick={() => setView("table")}
              aria-pressed={view === "table"}
              aria-label="Table view"
              disabled={deleteMode}>
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={view === "grid" ? "default" : "outline"}
              size="sm"
              onClick={() => setView("grid")}
              aria-pressed={view === "grid"}
              aria-label="Grid view"
              disabled={deleteMode}>
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Separator - hidden on mobile */}
          <div className="hidden sm:block w-px h-6 bg-border mx-2" />
          
          {/* CSV Actions */}
          <div className="flex gap-2 flex-wrap">
            <EquipmentCSVExport 
              items={items} 
              filters={{
                status: statusFilter !== "all" ? statusFilter : undefined,
                // Note: searchTerm is not a direct filter but could be used for filtering
              }}
            />
            <EquipmentCSVImport onImported={onRefresh} />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {items.map((item) => (
            <EquipmentCard
              key={item.id}
              equipment={item}
              onEditEquipment={onEdit}
              onDeleteEquipment={onDelete}
              disabled={updating}
            />
          ))}
        </div>
      ) : (
        <EquipmentTable 
          items={items} 
          onEdit={onEdit} 
          onDelete={onDelete} 
          updating={updating}
          deleteMode={deleteMode}
          selectedIds={selectedIds}
          onToggleSelection={handleToggleSelection}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} Equipment Item{selectedIds.size !== 1 ? 's' : ''}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the selected equipment items from the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmBulkDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default EquipmentList;
