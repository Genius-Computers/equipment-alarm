"use client";

import { useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import Header from "@/components/Header";
import EquipmentCard from "@/components/EquipmentCard";
import ServiceRequestCard from "@/components/ServiceRequestCard";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/hooks/useLanguage";
import { useServiceRequests } from "@/hooks/useServiceRequests";
import { useEquipment } from "@/hooks/useEquipment";
import type { JEquipment } from "@/lib/types";
import { ServiceRequestApprovalStatus, ServiceRequestWorkStatus } from "@/lib/types";
import CustomPagination from "@/components/CustomPagination";

const DetailPage = () => {
  const params = useParams<{ id: string }>();
  const id = params?.id as string;
  const { t } = useLanguage();

  const { currentEquipment, loadEquipmentById, loading: eqLoading, error: eqError } = useEquipment(false);
  const {
    requests,
    changeApprovalStatus,
    changeWorkStatus,
    updatingById,
    loadForEquipment,
    loading: reqLoading,
    error: reqError,
    page,
    pageSize,
    total,
    setPage,
    scope,
    setScope,
  } = useServiceRequests({ autoRefresh: false });

  useEffect(() => {
    if (!id) return;
    void loadEquipmentById(id);
  }, [id, loadEquipmentById]);

  useEffect(() => {
    if (!id) return;
    void loadForEquipment(id, { page, pageSize, scope });
  }, [id, page, pageSize, scope, loadForEquipment]);

  const equipmentForCard = useMemo(() => {
    if (!currentEquipment) return null;
    const latest = requests
      .filter((r) => r.approvalStatus === "pending" || r.workStatus === "pending")
      .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())[0];
    return { ...currentEquipment, latestPendingServiceRequest: latest } as unknown as JEquipment;
  }, [currentEquipment, requests]);

  const handleApprove = async (requestId: string) => {
    await changeApprovalStatus(requestId, ServiceRequestApprovalStatus.APPROVED);
  };
  const handleReject = async (requestId: string) => {
    await changeApprovalStatus(requestId, ServiceRequestApprovalStatus.REJECTED);
  };
  const handleComplete = async (requestId: string) => {
    await changeWorkStatus(requestId, ServiceRequestWorkStatus.COMPLETED);
  };
  const handleCancel = async (requestId: string) => {
    await changeWorkStatus(requestId, ServiceRequestWorkStatus.CANCELLED);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-6 py-8">
        {eqLoading ? (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-9 w-36" />
            </div>

            <Card>
              <CardHeader>
                <Skeleton className="h-5 w-40" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-4 w-64" />
                <Skeleton className="h-4 w-52" />
                <Skeleton className="h-4 w-56" />
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-6 w-48" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-8 w-24" />
                </div>
              </div>
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
            </div>
          </div>
        ) : eqError || reqError ? (
          <div className="text-sm text-destructive">{eqError || reqError}</div>
        ) : equipmentForCard ? (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">{currentEquipment?.name}</h2>
              {/* Service requests are now created via Job Orders module */}
            </div>

            <EquipmentCard equipment={equipmentForCard} />

            <div className="space-y-4 pt-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">{t("serviceRequest.title")}</h3>
                <div className="flex items-center gap-2">
                  <button
                    className={`px-3 py-1 rounded border text-sm ${scope === "pending" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                    onClick={() => setScope("pending")}
                  >
                    Pending
                  </button>
                  <button
                    className={`px-3 py-1 rounded border text-sm ${scope === "completed" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                    onClick={() => setScope("completed")}
                  >
                    Completed
                  </button>
                </div>
              </div>

              {reqLoading ? (
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
              ) : requests.length === 0 ? (
                <Card className="p-6 text-sm text-muted-foreground">{t("serviceRequest.none") || "No requests for this equipment yet."}</Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {requests.map((req) => (
                    <ServiceRequestCard
                      key={req.id}
                      request={req}
                      canApprove={true}
                      isUpdatingApproval={Boolean(updatingById[req.id]?.approval)}
                      isUpdatingWork={Boolean(updatingById[req.id]?.work)}
                      onApprove={handleApprove}
                      onReject={handleReject}
                      onComplete={handleComplete}
                      onCancel={handleCancel}
                      onEdited={() => loadForEquipment(id, { page, pageSize, scope })}
                    />
                  ))}
                </div>
              )}

              <CustomPagination
                page={page}
                pageSize={pageSize}
                total={total}
                onPrev={() => setPage(Math.max(1, page - 1))}
                onNext={() => {
                  const totalPages = Math.max(1, Math.ceil(total / pageSize));
                  setPage(Math.min(totalPages, page + 1));
                }}
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default DetailPage;
