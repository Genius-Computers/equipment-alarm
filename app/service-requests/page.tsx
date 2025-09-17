"use client";
import { useEffect, useMemo, useState } from "react";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/hooks/useLanguage";
import ServiceRequestDialog from "@/components/ServiceRequestDialog";
import { Wrench, Filter, Search, Check, X, Loader2, Pencil, Printer } from "lucide-react";
import { toast } from "sonner";
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import {
  Equipment,
  ServiceRequestApprovalStatus,
  ServiceRequestPriority,
  ServiceRequestWorkStatus,
} from "@/lib/types";
import type { JServiceRequest } from "@/lib/types/service-request";
import { useUser } from "@stackframe/stack";

const Page = () => {
  const { t } = useLanguage();
  const user = useUser();
  const role = (user?.clientReadOnlyMetadata?.role) as string | undefined;
  const canApprove = role === 'admin' || role === 'supervisor';
  const [rows, setRows] = useState<JServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [total, setTotal] = useState(0);
  // joined equipment included; no separate equipment fetch
  type ApprovalFilter = "all" | ServiceRequestApprovalStatus;
  type PriorityFilter = "all" | ServiceRequestPriority;
  const [status, setStatus] = useState<ApprovalFilter>("all");
  const [priority, setPriority] = useState<PriorityFilter>("all");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/service-request?page=${page}&pageSize=${pageSize}`, { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load service requests");
        const json = await res.json();
        setRows(json.data || []);
        setTotal(Number(json?.meta?.total || 0));
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Error loading service requests";
        toast(t("toast.error"), { description: message });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [t, page, pageSize]);

  // no equipments effect

  // not needed with joined equipment

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const matchesSearch =
        r.requestType.toLowerCase().includes(search.toLowerCase()) ||
        (r.problemDescription || "").toLowerCase().includes(search.toLowerCase());
      const matchesPriority = priority === "all" || r.priority === priority;
      const matchesStatus = status === "all" || r.approvalStatus === status;
      return matchesSearch && matchesPriority && matchesStatus;
    });
  }, [rows, search, status, priority]);

  const [updating, setUpdating] = useState<Record<string, { approval?: boolean; work?: boolean }>>({});

  const changeStatus = async (id: string, type: "approval" | "work", value: string) => {
    try {
      setUpdating((s) => ({ ...s, [id]: { ...(s[id] || {}), [type]: true } }));
      const res = await fetch(`/api/service-request/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(type === "approval" ? { approvalStatus: value } : { workStatus: value }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || "Failed to update");
      }
      const { data } = await res.json();
      setRows((prev) => prev.map((r) => (r.id === data.id ? (data as unknown as JServiceRequest) : r)));
      toast(t("toast.success"), { description: t("toast.updated") });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to update";
      toast(t("toast.error"), { description: message });
    } finally {
      setUpdating((s) => ({ ...s, [id]: { ...(s[id] || {}), [type]: false } }));
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-6 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("search.placeholder")}
              className="pl-10 rtl:pl-4 rtl:pr-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={priority} onValueChange={(v) => setPriority(v as PriorityFilter)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder={t("serviceRequest.priority")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("filter.all")}</SelectItem>
                <SelectItem value={ServiceRequestPriority.LOW}>{t("serviceRequest.priorities.low")}</SelectItem>
                <SelectItem value={ServiceRequestPriority.MEDIUM}>{t("serviceRequest.priorities.medium")}</SelectItem>
                <SelectItem value={ServiceRequestPriority.HIGH}>{t("serviceRequest.priorities.high")}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={(v) => setStatus(v as ApprovalFilter)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder={t("serviceRequest.status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("filter.all")}</SelectItem>
                <SelectItem value={ServiceRequestApprovalStatus.PENDING}>
                  {t("serviceRequest.statuses.pending")}
                </SelectItem>
                <SelectItem value={ServiceRequestApprovalStatus.APPROVED}>
                  {t("serviceRequest.statuses.approved")}
                </SelectItem>
                <SelectItem value={ServiceRequestApprovalStatus.REJECTED}>
                  {t("serviceRequest.statuses.rejected")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-5 w-40" />
                </CardHeader>
                <CardContent className="space-y-2">
                  <Skeleton className="h-4 w-64" />
                  <Skeleton className="h-4 w-52" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {filtered.map((r) => {
              const isUpdatingApproval = !!updating[r.id]?.approval;
              const isUpdatingWork = !!updating[r.id]?.work;
              const canEditDetails =
                r.approvalStatus === ServiceRequestApprovalStatus.PENDING &&
                r.workStatus === ServiceRequestWorkStatus.PENDING;
              return (
                <Card key={r.id} className="hover:shadow-lg transition-shadow duration-200">
                  <CardHeader className="flex-row items-center justify-between gap-2">
                    <CardTitle className="flex items-center gap-2">
                      <Wrench className="h-5 w-5" />
                      <span className="capitalize">{r.requestType.replaceAll("_", " ")}</span>
                      <Badge variant="secondary">{r.priority}</Badge>
                    </CardTitle>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className="bg-primary/10 text-primary border-primary/20 capitalize">
                        {t("serviceRequest.approvalStatus")}: {r.approvalStatus}
                      </Badge>
                      <Badge className="bg-muted text-foreground/80 border border-border capitalize">
                        {t("serviceRequest.workStatus")}: {r.workStatus}
                      </Badge>
                      <span className="text-sm text-muted-foreground">{r.equipment?.name || r.equipmentId}</span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-sm text-muted-foreground">
                      {t("serviceRequest.scheduledAt")}: {new Date(r.scheduledAt).toLocaleString()}
                    </div>

                    {r.problemDescription ? (
                      <div className="text-sm">
                        <span className="text-muted-foreground">{t("serviceRequest.problemDescription")}:</span>{" "}
                        {r.problemDescription}
                        waodpwaopanw aoi dnawipod awid awoid awodiawod iawdoi awdoiawdoaiw daiowdaowdiawodiawdo awodi
                        awod awod awod awod wadoiwdoi
                      </div>
                    ) : null}

                    {r.technicalAssessment ? (
                      <div className="text-sm">
                        <span className="text-muted-foreground">{t("serviceRequest.technicalAssessment")}:</span>{" "}
                        {r.technicalAssessment}
                      </div>
                    ) : null}

                    {r.recommendation ? (
                      <div className="text-sm">
                        <span className="text-muted-foreground">{t("serviceRequest.recommendation")}:</span>{" "}
                        {r.recommendation}
                      </div>
                    ) : null}

                    {Array.isArray(r.sparePartsNeeded) && r.sparePartsNeeded.length > 0 ? (
                      <div className="text-sm space-y-1">
                        <div className="text-muted-foreground">{t("serviceRequest.spareParts.title")}</div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {r.sparePartsNeeded.map((p, idx) => (
                            <div key={idx} className="rounded border p-2 flex items-center justify-between">
                              <div className="truncate">
                                <span className="font-medium">{p.part}</span>
                                <span className="ml-2 text-muted-foreground">x{p.quantity}</span>
                              </div>
                              {p.cost ? (
                                <div className="text-xs text-muted-foreground">
                                  {(Number(p.cost) * Number(p.quantity || 0)).toFixed(2)}
                                </div>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">{t("serviceRequest.approvalStatus")}</div>
                        {r.approvalStatus === ServiceRequestApprovalStatus.PENDING && canApprove ? (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="gap-1"
                              disabled={isUpdatingApproval}
                              onClick={() => changeStatus(r.id, "approval", ServiceRequestApprovalStatus.APPROVED)}>
                              {isUpdatingApproval ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Check className="h-4 w-4" />
                              )}{" "}
                              {t("serviceRequest.statuses.approved")}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="gap-1"
                              disabled={isUpdatingApproval}
                              onClick={() => changeStatus(r.id, "approval", ServiceRequestApprovalStatus.REJECTED)}>
                              {isUpdatingApproval ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <X className="h-4 w-4" />
                              )}{" "}
                              {t("serviceRequest.statuses.rejected")}
                            </Button>
                          </div>
                        ) : (
                          <Badge className="capitalize">{r.approvalStatus}</Badge>
                        )}
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">{t("serviceRequest.workStatus")}</div>
                        {r.workStatus === ServiceRequestWorkStatus.PENDING ? (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="gap-1"
                              disabled={isUpdatingWork}
                              onClick={() => changeStatus(r.id, "work", ServiceRequestWorkStatus.COMPLETED)}>
                              {isUpdatingWork ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Check className="h-4 w-4" />
                              )}{" "}
                              {t("serviceRequest.statuses.completed")}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1"
                              disabled={isUpdatingWork}
                              onClick={() => changeStatus(r.id, "work", ServiceRequestWorkStatus.CANCELLED)}>
                              {isUpdatingWork ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <X className="h-4 w-4" />
                              )}{" "}
                              {t("serviceRequest.statuses.cancelled")}
                            </Button>
                          </div>
                        ) : (
                          <Badge className="capitalize">{r.workStatus}</Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => window.open(`/service-requests/${r.id}/print`, "_blank", "noopener,noreferrer")}>
                        <Printer className="h-4 w-4 mr-1 rtl:mr-0 rtl:ml-1" />
                        Print
                      </Button>
                      {canEditDetails && (
                        <ServiceRequestDialog
                          equipmentId={r.equipmentId}
                          existingId={r.id}
                          trigger={
                            <Button size="sm" variant="outline">
                              <Pencil className="h-4 w-4 mr-1 rtl:mr-0 rtl:ml-1" />
                              {t("equipment.edit")}
                            </Button>
                          }
                          onUpdated={async () => {
                            try {
                              const res = await fetch(`/api/service-request?page=${page}&pageSize=${pageSize}`, { cache: "no-store" });
                              const j = await res.json();
                              setRows(j.data || []);
                            } catch {}
                          }}
                        />
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
        {!loading && (
          <div className="flex items-center justify-between gap-3">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setPage((p) => Math.max(1, p - 1));
                    }}
                    className={page <= 1 ? "pointer-events-none opacity-50" : undefined}
                  />
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      const totalPages = Math.max(1, Math.ceil(total / pageSize));
                      setPage((p) => Math.min(totalPages, p + 1));
                    }}
                    className={page >= Math.max(1, Math.ceil(total / pageSize)) ? "pointer-events-none opacity-50" : undefined}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </main>
    </div>
  );
};

export default Page;
