"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";
import type { JServiceRequest, SparePartNeeded, ServiceRequestPriority, ServiceRequestWorkStatus } from "@/lib/types/service-request";
import { ServiceRequestType } from "@/lib/types/service-request";
import type { User } from "@/lib/types/user";
import type { PmDetails } from "@/lib/types/preventive-maintenance";
import { Skeleton } from "@/components/ui/skeleton";
import { formatSaudiDateTime, formatSaudiDate, deriveMaintenanceInfo } from "@/lib/utils";

interface PageProps {
  params: Promise<{ id: string }>;
}

const A4_WIDTH = 794; // px at 96dpi ≈ 210mm

export default function PrintPage(props: PageProps) {
  const { t, isRTL } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<JServiceRequest | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const { id } = await props.params;
        const res = await fetch(`/api/service-request/${id}`, { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load service request");
        const j = await res.json();
        setData(j.data as JServiceRequest);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [props.params]);

  useEffect(() => {
    if (!loading && data) {
      const id = setTimeout(() => {
        window.print();
      }, 300);
      return () => clearTimeout(id);
    }
  }, [loading, data]);

  const parts: SparePartNeeded[] = useMemo(() => Array.isArray(data?.sparePartsNeeded) ? (data?.sparePartsNeeded as SparePartNeeded[]) : [], [data]);
  const equipment = data?.equipment || null;
  const technician: User | undefined = data?.technician as User | undefined;
  const isPmRequest = data?.requestType === ServiceRequestType.PREVENTIVE_MAINTENANCE;
  const pmDetails: PmDetails | null = useMemo(() => {
    if (!isPmRequest || !data?.pmDetails) return null;
    try {
      return typeof data.pmDetails === 'string' ? JSON.parse(data.pmDetails) : data.pmDetails;
    } catch {
      return null;
    }
  }, [isPmRequest, data?.pmDetails]);
  
  const computedNextMaintenance = useMemo(() => {
    if (!equipment) return "";
    const info = deriveMaintenanceInfo({
      lastMaintenance: equipment.lastMaintenance || undefined,
      maintenanceInterval: equipment.maintenanceInterval || undefined,
    });
    return info.nextMaintenance;
  }, [equipment]);

  const requestTypeLabel = useMemo(() => {
    const keyMap: Record<ServiceRequestType, string> = {
      preventive_maintenance: "serviceRequest.types.preventive",
      corrective_maintenence: "serviceRequest.types.corrective",
      install: "serviceRequest.types.install",
      assess: "serviceRequest.types.assess",
      other: "serviceRequest.types.other",
    } as const;
    return data?.requestType ? t(keyMap[data.requestType as ServiceRequestType]) : "-";
  }, [data?.requestType, t]);

  const priorityLabel = useMemo(() => {
    const keyMap: Record<ServiceRequestPriority, string> = {
      low: "serviceRequest.priorities.low",
      medium: "serviceRequest.priorities.medium",
      high: "serviceRequest.priorities.high",
    } as const;
    return data?.priority ? t(keyMap[data.priority as ServiceRequestPriority]) : "-";
  }, [data?.priority, t]);

  const workStatusLabel = useMemo(() => {
    const keyMap: Record<ServiceRequestWorkStatus, string> = {
      pending: "serviceRequest.statuses.pending",
      completed: "serviceRequest.statuses.completed",
      cancelled: "serviceRequest.statuses.cancelled",
    } as const;
    return data?.workStatus ? t(keyMap[data.workStatus as ServiceRequestWorkStatus]) : "-";
  }, [data?.workStatus, t]);

  const partsTotal = useMemo(() => {
    return parts.reduce((sum, p) => sum + Number(p.cost || 0) * Number(p.quantity || 0), 0);
  }, [parts]);

  return (
    <div className="min-h-screen bg-white text-black">
      <style jsx global>{`
        @media print {
          @page { size: A4 portrait; margin: 6mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; }
          .print-container {
            width: 100% !important;
            max-width: ${A4_WIDTH}px;
            margin-left: 0 !important;
            margin-right: 0 !important;
          }
        }
      `}</style>
      {/* Screen-only action bar */}
      <div className="print:hidden sticky top-0 z-10 bg-white border-b">
        <div className="mx-auto flex items-center justify-end gap-2 p-2" style={{ width: A4_WIDTH }}>
          <Button size="sm" onClick={() => window.print()}>Print</Button>
        </div>
      </div>
      <div
        className="mx-auto print-container text-[13px] leading-snug"
        style={{ width: A4_WIDTH, maxWidth: "100%" }}
        ref={containerRef}
      >
        {loading ? (
          <>
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-12 w-12 rounded-md" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-56" />
                </div>
              </div>
              <div className="space-y-1">
                <Skeleton className="h-3.5 w-40" />
                <Skeleton className="h-3.5 w-32" />
              </div>
            </div>

            <div className="mt-2 text-center">
              <Skeleton className="h-4.5 w-48 mx-auto" />
            </div>

            <div className="mt-3 grid grid-cols-4 gap-[2px] text-[12px]">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="col-span-1 border p-2">
                  <Skeleton className="h-3.5 w-24 mb-2" />
                  <Skeleton className="h-3.5 w-32" />
                </div>
              ))}
            </div>

            <div className="mt-3 space-y-2">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>

            <div className="mt-3">
              <Skeleton className="h-6 w-40 mx-auto" />
              <div className="grid grid-cols-12 text-[12px] border mt-1">
                <div className="col-span-3 border-r p-1"><Skeleton className="h-3 w-20" /></div>
                <div className="col-span-4 border-r p-1"><Skeleton className="h-3 w-24" /></div>
                <div className="col-span-1 border-r p-1"><Skeleton className="h-3 w-10" /></div>
                <div className="col-span-2 border-r p-1"><Skeleton className="h-3 w-12" /></div>
                <div className="col-span-2 p-1"><Skeleton className="h-3 w-16" /></div>
              </div>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="grid grid-cols-12 border border-t-0">
                  <div className="col-span-3 border-r p-1"><Skeleton className="h-3 w-24" /></div>
                  <div className="col-span-4 border-r p-1"><Skeleton className="h-3 w-32" /></div>
                  <div className="col-span-1 border-r p-1"><Skeleton className="h-3 w-8" /></div>
                  <div className="col-span-2 border-r p-1"><Skeleton className="h-3 w-10" /></div>
                  <div className="col-span-2 p-1"><Skeleton className="h-3 w-16" /></div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-amber-300 pb-3">
              <div className="flex items-center gap-3">
                <Image src="/logo.png" alt="logo" width={48} height={48} />
                <div className="leading-tight">
                  <div className="font-semibold">{t("header.title")}</div>
                <div className="text-[12px] text-neutral-700">{t("header.subtitle")}</div>
                </div>
              </div>
              <div className={isRTL ? "text-left" : "text-right"}>
                <div className="text-[12px] text-neutral-700">Ticket: {data?.ticketId || data?.id}</div>
              </div>
            </div>

            {isPmRequest && pmDetails ? (
              <>
                <div className="mt-3 text-center font-semibold border-b border-neutral-300 pb-1">Preventive Maintenance</div>
                {/* PM Form: Equipment Information */}
                <div className="mt-3 border border-neutral-300 p-2">
                  <div className="text-center text-[13px] font-semibold mb-2">Equipment Information</div>
                  <div className="grid grid-cols-4 gap-[2px] text-[12px]">
                    <div className="border p-1">
                      <div className="font-medium">Equipment</div>
                      <div className="text-[12px] text-neutral-700">{equipment?.name || "-"}</div>
                    </div>
                    <div className="border p-1">
                      <div className="font-medium">Manufacturer</div>
                      <div className="text-[12px] text-neutral-700">{equipment?.manufacturer || "-"}</div>
                    </div>
                    <div className="border p-1">
                      <div className="font-medium">Model</div>
                      <div className="text-[12px] text-neutral-700">{equipment?.model || "-"}</div>
                    </div>
                    <div className="border p-1">
                      <div className="font-medium">Serial</div>
                      <div className="text-[12px] text-neutral-700">{equipment?.serialNumber || "-"}</div>
                    </div>
                    <div className="border p-1">
                      <div className="font-medium">Location</div>
                      <div className="text-[12px] text-neutral-700">{equipment?.location || "-"}</div>
                    </div>
                    <div className="border p-1">
                      <div className="font-medium">Sub-Location</div>
                      <div className="text-[12px] text-neutral-700">{equipment?.subLocation || "-"}</div>
                    </div>
                    <div className="border p-1">
                      <div className="font-medium">Last PPM</div>
                      <div className="text-[12px] text-neutral-700">
                        {pmDetails.lastPpmDate
                          ? formatSaudiDate(pmDetails.lastPpmDate)
                          : equipment?.lastMaintenance
                            ? formatSaudiDate(equipment.lastMaintenance)
                            : "-"}
                      </div>
                    </div>
                    <div className="border p-1">
                      <div className="font-medium">Due PPM</div>
                      <div className="text-[12px] text-neutral-700">
                        {pmDetails.duePpmDate
                          ? formatSaudiDate(pmDetails.duePpmDate)
                          : computedNextMaintenance
                            ? formatSaudiDate(computedNextMaintenance)
                            : "-"}
                      </div>
                    </div>
                    <div className="border p-1 col-span-4">
                      <div className="font-medium">Technician Name</div>
                      <div className="text-[12px] text-neutral-700">{pmDetails.technicianName || "-"}</div>
                    </div>
                  </div>
                </div>

                {/* PM Form: Checklist / Qualitative */}
                <div className="mt-3">
                  <div className="text-center text-[13px] font-semibold border border-neutral-300 border-b-0 p-1">Checklist / Qualitative</div>
                  <div className="grid grid-cols-5 text-[12px] border border-neutral-300">
                    <div className="col-span-1 border-r p-1 font-medium text-center">#</div>
                    <div className="col-span-1 border-r p-1 font-medium">Component / Area</div>
                    <div className="col-span-1 border-r p-1 font-medium">Inspection Criteria</div>
                    <div className="col-span-1 border-r p-1 font-medium text-center">✔ / ✘</div>
                    <div className="col-span-1 p-1 font-medium">Comments</div>
                  </div>
                  {(pmDetails.qualitative || []).length === 0 ? (
                    <div className="border border-neutral-300 border-t-0 p-4 text-center text-neutral-500 text-[12px]">No qualitative checks recorded</div>
                  ) : (
                    pmDetails.qualitative.map((row, i) => (
                      <div key={i} className="grid grid-cols-5 text-[12px] border border-neutral-300 border-t-0">
                        <div className="col-span-1 border-r p-1 text-center">{row.index}</div>
                        <div className="col-span-1 border-r p-1 break-words">{row.componentArea || ""}</div>
                        <div className="col-span-1 border-r p-1 break-words">{row.inspectionCriteria || ""}</div>
                        <div className="col-span-1 border-r p-1 text-center">{row.pass === true ? "✔" : row.pass === false ? "✘" : ""}</div>
                        <div className="col-span-1 p-1 break-words">{row.comments || ""}</div>
                      </div>
                    ))
                  )}
                </div>

                {/* PM Form: Checklist / Quantitative */}
                <div className="mt-3">
                  <div className="text-center text-[13px] font-semibold border border-neutral-300 border-b-0 p-1">Checklist / Quantitative</div>
                  <div className="grid grid-cols-5 text-[12px] border border-neutral-300">
                    <div className="col-span-1 border-r p-1 font-medium text-center">#</div>
                    <div className="col-span-1 border-r p-1 font-medium">Parameter</div>
                    <div className="col-span-1 border-r p-1 font-medium">Acceptable Range</div>
                    <div className="col-span-1 border-r p-1 font-medium">Measured Value</div>
                    <div className="col-span-1 p-1 font-medium text-center">Pass / Fail</div>
                  </div>
                  {(pmDetails.quantitative || []).length === 0 ? (
                    <div className="border border-neutral-300 border-t-0 p-4 text-center text-neutral-500 text-[12px]">No quantitative checks recorded</div>
                  ) : (
                    pmDetails.quantitative.map((row, i) => (
                      <div key={i} className="grid grid-cols-5 text-[12px] border border-neutral-300 border-t-0">
                        <div className="col-span-1 border-r p-1 text-center">{row.index}</div>
                        <div className="col-span-1 border-r p-1 break-words">{row.parameter || ""}</div>
                        <div className="col-span-1 border-r p-1 break-words">{row.acceptableRange || ""}</div>
                        <div className="col-span-1 border-r p-1 break-words">{row.measuredValue || ""}</div>
                        <div className="col-span-1 p-1 text-center">{row.pass === true ? "Pass" : row.pass === false ? "Fail" : ""}</div>
                      </div>
                    ))
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="mt-2 text-center font-semibold">{requestTypeLabel}</div>

                {/* Info grid */}
                <div className="mt-2 grid grid-cols-4 gap-[2px] text-[11px]">
                  <div className="col-span-1 border p-2">
                    <div className="font-medium">{t("form.partNumber")}</div>
                    <div className="text-xs text-neutral-700">{equipment?.partNumber || "-"}</div>
                  </div>
                  <div className="col-span-1 border p-2">
                    <div className="font-medium">Serial Number</div>
                    <div className="text-xs text-neutral-700">{equipment?.serialNumber || "-"}</div>
                  </div>
                  <div className="col-span-1 border p-2">
                    <div className="font-medium">Manufacturer</div>
                    <div className="text-xs text-neutral-700">{equipment?.manufacturer || "-"}</div>
                  </div>
                  <div className="col-span-1 border p-2">
                    <div className="font-medium">{t("serviceRequest.scheduledAt")}</div>
                    <div className="text-xs text-neutral-700">{formatSaudiDateTime(data?.scheduledAt)}</div>
                  </div>

                  <div className="col-span-1 border p-2">
                    <div className="font-medium">{t("serviceRequest.viewEquipment")}</div>
                    <div className="text-xs text-neutral-700">{equipment?.name || "-"}</div>
                  </div>
                  <div className="col-span-1 border p-2">
                    <div className="font-medium">{t("form.location")}</div>
                    <div className="text-xs text-neutral-700">{equipment?.location || "-"}</div>
                  </div>
                  <div className="col-span-1 border p-2">
                    <div className="font-medium">{t("serviceRequest.priority")}</div>
                    <div className="text-xs text-neutral-700">{priorityLabel}</div>
                  </div>
                  <div className="col-span-1 border p-2">
                    <div className="font-medium">{t("serviceRequest.workStatus")}</div>
                    <div className="text-xs text-neutral-700">{workStatusLabel}</div>
                  </div>

                  <div className="col-span-4 border p-2">
                    <div className="font-medium">Technician</div>
                    <div className="text-xs text-neutral-700">{technician?.displayName || technician?.email || "-"}</div>
                  </div>
                </div>

                {/* Problem / Assessment / Recommendation (for non-PM requests) */}
                <div className="mt-2 grid grid-cols-1 gap-[2px] text-[11px]">
                  <div className="border p-2 min-h-[72px]"><span className="font-medium">{t("serviceRequest.problemDescription")}:</span> {data?.problemDescription || ""}</div>
                  <div className="border p-2 min-h-[72px]"><span className="font-medium">{t("serviceRequest.technicalAssessment")}:</span> {data?.technicalAssessment || ""}</div>
                  <div className="border p-2 min-h-[72px]"><span className="font-medium">{t("serviceRequest.recommendation")}:</span> {data?.recommendation || ""}</div>
                </div>

                {/* Spare parts (for non-PM requests) */}
                <div className="mt-2">
                  <div className="text-center text-[12px] font-medium border border-b-0">{t("serviceRequest.spareParts.title")}</div>
                  <div className="grid grid-cols-12 text-[11px] border">
                    <div className="col-span-3 border-r p-1 font-medium">{t("serviceRequest.spareParts.part")}</div>
                    <div className="col-span-4 border-r p-1 font-medium">{t("serviceRequest.spareParts.description")}</div>
                    <div className="col-span-1 border-r p-1 font-medium">{t("serviceRequest.spareParts.quantity")}</div>
                    <div className="col-span-2 border-r p-1 font-medium">{t("serviceRequest.spareParts.cost")}</div>
                    <div className="col-span-2 p-1 font-medium">{t("serviceRequest.spareParts.source")}</div>
                  </div>
                  {parts.length === 0 ? (
                    <div className="border border-t-0 p-10 text-center text-neutral-500 text-xs">{t("serviceRequest.spareParts.empty")}</div>
                  ) : (
                    <>
                      {parts.map((p, i) => (
                        <div key={i} className="grid grid-cols-12 text-[11px] border border-t-0">
                          <div className="col-span-3 border-r p-1">{p.part}</div>
                          <div className="col-span-4 border-r p-1 break-words">{p.description}</div>
                          <div className="col-span-1 border-r p-1">{p.quantity}</div>
                          <div className="col-span-2 border-r p-1">{(Number(p.cost) * Number(p.quantity || 0)).toFixed(2)}</div>
                          <div className="col-span-2 p-1 break-words">{p.source}</div>
                        </div>
                      ))}
                      <div className="grid grid-cols-12 text-[11px] border border-t-0 bg-amber-50">
                        <div className="col-span-10 border-r p-1 font-medium text-right">{t("serviceRequest.spareParts.total", { amount: partsTotal.toFixed(2) })}</div>
                        <div className="col-span-2 p-1" />
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}


