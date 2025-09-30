"use client";

import { useState, Fragment } from "react";
import { getDaysUntilMaintenance } from "@/components/EquipmentCard";
import ServiceRequestDialog from "@/components/ServiceRequestDialog";
import EquipmentForm from "@/components/AddEquipmentForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLanguage } from "@/hooks/useLanguage";
import { Equipment, JEquipment } from "@/lib/types";
import type { JServiceRequest } from "@/lib/types/service-request";
import { Wrench, MapPin, Pencil, XCircle, ChevronDown, ChevronRight } from "lucide-react";

interface EquipmentTableProps {
  items: JEquipment[];
  onEdit: (updated: Equipment) => Promise<void> | void;
  updating?: boolean;
}

const headerClass = "px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide";
const cellClass = "px-3 py-3 text-sm align-middle";

const EquipmentTable = ({ items, onEdit, updating = false }: EquipmentTableProps) => {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const toggleExpanded = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (!items || items.length === 0) {
    return (
      <Card className="p-6 text-center text-sm text-muted-foreground">
        {t("common.noResults")}
      </Card>
    );
  }

  return (
    <div className="rounded-lg border overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className={headerClass}>{t("equipment.name")}</th>
            <th className={headerClass}>{t("equipment.part")}</th>
            <th className={headerClass}>{t("equipment.location")}</th>
            <th className={headerClass}>{t("equipment.lastMaintenance")}</th>
            <th className={headerClass}>{t("equipment.nextMaintenance")}</th>
            <th className={headerClass}>{t("equipment.status")}</th>
            <th className={headerClass}></th>
          </tr>
        </thead>
        <tbody>
          {items.map((e) => {
            const daysUntil = getDaysUntilMaintenance(e);
            const nextMaintenanceLabel =
              daysUntil <= 0
                ? t("equipment.overdueBy", { days: Math.abs(daysUntil) })
                : daysUntil <= 7
                ? t("equipment.inDays", { days: daysUntil })
                : "";

            return (
              <Fragment key={e.id}>
                <tr className="border-t hover:bg-muted/30">
                  <td className={cellClass}>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={t("table.toggleDetails") || "Toggle details"}
                        onClick={() => toggleExpanded(e.id)}
                        className="h-7 w-7"
                      >
                        {expanded[e.id] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </Button>
                      {!e.inUse && (
                        <Badge variant="destructive" className="whitespace-nowrap">
                          <XCircle className="h-3 w-3 mr-1 rtl:mr-0 rtl:ml-1" />
                          {t("equipment.notInUse")}
                        </Badge>
                      )}
                      <div className="font-medium">{e.name}</div>
                    </div>
                  </td>
                  <td className={cellClass}>{e.partNumber}</td>
                  <td className={cellClass}>
                    <div className="inline-flex items-center gap-1 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{e.location}</span>
                    </div>
                  </td>
                  <td className={cellClass}>{new Date(e.lastMaintenance).toLocaleDateString()}</td>
                  <td className={cellClass}>
                    {nextMaintenanceLabel ? (
                      <span className={daysUntil <= 0 ? "text-destructive" : "text-warning"}>{nextMaintenanceLabel}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className={cellClass}>
                    <Badge variant="secondary" className="capitalize">
                      {e.status}
                    </Badge>
                  </td>
                  <td className={cellClass}>
                    <div className="flex items-center gap-2 justify-end">
                      <ServiceRequestDialog
                        equipmentId={e.id}
                        equipmentName={e.name}
                        existing={e.latestPendingServiceRequest as JServiceRequest}
                        trigger={
                          <Button size="sm" variant="outline">
                            <Wrench className="h-4 w-4 mr-1 rtl:mr-0 rtl:ml-1" />
                            {t("serviceRequest.manage")}
                          </Button>
                        }
                      />
                      <EquipmentForm
                        mode="edit"
                        equipment={e as unknown as Equipment}
                        onSubmitEquipment={(updated) => onEdit(updated as Equipment)}
                        submitting={updating}
                        trigger={
                          <Button size="sm" variant="outline" className="gap-1">
                            <Pencil className="h-4 w-4" />
                            {t("form.edit")}
                          </Button>
                        }
                      />
                    </div>
                  </td>
                </tr>
                {expanded[e.id] && (
                  <tr className="border-t">
                    <td className="px-3 py-3" colSpan={7}>
                      <div className="rounded-md border p-4 bg-card">
                        {e.latestPendingServiceRequest ? (
                          <div className="flex flex-col gap-3">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge className="bg-primary/10 text-primary border-primary/20 capitalize">
                                  {e.latestPendingServiceRequest.requestType.replaceAll("_", " ")}
                                </Badge>
                                <Badge variant="outline" className="capitalize">
                                  {e.latestPendingServiceRequest.priority}
                                </Badge>
                                <Badge className="bg-muted text-foreground/80 border border-border capitalize">
                                  {t("serviceRequest.approvalStatus")}: {e.latestPendingServiceRequest.approvalStatus}
                                </Badge>
                                <Badge className="bg-muted text-foreground/80 border border-border capitalize">
                                  {t("serviceRequest.workStatus")}: {e.latestPendingServiceRequest.workStatus}
                                </Badge>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {t("serviceRequest.scheduledAt")}: {new Date(e.latestPendingServiceRequest.scheduledAt).toLocaleString()}
                              </div>
                            </div>

                            {e.latestPendingServiceRequest.problemDescription ? (
                              <div className="text-sm">
                                <div className="text-muted-foreground mb-1">{t("serviceRequest.problemDescription")}</div>
                                <div className="whitespace-pre-wrap break-words">{e.latestPendingServiceRequest.problemDescription}</div>
                              </div>
                            ) : null}
                            {e.latestPendingServiceRequest.recommendation ? (
                              <div className="text-sm">
                                <div className="text-muted-foreground mb-1">{t("serviceRequest.recommendation")}</div>
                                <div className="whitespace-pre-wrap break-words">{e.latestPendingServiceRequest.recommendation}</div>
                              </div>
                            ) : null}
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="text-sm text-muted-foreground">{t("serviceRequest.none")}</div>
                            <ServiceRequestDialog
                              equipmentId={e.id}
                              equipmentName={e.name}
                              trigger={
                                <Button size="sm" variant="outline" className="gap-1">
                                  <Wrench className="h-4 w-4" />
                                  {t("serviceRequest.newRequest")}
                                </Button>
                              }
                            />
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default EquipmentTable;


