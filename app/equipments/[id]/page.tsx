"use client";

import { useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import Header from "@/components/Header";
import EquipmentCard from "@/components/EquipmentCard";
import ServiceRequestCard from "@/components/ServiceRequestCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import ServiceRequestDialog from "@/components/ServiceRequestDialog";
import { useLanguage } from "@/hooks/useLanguage";
import { useServiceRequests } from "@/hooks/useServiceRequests";
import { useEquipment } from "@/hooks/useEquipment";
import type { JEquipment } from "@/lib/types";
import { ServiceRequestApprovalStatus, ServiceRequestWorkStatus } from "@/lib/types";

const DetailPage = () => {
  const params = useParams<{ id: string }>();
  const id = params?.id as string;
  const { t } = useLanguage();

  const { currentEquipment, loadEquipmentById, loading: eqLoading, error: eqError } = useEquipment(false);
  const { requests, changeApprovalStatus, changeWorkStatus, updatingById, loadForEquipment, loading: reqLoading, error: reqError } = useServiceRequests({ autoRefresh: false });

  useEffect(() => {
    if (!id) return;
    void loadEquipmentById(id);
    void loadForEquipment(id, { page: 1, pageSize: 100 });
  }, [id, loadEquipmentById, loadForEquipment]);

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
        {eqLoading || reqLoading ? (
          <div className="text-sm text-muted-foreground">{t("loading") || "Loading..."}</div>
        ) : eqError || reqError ? (
          <div className="text-sm text-destructive">{eqError || reqError}</div>
        ) : equipmentForCard ? (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">{currentEquipment?.name}</h2>
              <ServiceRequestDialog equipmentId={id} equipmentName={currentEquipment?.name} trigger={<Button>{t("serviceRequest.create") || "New Request"}</Button>} />
            </div>

            <EquipmentCard equipment={equipmentForCard} />

            <div className="space-y-4">
              <h3 className="text-lg font-medium">{t("serviceRequest.title") || "Service Requests"}</h3>
              {requests.length === 0 ? (
                <Card className="p-6 text-sm text-muted-foreground">{t("serviceRequest.none") || "No requests for this equipment yet."}</Card>
              ) : (
                <div className="grid grid-cols-1 gap-4">
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
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default DetailPage;
