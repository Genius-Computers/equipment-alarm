"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";

type SparePart = { part: string; description?: string; quantity: number; cost: number; source: string };
type Equipment = { id: string; name: string; part_number?: string | null; location?: string | null; model?: string | null };
type Technician = { id: string; displayName?: string | null; email?: string | null } | null;
type ServiceRequestPrintData = {
  id: string;
  requestType: string;
  scheduledAt: string;
  priority: string;
  approvalStatus: string;
  workStatus: string;
  problemDescription?: string;
  technicalAssessment?: string;
  recommendation?: string;
  sparePartsNeeded?: SparePart[];
  equipment?: Equipment | null;
  technician?: Technician;
};

interface PageProps {
  params: Promise<{ id: string }>;
}

const A4_WIDTH = 794; // px at 96dpi ≈ 210mm

export default function PrintPage(props: PageProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ServiceRequestPrintData | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const { id } = await props.params;
        const res = await fetch(`/api/service-request/${id}`, { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load service request");
        const j = await res.json();
        setData(j.data as ServiceRequestPrintData);
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

  const parts: SparePart[] = useMemo(() => Array.isArray(data?.sparePartsNeeded) ? (data?.sparePartsNeeded as SparePart[]) : [], [data]);
  const equipment = (data?.equipment || null) as Equipment | null;
  const technician = (data?.technician || null) as Technician;

  return (
    <div className="min-h-screen bg-white text-black">
      <style jsx global>{`
        @media print {
          @page { size: A4 portrait; margin: 10mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
      {/* Screen-only action bar */}
      <div className="print:hidden sticky top-0 z-10 bg-white border-b">
        <div className="mx-auto flex items-center justify-end gap-2 p-2" style={{ width: A4_WIDTH }}>
          <Button size="sm" onClick={() => window.print()}>Print</Button>
        </div>
      </div>
      <div className="mx-auto" style={{ width: A4_WIDTH }} ref={containerRef}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-amber-300 pb-3">
          <div>
            <div className="font-semibold">Last Touch of Biomedical Est.</div>
            <div className="text-xs text-neutral-700">Date: ________ / ________ / 20____</div>
          </div>
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="logo" width={48} height={48} />
            <div className="text-right">
              <div className="font-semibold">مؤسسة آخر لمسة الطبية</div>
              <div className="text-xs text-neutral-700">تقرير الخدمة</div>
            </div>
          </div>
        </div>

        <div className="mt-2 text-center font-semibold">SERVICE REPORT تقرير الخدمة</div>

        {/* Info grid */}
        <div className="mt-2 grid grid-cols-4 gap-[2px] text-[11px]">
          <div className="col-span-1 border p-2">
            <div className="font-medium">Equipment REF NO.</div>
            <div className="text-xs text-neutral-700">{equipment?.part_number || "-"}</div>
          </div>
          <div className="col-span-1 border p-2">
            <div className="font-medium">Work Type</div>
            <div className="text-xs text-neutral-700 capitalize">{String(data?.requestType || "-").replaceAll("_", " ")}</div>
          </div>
          <div className="col-span-1 border p-2">
            <div className="font-medium">PM / CM / Install / Assess / Other</div>
          </div>
          <div className="col-span-1 border p-2">
            <div className="font-medium">Form Number</div>
            <div className="text-xs text-neutral-700">{data?.id}</div>
          </div>

          <div className="col-span-1 border p-2">
            <div className="font-medium">Equipment</div>
            <div className="text-xs text-neutral-700">{equipment?.name || "-"}</div>
          </div>
          <div className="col-span-1 border p-2">
            <div className="font-medium">Location</div>
            <div className="text-xs text-neutral-700">{equipment?.location || "-"}</div>
          </div>
          <div className="col-span-1 border p-2">
            <div className="font-medium">Manufacturer</div>
            <div className="text-xs text-neutral-700">-</div>
          </div>
          <div className="col-span-1 border p-2">
            <div className="font-medium">Model</div>
            <div className="text-xs text-neutral-700">{equipment?.model || "-"}</div>
          </div>

          <div className="col-span-1 border p-2">
            <div className="font-medium">Serial No.</div>
            <div className="text-xs text-neutral-700">-</div>
          </div>
          <div className="col-span-1 border p-2">
            <div className="font-medium">Department</div>
            <div className="text-xs text-neutral-700">-</div>
          </div>
          <div className="col-span-1 border p-2">
            <div className="font-medium">Status</div>
            <div className="text-xs text-neutral-700 capitalize">{data?.workStatus || "-"}</div>
          </div>
          <div className="col-span-1 border p-2">
            <div className="font-medium">Technician</div>
            <div className="text-xs text-neutral-700">{technician?.displayName || technician?.email || "-"}</div>
          </div>
        </div>

        {/* Problem / Assessment / Recommendation */}
        <div className="mt-2 grid grid-cols-1 gap-[2px] text-[11px]">
          <div className="border p-2 min-h-[72px]"><span className="font-medium">Reported Problem:</span> {data?.problemDescription || ""}</div>
          <div className="border p-2 min-h-[72px]"><span className="font-medium">Assessment:</span> {data?.technicalAssessment || ""}</div>
          <div className="border p-2 min-h-[72px]"><span className="font-medium">Work Done & Recommendation:</span> {data?.recommendation || ""}</div>
        </div>

        {/* Spare parts */}
        <div className="mt-2">
          <div className="text-center text-[12px] font-medium border border-b-0">SPARE PARTS قطع غيار</div>
          <div className="grid grid-cols-12 text-[11px] border">
            <div className="col-span-3 border-r p-1 font-medium">Parts Number</div>
            <div className="col-span-4 border-r p-1 font-medium">Description</div>
            <div className="col-span-1 border-r p-1 font-medium">Qty</div>
            <div className="col-span-2 border-r p-1 font-medium">Cost</div>
            <div className="col-span-2 p-1 font-medium">Source</div>
          </div>
          {parts.length === 0 ? (
            <div className="border border-t-0 p-10 text-center text-neutral-500 text-xs">No parts</div>
          ) : (
            parts.map((p, i) => (
              <div key={i} className="grid grid-cols-12 text-[11px] border border-t-0">
                <div className="col-span-3 border-r p-1">{p.part}</div>
                <div className="col-span-4 border-r p-1 break-words">{p.description}</div>
                <div className="col-span-1 border-r p-1">{p.quantity}</div>
                <div className="col-span-2 border-r p-1">{(Number(p.cost) * Number(p.quantity || 0)).toFixed(2)}</div>
                <div className="col-span-2 p-1 break-words">{p.source}</div>
              </div>
            ))
          )}
        </div>

        {/* Footer acknowledgements */}
        <div className="mt-3 text-[11px] border-t pt-2">
          <div className="grid grid-cols-3 gap-2">
            <div className="border p-2 min-h-[60px] flex flex-col justify-end">
              <div>Service Engineer</div>
              <div className="border-t mt-6" />
            </div>
            <div className="border p-2 min-h-[60px] flex flex-col justify-end">
              <div>Head In-Charge</div>
              <div className="border-t mt-6" />
            </div>
            <div className="border p-2 min-h-[60px] flex flex-col justify-end">
              <div>Customer/Client</div>
              <div className="border-t mt-6" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


