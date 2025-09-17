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
import { Wrench, PlusCircle } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { toast } from "sonner";
import { ServiceRequestType, ServiceRequestPriority, ServiceRequestApprovalStatus, ServiceRequestWorkStatus } from "@/lib/types";

interface ServiceRequestDialogProps {
  equipmentId: string;
  equipmentName?: string;
  trigger?: React.ReactNode;
  existingId?: string;
  onCreated?: () => void;
  onUpdated?: () => void;
}

const ServiceRequestDialog = ({ equipmentId, equipmentName, trigger, existingId, onCreated, onUpdated }: ServiceRequestDialogProps) => {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<0 | 1 | 2>(0);

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

  useEffect(() => {
    const loadTechnicians = async () => {
      try {
        const res = await fetch(`/api/users?onlyTechnicians=true`);
        if (!res.ok) return;
        const j = (await res.json()) as { data?: Array<{ id: string; displayName?: string; email?: string }> };
        if (Array.isArray(j.data)) setTechnicians(j.data);
      } catch {
        // ignore silently
      }
    };
    if (open) loadTechnicians();
  }, [open]);

  type SparePart = { part: string; description?: string; quantity: number; cost: number; source: string };
  const [parts, setParts] = useState<SparePart[]>([]);
  const [draft, setDraft] = useState<SparePart>({ part: "", description: "", quantity: 1, cost: 0, source: "" });

  const isValid = useMemo(() => {
    return !!form.requestType && !!form.priority && !!form.scheduledAt && !!form.assignedTechnicianId;
  }, [form]);

  const totalCost = useMemo(() => parts.reduce((sum, p) => sum + (Number(p.cost) || 0) * (Number(p.quantity) || 0), 0), [parts]);

  useEffect(() => {
    const loadExisting = async () => {
      if (!existingId) return;
      try {
        setLoading(true);
        const res = await fetch(`/api/service-request`);
        if (!res.ok) throw new Error("Failed to fetch service requests");
        const { data } = (await res.json()) as { data: Array<{ id: string; requestType: ServiceRequestType; scheduledAt: string; priority: ServiceRequestPriority; assignedTechnicianId?: string; problemDescription?: string; technicalAssessment?: string; recommendation?: string; sparePartsNeeded?: SparePart[] }> };
        const found = Array.isArray(data) ? data.find((r) => r.id === existingId) : undefined;
        if (found) {
          setForm({
            requestType: found.requestType,
            scheduledAt: (found.scheduledAt || "").slice(0, 16),
            priority: found.priority,
            assignedTechnicianId: found.assignedTechnicianId || "",
            problemDescription: found.problemDescription || "",
            technicalAssessment: found.technicalAssessment || "",
            recommendation: found.recommendation || "",
          });
          setParts(found.sparePartsNeeded || []);
        }
      } catch {
        // no-op, toast later on submit
      } finally {
        setLoading(false);
      }
    };
    loadExisting();
  }, [existingId]);

  const handleSubmit = async () => {
    try {
      setLoading(true);
      if (existingId) {
        const res = await fetch(`/api/service-request/${existingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requestType: form.requestType,
            scheduledAt: form.scheduledAt,
            priority: form.priority,
            assignedTechnicianId: form.assignedTechnicianId,
            problemDescription: form.problemDescription,
            technicalAssessment: form.technicalAssessment,
            recommendation: form.recommendation,
            sparePartsNeeded: parts,
          }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j?.error || 'Failed to update request');
        }
        toast(t("toast.success"), { description: t("toast.serviceRequestUpdated") });
        onUpdated?.();
      } else {
        const res = await fetch('/api/service-request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
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
          }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j?.error || 'Failed to create request');
        }
        const j = await res.json();
        const createdId = j?.data?.id as string | undefined;
        toast(t("toast.success"), { description: t("toast.serviceRequestCreated") });
        onCreated?.();
        // Open printable report in a new tab
        if (createdId) {
          const url = `/service-requests/${createdId}/print`;
          window.open(url, "_blank", "noopener,noreferrer");
        }
      }
      setOpen(false);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Action failed';
      toast(t("toast.error"), { description: message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setStep(0); }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" className="gap-1">
            <PlusCircle className="h-4 w-4" />
            {t("serviceRequest.newRequest")}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-primary" />
            {existingId ? t("serviceRequest.editTitle") : t("serviceRequest.createTitle")} {equipmentName ? <Badge variant="secondary" className="ml-2">{equipmentName}</Badge> : null}
          </DialogTitle>
          <DialogDescription>
            {t("serviceRequest.description")}
          </DialogDescription>
        </DialogHeader>

        {/* stepper */}
        <div className="flex items-center justify-between gap-2 mb-2">
          {[0,1,2].map((i) => (
            <div key={i} className={`flex-1 h-1 rounded ${step >= i ? 'bg-primary' : 'bg-muted'}`} />
          ))}
        </div>

        <div className="space-y-4">
          {step === 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label>{t("serviceRequest.requestType")}</Label>
              <Select value={form.requestType} onValueChange={(v) => setForm((s) => ({ ...s, requestType: v as ServiceRequestType }))}>
                <SelectTrigger>
                  <SelectValue placeholder={t("serviceRequest.selectType")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ServiceRequestType.PREVENTIVE_MAINTENANCE}>{t("serviceRequest.types.preventive")}</SelectItem>
                  <SelectItem value={ServiceRequestType.CORRECTIVE_MAINTENANCE}>{t("serviceRequest.types.corrective")}</SelectItem>
                  <SelectItem value={ServiceRequestType.INSTALL}>{t("serviceRequest.types.install")}</SelectItem>
                  <SelectItem value={ServiceRequestType.ASSESS}>{t("serviceRequest.types.assess")}</SelectItem>
                  <SelectItem value={ServiceRequestType.OTHER}>{t("serviceRequest.types.other")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>{t("serviceRequest.priority")}</Label>
              <Select value={form.priority} onValueChange={(v) => setForm((s) => ({ ...s, priority: v as ServiceRequestPriority }))}>
                <SelectTrigger>
                  <SelectValue placeholder={t("serviceRequest.selectPriority")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ServiceRequestPriority.LOW}>{t("serviceRequest.priorities.low")}</SelectItem>
                  <SelectItem value={ServiceRequestPriority.MEDIUM}>{t("serviceRequest.priorities.medium")}</SelectItem>
                  <SelectItem value={ServiceRequestPriority.HIGH}>{t("serviceRequest.priorities.high")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          )}

          {step === 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
              <Label>{t("serviceRequest.scheduledAt")}</Label>
              <Input
                type="datetime-local"
                value={form.scheduledAt}
                onChange={(e) => setForm((s) => ({ ...s, scheduledAt: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>{t("serviceRequest.assignedTechnician") || "Assigned Technician"}</Label>
              <Select value={form.assignedTechnicianId} onValueChange={(v) => setForm((s) => ({ ...s, assignedTechnicianId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder={t("serviceRequest.selectTechnician") || "Select technician"} />
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

          {step === 1 && (
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

          {step === 1 && (
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

          {/* Spare parts section */}
          {step === 2 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">{t("serviceRequest.spareParts.title")}</Label>
              <div className="text-sm text-muted-foreground">{t("serviceRequest.spareParts.total", { amount: totalCost.toFixed(2) })}</div>
            </div>

            {/* Compact row for basic fields */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <div className="md:col-span-2">
                <Input
                  placeholder={t("serviceRequest.spareParts.part")}
                  value={draft.part}
                  onChange={(e) => setDraft((d) => ({ ...d, part: e.target.value }))}
                />
              </div>
              <Input
                type="number"
                min={1}
                placeholder={t("serviceRequest.spareParts.quantity")}
                value={draft.quantity}
                onChange={(e) => setDraft((d) => ({ ...d, quantity: Number(e.target.value || 0) }))}
              />
              <Input
                type="number"
                min={0}
                step="0.01"
                placeholder={t("serviceRequest.spareParts.cost")}
                value={draft.cost}
                onChange={(e) => setDraft((d) => ({ ...d, cost: Number(e.target.value || 0) }))}
              />
            </div>

            {/* Wide text areas for readability */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">{t("serviceRequest.spareParts.description")}</Label>
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
                }}
              >
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
                      {p.cost ? <span className="ml-2 text-muted-foreground">{(p.cost * p.quantity).toFixed(2)}</span> : null}
                    </div>
                    <Button size="sm" variant="outline" onClick={() => setParts((prev) => prev.filter((_, i) => i !== idx))}>
                      {t("serviceRequest.spareParts.remove")}
                    </Button>
                  </div>
                  {p.description ? (
                    <div className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap break-words" title={p.description}>
                      {p.description}
                    </div>
                  ) : null}
                  {p.source ? (
                    <div className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap break-words" title={p.source}>
                      {p.source}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
          )}
        </div>

        <DialogFooter>
          {step > 0 ? (
            <Button variant="outline" onClick={() => setStep((s) => ((s - 1) as 0 | 1 | 2))} disabled={loading}>
              {t("form.back")}
            </Button>
          ) : (
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              {t("form.cancel")}
            </Button>
          )}
          {step < 2 ? (
            <Button onClick={() => setStep((s) => ((s + 1) as 0 | 1 | 2))} disabled={(step === 0 && !isValid) || loading}>
              {t("form.next")}
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={!isValid || loading}>
              {existingId ? t("form.save") : t("serviceRequest.create")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ServiceRequestDialog;


