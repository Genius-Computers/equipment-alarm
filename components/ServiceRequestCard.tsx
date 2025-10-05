"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ServiceRequestApprovalStatus, ServiceRequestWorkStatus } from "@/lib/types";
import type { JServiceRequest } from "@/lib/types/service-request";
import { useLanguage } from "@/hooks/useLanguage";
import { Wrench, Check, X, Loader2, Pencil, User, Ticket } from "lucide-react";
import ServiceRequestDialog from "@/components/ServiceRequestDialog";
import ExpandableText from "@/components/ExpandableText";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface ServiceRequestCardProps {
  request: JServiceRequest;
  canApprove: boolean;
  isUpdatingApproval?: boolean;
  isUpdatingWork?: boolean;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  onComplete?: (id: string) => void;
  onCancel?: (id: string) => void;
  // onEdited kept for backward compat in parent; not used internally
  onEdited?: () => void;
}

export default function ServiceRequestCard({
  request,
  canApprove,
  isUpdatingApproval,
  isUpdatingWork,
  onApprove,
  onReject,
  onComplete,
  onCancel,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onEdited,
}: ServiceRequestCardProps) {
  const { t } = useLanguage();
  const canEditDetails = true;
  // request.approvalStatus === ServiceRequestApprovalStatus.PENDING &&
  // request.workStatus === ServiceRequestWorkStatus.PENDING;

  const technicianLabel = request.technician?.displayName || request.technician?.email || request.assignedTechnicianId;

  // Consider details pending if any technician-side fields are empty while pending
  const detailsPending =
    (request.workStatus === ServiceRequestWorkStatus.PENDING ||
      request.approvalStatus === ServiceRequestApprovalStatus.PENDING) &&
    (!request.technicalAssessment?.trim?.() ||
      !request.recommendation?.trim?.() ||
      !request.problemDescription?.trim());

  return (
    <Card className="hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="flex-row items-center justify-between gap-2">
        <CardTitle className="flex flex-col gap-2">
          {request.ticketId && (
            <div className="flex items-center gap-2">
              <Ticket className="h-5 w-5" />
              <span className="text-sm text-muted-foreground">{request.ticketId}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            <span className="capitalize">{request.requestType.replaceAll("_", " ")}</span>
            <Badge variant="secondary">{request.priority}</Badge>
          </div>
        </CardTitle>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className="bg-primary/10 text-primary border-primary/20 capitalize">
            {t("serviceRequest.approvalStatus")}: {request.approvalStatus}
          </Badge>
          <Badge className="bg-muted text-foreground/80 border border-border capitalize">
            {t("serviceRequest.workStatus")}: {request.workStatus}
          </Badge>
          <span className="text-sm text-muted-foreground">{request.equipment?.name || request.equipmentId}</span>
          {technicianLabel ? (
            <Badge variant="outline" title={t("serviceRequest.assignedTechnician")} className="capitalize">
              <User className="h-3 w-3" /> {technicianLabel}
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {detailsPending && (
          <Alert>
            <AlertTitle>{t("serviceRequest.detailsPendingTitle")}</AlertTitle>
            <AlertDescription className="min-w-0">
              <div className="flex w-full flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
                <span className="text-xs sm:text-sm min-w-0 break-words">
                  {t("serviceRequest.detailsPendingDesc")}
                </span>
                <ServiceRequestDialog
                  equipmentId={request.equipmentId}
                  existing={request}
                  trigger={
                    <Button size="sm" className="gap-1 whitespace-nowrap">
                      {t("serviceRequest.addDetails")}
                    </Button>
                  }
                />
              </div>
            </AlertDescription>
          </Alert>
        )}
        <div className="text-sm text-muted-foreground">
          {t("serviceRequest.scheduledAt")}: {new Date(request.scheduledAt).toLocaleString()}
        </div>

        {request.problemDescription ? (
          <div className="text-sm space-y-1">
            <span className="text-muted-foreground">{t("serviceRequest.problemDescription")}:</span>
            <ExpandableText text={request.problemDescription} />
          </div>
        ) : null}

        {request.technicalAssessment ? (
          <div className="text-sm space-y-1">
            <span className="text-muted-foreground">{t("serviceRequest.technicalAssessment")}:</span>
            <ExpandableText text={request.technicalAssessment} />
          </div>
        ) : null}

        {request.recommendation ? (
          <div className="text-sm space-y-1">
            <span className="text-muted-foreground">{t("serviceRequest.recommendation")}:</span>
            <ExpandableText text={request.recommendation} />
          </div>
        ) : null}

        {Array.isArray(request.sparePartsNeeded) && request.sparePartsNeeded.length > 0 ? (
          <div className="text-sm space-y-1">
            <div className="text-muted-foreground">{t("serviceRequest.spareParts.title")}</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {request.sparePartsNeeded.map((p, idx) => (
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

        <div className="grid grid-cols-1 gap-3">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">{t("serviceRequest.approvalStatus")}</div>
            {request.approvalStatus === ServiceRequestApprovalStatus.PENDING && canApprove ? (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="gap-1"
                  disabled={isUpdatingApproval}
                  onClick={() => onApprove?.(request.id)}>
                  {isUpdatingApproval ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}{" "}
                  {t("serviceRequest.statuses.approved")}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="gap-1"
                  disabled={isUpdatingApproval}
                  onClick={() => onReject?.(request.id)}>
                  {isUpdatingApproval ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}{" "}
                  {t("serviceRequest.statuses.rejected")}
                </Button>
              </div>
            ) : (
              <Badge className="capitalize">{request.approvalStatus}</Badge>
            )}
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">{t("serviceRequest.workStatus")}</div>
            {request.workStatus === ServiceRequestWorkStatus.PENDING &&
            request.approvalStatus === ServiceRequestApprovalStatus.APPROVED ? (
              <div className="flex gap-2">
                <Button size="sm" className="gap-1" disabled={isUpdatingWork} onClick={() => onComplete?.(request.id)}>
                  {isUpdatingWork ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}{" "}
                  {t("serviceRequest.statuses.completed")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1"
                  disabled={isUpdatingWork}
                  onClick={() => onCancel?.(request.id)}>
                  {isUpdatingWork ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}{" "}
                  {t("serviceRequest.statuses.cancelled")}
                </Button>
              </div>
            ) : (
              <Badge className="capitalize">{request.workStatus}</Badge>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {canEditDetails && !detailsPending && (
            <ServiceRequestDialog
              equipmentId={request.equipmentId}
              existing={request}
              trigger={
                <Button size="sm" variant="outline">
                  <Pencil className="h-4 w-4 mr-1 rtl:mr-0 rtl:ml-1" />
                  {t("equipment.edit")}
                </Button>
              }
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
