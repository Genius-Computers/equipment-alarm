"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ServiceRequestApprovalStatus, ServiceRequestWorkStatus } from "@/lib/types";
import type { JServiceRequest } from "@/lib/types/service-request";
import { useLanguage } from "@/hooks/useLanguage";
import { Wrench, Check, X, Loader2, Pencil, User, Ticket, Flag, Bell } from "lucide-react";
import Link from "next/link";
import ExpandableText from "@/components/ExpandableText";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
// removed unused AlertDialog imports
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { formatSaudiDateTime } from "@/lib/utils";
import { useSelfProfile } from "@/hooks/useSelfProfile";

function OperationalStatusEditor({
  role,
  userId,
  equipmentId,
  requestId,
  onComplete,
  onCancel,
  initialEquipmentStatus,
  t,
  updating,
  setUpdating,
  setEquipmentStatus,
}: {
  role: string | null;
  userId: string | null;
  equipmentId: string;
  requestId: string;
  onComplete?: (id: string) => void;
  onCancel?: (id: string) => void;
  initialEquipmentStatus: string;
  t: (k: string, o?: Record<string, unknown>) => string;
  updating: boolean;
  setUpdating: (v: boolean) => void;
  setEquipmentStatus: (v: string) => void;
}) {
  const [draft, setDraft] = useState<"operational" | "under_repair" | "completed" | "cancelled" | "">(
    initialEquipmentStatus === 'Operational' ? 'operational' : (initialEquipmentStatus === 'Under Repair, Waiting for Spare Parts' ? 'under_repair' : '')
  );
  const [dirty, setDirty] = useState(false);

  const isSupervisorOrAdmin = role === 'admin' || role === 'admin_x' || role === 'supervisor';

  const applyChange = async () => {
    if (!draft) return;
    try {
      setUpdating(true);
      if (draft === 'operational' || draft === 'under_repair') {
        const next = draft === 'operational' ? 'Operational' : 'Under Repair, Waiting for Spare Parts';
        setEquipmentStatus(next);
        await fetch(`/api/equipment/${equipmentId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: next })
        });
      } else if (isSupervisorOrAdmin && (draft === 'completed' || draft === 'cancelled')) {
        if (draft === 'completed') {
          if (typeof onComplete === 'function') onComplete(requestId);
          else {
            await fetch(`/api/service-request/${requestId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ workStatus: 'completed' })
            });
          }
        } else {
          if (typeof onCancel === 'function') onCancel(requestId);
          else {
            await fetch(`/api/service-request/${requestId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ workStatus: 'cancelled' })
            });
          }
        }
      }
      setDirty(false);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Select
        value={draft}
        onValueChange={(value) => { setDraft(value as typeof draft); setDirty(true); }}
        disabled={updating}
      >
        <SelectTrigger className="h-8 w-full sm:w-[360px]">
          <SelectValue placeholder={t('serviceRequest.operational.select')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="operational">{t('serviceRequest.operational.operational')}</SelectItem>
          <SelectItem value="under_repair">{t('serviceRequest.operational.underRepair')}</SelectItem>
          {isSupervisorOrAdmin ? (
            <>
              <SelectItem value="completed">{t('serviceRequest.statuses.completed')}</SelectItem>
              <SelectItem value="cancelled">{t('serviceRequest.statuses.cancelled')}</SelectItem>
            </>
          ) : null}
        </SelectContent>
      </Select>
      {(dirty || updating) ? (
        <Button size="sm" onClick={applyChange} disabled={!dirty || updating} className="gap-1">
          {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
        </Button>
      ) : null}
    </div>
  );
}

interface ServiceRequestCardProps {
  request: JServiceRequest;
  canApprove: boolean;
  canEdit?: boolean; // If false, user can only view (read-only mode)
  isUpdatingApproval?: boolean;
  isUpdatingWork?: boolean;
  onApprove?: (id: string, note?: string) => void;
  onReject?: (id: string, note?: string) => void;
  onComplete?: (id: string) => void;
  onCancel?: (id: string) => void;
  // onEdited kept for backward compat in parent; not used internally
  onEdited?: () => void;
}

export default function ServiceRequestCard({
  request,
  canApprove,
  canEdit = true, // Default to true for backward compatibility
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
  const [noteOpen, setNoteOpen] = useState<null | { id: string; action: 'approve' | 'reject' }>(null);
  const [note, setNote] = useState("");
  const [equipmentStatus, setEquipmentStatus] = useState<string>(request.equipment?.status || "");
  const [updatingEquipmentStatus, setUpdatingEquipmentStatus] = useState(false);
  const { profile } = useSelfProfile();
  const role = profile?.role || null;
  const userId = profile?.id || null;
  const canEditDetails = canEdit; // Only allow editing if user has edit permissions

  const operationalLabel = equipmentStatus === 'Operational'
    ? t('serviceRequest.operational.operational')
    : (equipmentStatus === 'Under Repair, Waiting for Spare Parts'
      ? t('serviceRequest.operational.underRepair')
      : '-');

  const technicianLabel = request.technician?.displayName || request.technician?.email || request.assignedTechnicianId;

  const isOverdue = (() => {
    try {
      const scheduled = new Date(request.scheduledAt).getTime();
      const fiveDaysMs = 5 * 24 * 60 * 60 * 1000;
      return request.workStatus === ServiceRequestWorkStatus.PENDING && Date.now() - scheduled > fiveDaysMs;
    } catch {
      return false;
    }
  })();

  // Consider details pending if any technician-side fields are empty while pending
  const detailsPending =
    (request.workStatus === ServiceRequestWorkStatus.PENDING ||
      request.approvalStatus === ServiceRequestApprovalStatus.PENDING) &&
    (!request.technicalAssessment?.trim?.() ||
      !request.recommendation?.trim?.() ||
      !request.problemDescription?.trim());

  // Add Details button should be enabled only when approval is approved (avoid flicker)
  const canAddDetails = request.approvalStatus === ServiceRequestApprovalStatus.APPROVED;

  // Highlight pending approval for supervisors
  const needsApproval = request.approvalStatus === ServiceRequestApprovalStatus.PENDING && canApprove;
  const cardClassName = needsApproval 
    ? "hover:shadow-lg transition-shadow duration-200 border-2 border-amber-400 dark:border-amber-600 bg-amber-50/30 dark:bg-amber-950/20"
    : "hover:shadow-lg transition-shadow duration-200";

  return (
    <Card className={cardClassName}>
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
            <Badge variant="secondary">
              {request.priority === 'low' ? t('priority.low') :
               request.priority === 'medium' ? t('priority.medium') :
               request.priority === 'high' ? t('priority.high') :
               request.priority === 'urgent' ? t('priority.urgent') :
               request.priority}
            </Badge>
            {isOverdue ? (
              <span title={t('serviceRequest.overdue')}>
                <Flag className="h-4 w-4 text-red-600" />
              </span>
            ) : null}
            {needsApproval && (
              <span title={t('serviceRequest.awaitingApproval')} className="flex items-center gap-1 bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 px-2 py-1 rounded-md text-xs font-semibold animate-pulse">
                <Bell className="h-4 w-4" />
                {t('serviceRequest.needsApproval')}
              </span>
            )}
          </div>
        </CardTitle>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className="bg-primary/10 text-primary border-primary/20 capitalize">
            {t("serviceRequest.approvalStatus")}: {request.approvalStatus}
          </Badge>
          <Badge className="bg-muted text-foreground/80 border border-border capitalize">
            {t("serviceRequest.operational.status")}: {operationalLabel}
          </Badge>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">{t("equipment.label")}:</span>
            <span className="text-sm font-medium">{request.equipment?.name || request.equipmentId}</span>
          </div>
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
                  {!canAddDetails && (
                    <span className="block mt-1 text-amber-700 dark:text-amber-300">
                      (Awaiting approval)
                    </span>
                  )}
                </span>
                {canAddDetails ? (
                  <Link href={`/service-requests/${request.id}/edit`}>
                    <Button size="sm" className="gap-1 whitespace-nowrap">
                      {t("serviceRequest.addDetails")}
                    </Button>
                  </Link>
                ) : (
                  <Button size="sm" className="gap-1 whitespace-nowrap" disabled>
                    {t("serviceRequest.addDetails")}
                  </Button>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}
        <div className="text-sm text-muted-foreground">
          {t("serviceRequest.scheduledAt")}: {formatSaudiDateTime(request.scheduledAt)}
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

        {canEdit && (
          <div className="grid grid-cols-1 gap-3">
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">{t("serviceRequest.approvalStatus")}</div>
              {request.approvalStatus === ServiceRequestApprovalStatus.PENDING && canApprove ? (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="gap-1"
                    disabled={isUpdatingApproval}
                    onClick={() => setNoteOpen({ id: request.id, action: 'approve' })}>
                    {isUpdatingApproval ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} {" "}
                    {t("serviceRequest.statuses.approved")}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="gap-1"
                    disabled={isUpdatingApproval}
                    onClick={() => setNoteOpen({ id: request.id, action: 'reject' })}>
                    {isUpdatingApproval ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />} {" "}
                    {t("serviceRequest.statuses.rejected")}
                  </Button>
                </div>
              ) : (
                <Badge className="capitalize">{request.approvalStatus}</Badge>
              )}
            </div>

            {/* Old work status block removed */}

            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">{t("serviceRequest.operational.status")}</div>
              {(() => {
                const isSupervisorOrAdmin = role === 'admin' || role === 'admin_x' || role === 'supervisor';
                const isAssignedTechnician = Boolean(request.assignedTechnicianId && userId && request.assignedTechnicianId === userId);
                const noAssignedTechnician = !request.assignedTechnicianId;
                const canChangeOperational = isSupervisorOrAdmin || (role === 'technician' && (isAssignedTechnician || noAssignedTechnician));
                if (request.workStatus === ServiceRequestWorkStatus.COMPLETED) return false;
                if (!canChangeOperational) return false;
                if (request.approvalStatus !== ServiceRequestApprovalStatus.APPROVED) return false; // ensure disabled until approved
                return true;
              })() ? (
                <OperationalStatusEditor
                  role={role}
                  userId={userId}
                  equipmentId={request.equipmentId}
                  requestId={request.id}
                  onComplete={onComplete}
                  onCancel={onCancel}
                  initialEquipmentStatus={equipmentStatus}
                  t={t}
                  updating={updatingEquipmentStatus}
                  setUpdating={setUpdatingEquipmentStatus}
                  setEquipmentStatus={setEquipmentStatus}
                />
              ) : (
                (() => {
                  if (request.workStatus !== ServiceRequestWorkStatus.COMPLETED) {
                    return (
                      <div className="opacity-70">
                        <Select value={""} disabled>
                          <SelectTrigger className="h-8 w-full sm:w-[360px]">
                            <SelectValue placeholder={operationalLabel || t('serviceRequest.operational.select')} />
                          </SelectTrigger>
                        </Select>
                      </div>
                    );
                  }
                  return <Badge className="capitalize">{operationalLabel}</Badge>;
                })()
              )}
            </div>
          </div>
        )}
        <div className="flex gap-2">
          {canEditDetails && !detailsPending && (
            <Link href={`/service-requests/${request.id}/edit`}>
                <Button size="sm" variant="outline">
                  <Pencil className="h-4 w-4 mr-1 rtl:mr-0 rtl:ml-1" />
                  {t("equipment.edit")}
                </Button>
            </Link>
          )}
        </div>
      </CardContent>
      {request.approvalStatus !== ServiceRequestApprovalStatus.PENDING && request.approvalNote ? (
        <div className="px-6 pb-4">
          <Alert>
            <AlertTitle>Supervisor note</AlertTitle>
            <AlertDescription className="whitespace-pre-wrap break-words">{request.approvalNote}</AlertDescription>
          </Alert>
        </div>
      ) : null}
      <Dialog open={!!noteOpen} onOpenChange={(v) => { if (!v) { setNoteOpen(null); setNote(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supervisor note (optional)</DialogTitle>
          </DialogHeader>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Supervisor note (optional)" />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setNoteOpen(null); setNote(""); }}>{t('form.cancel')}</Button>
            <Button onClick={() => {
              if (!noteOpen) return;
              if (noteOpen.action === 'approve') onApprove?.(noteOpen.id as string, note);
              else onReject?.(noteOpen.id as string, note);
              setNoteOpen(null); setNote("");
            }}>{t('form.save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Confirmation dialog removed in favor of inline apply button */}
    </Card>
  );
}
