"use client";
import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Wrench, PlusCircle, Loader2, PrinterIcon } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { toast } from "sonner";
import {
  ServiceRequestType,
  ServiceRequestPriority,
  ServiceRequestApprovalStatus,
  ServiceRequestWorkStatus,
} from "@/lib/types";
import type { JServiceRequest } from "@/lib/types/service-request";
import { useServiceRequests } from "@/hooks/useServiceRequests";
import { useSelfProfile } from "@/hooks/useSelfProfile";
import { isApproverRole } from "@/lib/types/user";

interface ServiceRequestDialogProps {
  equipmentId: string;
  equipmentName?: string;
  trigger?: React.ReactNode;
  existing?: JServiceRequest;
  onCreated?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const ServiceRequestDialog = ({
  equipmentId,
  equipmentName,
  trigger,
  existing,
  onCreated,
  open: externalOpen,
  onOpenChange: externalOnOpenChange,
}: ServiceRequestDialogProps) => {
  const { t } = useLanguage();
  const [internalOpen, setInternalOpen] = useState(false);
  
  // Use external control if provided, otherwise use internal state
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = (value: boolean) => {
    if (externalOnOpenChange) {
      externalOnOpenChange(value);
    } else {
      setInternalOpen(value);
    }
  };
  const [loading, setLoading] = useState(false);
  const [previewTicketId, setPreviewTicketId] = useState<string>("");
  // Two-section model for edit: 'basic' and 'details'
  const [section, setSection] = useState<"basic" | "details">("basic");
  const { createRequest, updateDetails } = useServiceRequests({ autoRefresh: false });
  const { profile } = useSelfProfile();
  const isApprover = isApproverRole(profile?.role);

  // Fetch preview ticket ID when dialog opens (server authoritative)
  useEffect(() => {
    const fetchNext = async () => {
      try {
        console.log('Fetching next ticket ID...');
        const res = await fetch(`/api/service-request?nextTicket=true`, { cache: 'no-store' });
        console.log('Response status:', res.status);
        if (res.ok) {
          const j = await res.json();
          console.log('Response data:', j);
          const id = j?.data?.nextTicketId as string | undefined;
          if (id) {
            console.log('Setting preview ticket ID:', id);
            setPreviewTicketId(id);
          }
        } else {
          console.error('Failed to fetch next ticket ID:', res.status);
          // Fallback: generate a basic preview ticket ID
          const now = new Date();
          const yyyy = String(now.getFullYear());
          const mm = String(now.getMonth() + 1).padStart(2, '0');
          const dd = String(now.getDate()).padStart(2, '0');
          const fallbackId = `${yyyy}-${mm}-${dd}-001`;
          console.log('Using fallback ticket ID:', fallbackId);
          setPreviewTicketId(fallbackId);
        }
      } catch (error) {
        console.error('Error fetching next ticket ID:', error);
        // Fallback: generate a basic preview ticket ID
        const now = new Date();
        const yyyy = String(now.getFullYear());
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const fallbackId = `${yyyy}-${mm}-${dd}-001`;
        console.log('Using fallback ticket ID:', fallbackId);
        setPreviewTicketId(fallbackId);
      }
    };
    if (open && !existing) fetchNext();
  }, [open, existing]);

  const [form, setForm] = useState({
    requestType: ServiceRequestType.PREVENTIVE_MAINTENANCE,
    scheduledAt: "",
    priority: ServiceRequestPriority.MEDIUM,
    assignedTechnicianId: "",
    problemDescription: "",
    technicalAssessment: "",
    recommendation: "",
  });

  type Technician = { id: string; displayName?: string | null; email?: string | null };
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [techLoading, setTechLoading] = useState(false);

  useEffect(() => {
    const loadTechnicians = async () => {
      try {
        setTechLoading(true);
        const res = await fetch(`/api/users?onlyTechnicians=true`);
        if (!res.ok) return;
        const j = (await res.json()) as { data?: Array<{ id: string; displayName?: string; email?: string }> };
        if (Array.isArray(j.data)) setTechnicians(j.data);
      } catch {
        // ignore silently
      } finally {
        setTechLoading(false);
      }
    };
    if (open && technicians.length === 0) loadTechnicians();
  }, [open, technicians.length]);

  type SparePart = { part: string; description?: string; quantity: number; cost: number; source: string };
  const [parts, setParts] = useState<SparePart[]>([]);
  const [draft, setDraft] = useState<SparePart>({ part: "", description: "", quantity: 1, cost: 0, source: "" });

  const isValid = useMemo(() => {
    return (
      !!form.requestType &&
      !!form.priority &&
      !!form.scheduledAt &&
      !!form.assignedTechnicianId
    );
  }, [form]);

  const totalCost = useMemo(
    () => parts.reduce((sum, p) => sum + (Number(p.cost) || 0) * (Number(p.quantity) || 0), 0),
    [parts]
  );

  // Initialize form from existing when prop changes or dialog opens
  useEffect(() => {
    if (!existing) return;
    setForm({
      requestType: existing.requestType,
      scheduledAt: (existing.scheduledAt || "").slice(0, 16),
      priority: existing.priority,
      assignedTechnicianId: existing.assignedTechnicianId || "",
      problemDescription: existing.problemDescription || "",
      technicalAssessment: existing.technicalAssessment || "",
      recommendation: existing.recommendation || "",
    });
    setParts(existing.sparePartsNeeded || []);
  }, [existing, open]);

  const handleSubmit = async () => {
    try {
      setLoading(true);
      if (existing) {
        const body = isApprover
          ? {
              requestType: form.requestType,
              scheduledAt: form.scheduledAt,
              priority: form.priority,
              assignedTechnicianId: form.assignedTechnicianId,
              problemDescription: form.problemDescription,
              technicalAssessment: form.technicalAssessment,
              recommendation: form.recommendation,
              sparePartsNeeded: parts,
            }
          : {
              problemDescription: form.problemDescription,
              technicalAssessment: form.technicalAssessment,
              recommendation: form.recommendation,
              sparePartsNeeded: parts,
            };
        await updateDetails(existing.id, body);
        toast(t("toast.success"), { description: t("toast.serviceRequestUpdated") });
      } else {
        const created = await createRequest({
          equipmentId,
          requestType: form.requestType,
          scheduledAt: form.scheduledAt,
          priority: form.priority,
          approvalStatus: ServiceRequestApprovalStatus.PENDING,
          workStatus: ServiceRequestWorkStatus.PENDING,
          assignedTechnicianId: form.assignedTechnicianId,
          problemDescription: form.problemDescription,
          technicalAssessment: form.technicalAssessment,
          recommendation: form.recommendation,
          sparePartsNeeded: parts,
        });
        toast(t("toast.success"), { description: t("toast.serviceRequestCreated") });
        onCreated?.();
        // Redirect to maintenance schedule preview instead of opening print dialog
        if (created?.id) {
          window.location.href = "/service-requests";
        }
      }
      setOpen(false);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Action failed";
      toast(t("toast.error"), { description: message });
    } finally {
      setLoading(false);
    }
  };

  const isBlockingLoading = open && techLoading && technicians.length === 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setSection("basic");
      }}>
      <DialogTrigger asChild>
        <div className="flex gap-2">
          {trigger || (
            <Button size="sm" className="gap-1">
              <PlusCircle className="h-4 w-4" />
              {t("serviceRequest.newRequest")}
            </Button>
          )}
          {existing?.id && (
            <Button
              onClick={(e) => {
                e.stopPropagation();
                const url = `/service-requests/${existing.id}/print`;
                window.open(url, "_blank", "noopener,noreferrer");
              }}
              size="sm"
              className="gap-1">
              <PrinterIcon className="h-4 w-4" />
            </Button>
          )}
        </div>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-primary" />
            {existing ? t("serviceRequest.editTitle") : t("serviceRequest.createTitle")}{" "}
            {equipmentName ? (
              <Badge variant="secondary" className="ml-2">
                {equipmentName}
              </Badge>
            ) : null}
          </DialogTitle>
          <DialogDescription>{t("serviceRequest.description")}</DialogDescription>
          {!existing && previewTicketId && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-sm font-medium">{t("serviceRequest.ticketId")}:</span>
              <Badge variant="outline" className="font-mono text-xs">
                {previewTicketId}
              </Badge>
            </div>
          )}
        </DialogHeader>

        {/* section switcher for editing */}
        {existing ? (
          <div className="flex items-center gap-2 mb-2">
            {isApprover ? (
              <div className="inline-flex rounded-md border bg-muted/50 p-1">
                <button
                  type="button"
                  className={`px-3 py-1 text-sm rounded ${section === "basic" ? "bg-background border" : ""}`}
                  onClick={() => setSection("basic")}
                  disabled={loading}
                >
                  {t("serviceRequest.basic") || "Basic"}
                </button>
                <button
                  type="button"
                  className={`px-3 py-1 text-sm rounded ${section === "details" ? "bg-background border" : ""}`}
                  onClick={() => setSection("details")}
                  disabled={loading}
                >
                  {t("serviceRequest.details") || "Technician Details"}
                </button>
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">{t("serviceRequest.details") || "Technician Details"}</div>
            )}
          </div>
        ) : null}

        {isBlockingLoading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-9 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-9 w-full" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-9 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-9 w-full" />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Creation: single basic form. Editing: basic section (approver only) */}
            {(!existing || (existing && section === "basic" && isApprover)) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label>{t("serviceRequest.requestType")}</Label>
                  <Select
                    value={form.requestType}
                    onValueChange={(v) => setForm((s) => ({ ...s, requestType: v as ServiceRequestType }))}
                    disabled={Boolean(existing) && !isApprover}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("serviceRequest.selectType")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ServiceRequestType.PREVENTIVE_MAINTENANCE}>
                        {t("serviceRequest.types.preventive")}
                      </SelectItem>
                      <SelectItem value={ServiceRequestType.CORRECTIVE_MAINTENANCE}>
                        {t("serviceRequest.types.corrective")}
                      </SelectItem>
                      <SelectItem value={ServiceRequestType.INSTALL}>{t("serviceRequest.types.install")}</SelectItem>
                      <SelectItem value={ServiceRequestType.ASSESS}>{t("serviceRequest.types.assess")}</SelectItem>
                      <SelectItem value={ServiceRequestType.OTHER}>{t("serviceRequest.types.other")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label>{t("serviceRequest.priority")}</Label>
                  <Select
                    value={form.priority}
                    onValueChange={(v) => setForm((s) => ({ ...s, priority: v as ServiceRequestPriority }))}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("serviceRequest.selectPriority")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ServiceRequestPriority.LOW}>{t("serviceRequest.priorities.low")}</SelectItem>
                      <SelectItem value={ServiceRequestPriority.MEDIUM}>
                        {t("serviceRequest.priorities.medium")}
                      </SelectItem>
                      <SelectItem value={ServiceRequestPriority.HIGH}>{t("serviceRequest.priorities.high")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {(!existing || (existing && section === "basic" && isApprover)) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label>{t("serviceRequest.scheduledAt")}</Label>
                  <Input
                    type="datetime-local"
                    value={form.scheduledAt}
                    onChange={(e) => setForm((s) => ({ ...s, scheduledAt: e.target.value }))}
                    disabled={Boolean(existing) && !isApprover}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>{t("serviceRequest.assignedTechnician")}</Label>
                  <Select
                    value={form.assignedTechnicianId}
                    onValueChange={(v) => setForm((s) => ({ ...s, assignedTechnicianId: v }))}
                    disabled={techLoading || (Boolean(existing) && !isApprover)}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("serviceRequest.selectTechnician")} />
                    </SelectTrigger>
                    <SelectContent>
                      {technicians.map((tech) => (
                        <SelectItem key={tech.id} value={tech.id}>
                          {tech.displayName || tech.email || tech.id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Details section for editing */}
            {existing && section === "details" && (
              <div className="flex flex-col gap-2">
                <Label>{t("serviceRequest.problemDescription")}</Label>
                <Textarea
                  value={form.problemDescription}
                  onChange={(e) => setForm((s) => ({ ...s, problemDescription: e.target.value }))}
                  placeholder={t("serviceRequest.problemPlaceholder")}
                  className="min-h-24"
                />
              </div>
            )}

            {existing && section === "details" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label>{t("serviceRequest.technicalAssessment")}</Label>
                  <Textarea
                    value={form.technicalAssessment}
                    onChange={(e) => setForm((s) => ({ ...s, technicalAssessment: e.target.value }))}
                    placeholder={t("serviceRequest.assessmentPlaceholder")}
                    className="min-h-20"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>{t("serviceRequest.recommendation")}</Label>
                  <Textarea
                    value={form.recommendation}
                    onChange={(e) => setForm((s) => ({ ...s, recommendation: e.target.value }))}
                    placeholder={t("serviceRequest.recommendationPlaceholder")}
                    className="min-h-20"
                  />
                </div>
              </div>
            )}

            {/* Spare parts inline with details */}
            {existing && section === "details" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">{t("serviceRequest.spareParts.title")}</Label>
                  <div className="text-sm text-muted-foreground">
                    {t("serviceRequest.spareParts.total", { amount: totalCost.toFixed(2) })}
                  </div>
                </div>

                {/* Compact row for basic fields */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                  <div className="md:col-span-2 flex flex-col gap-1">
                    <Label htmlFor="spare-part" className="text-xs text-muted-foreground">
                      {t("serviceRequest.spareParts.part")}
                    </Label>
                    <Input
                      id="spare-part"
                      placeholder={t("serviceRequest.spareParts.part")}
                      value={draft.part}
                      onChange={(e) => setDraft((d) => ({ ...d, part: e.target.value }))}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="spare-quantity" className="text-xs text-muted-foreground">
                      {t("serviceRequest.spareParts.quantity")}
                    </Label>
                    <Input
                      id="spare-quantity"
                      type="number"
                      min={1}
                      placeholder={t("serviceRequest.spareParts.quantity")}
                      value={draft.quantity}
                      onChange={(e) => setDraft((d) => ({ ...d, quantity: Number(e.target.value || 0) }))}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="spare-cost" className="text-xs text-muted-foreground">
                      {t("serviceRequest.spareParts.cost")}
                    </Label>
                    <Input
                      id="spare-cost"
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder={t("serviceRequest.spareParts.cost")}
                      value={draft.cost}
                      onChange={(e) => setDraft((d) => ({ ...d, cost: Number(e.target.value || 0) }))}
                    />
                  </div>
                </div>

                {/* Wide text areas for readability */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs text-muted-foreground">
                      {t("serviceRequest.spareParts.description")}
                    </Label>
                    <Textarea
                      value={draft.description}
                      onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                      className="min-h-20 resize-y whitespace-pre-wrap"
                      placeholder={t("serviceRequest.spareParts.description")}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs text-muted-foreground">{t("serviceRequest.spareParts.source")}</Label>
                    <Textarea
                      value={draft.source}
                      onChange={(e) => setDraft((d) => ({ ...d, source: e.target.value }))}
                      className="min-h-20 resize-y whitespace-pre-wrap"
                      placeholder={t("serviceRequest.spareParts.source")}
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    type="button"
                    onClick={() => {
                      if (!draft.part || draft.quantity <= 0) {
                        toast(t("toast.error"), { description: t("serviceRequest.spareParts.validation") });
                        return;
                      }
                      setParts((prev) => [...prev, { ...draft }]);
                      setDraft({ part: "", description: "", quantity: 1, cost: 0, source: "" });
                    }}>
                    {t("serviceRequest.spareParts.add")}
                  </Button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {parts.length === 0 && (
                    <div className="text-sm text-muted-foreground">{t("serviceRequest.spareParts.empty")}</div>
                  )}
                  {parts.map((p, idx) => (
                    <div key={idx} className="rounded border p-2">
                      <div className="flex items-center justify-between">
                        <div className="text-sm">
                          <span className="font-medium">{p.part}</span>
                          <span className="ml-2 text-muted-foreground">x{p.quantity}</span>
                          {p.cost ? (
                            <span className="ml-2 text-muted-foreground">{(p.cost * p.quantity).toFixed(2)}</span>
                          ) : null}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setParts((prev) => prev.filter((_, i) => i !== idx))}>
                          {t("serviceRequest.spareParts.remove")}
                        </Button>
                      </div>
                      {p.description ? (
                        <div
                          className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap break-words"
                          title={p.description}>
                          {p.description}
                        </div>
                      ) : null}
                      {p.source ? (
                        <div
                          className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap break-words"
                          title={p.source}>
                          {p.source}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {existing ? (
            <>
              <Button variant="outline" onClick={() => setOpen(false)} disabled={loading || isBlockingLoading}>
                {t("form.cancel")}
              </Button>
              <Button onClick={handleSubmit} disabled={!isValid || loading || isBlockingLoading} className="gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {t("form.save")}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setOpen(false)} disabled={loading || isBlockingLoading}>
                {t("form.cancel")}
              </Button>
              <Button onClick={handleSubmit} disabled={!isValid || loading || isBlockingLoading} className="gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {t("serviceRequest.create")}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ServiceRequestDialog;
