"use client"

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter, Search, ScanLine } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { EquipmentMaintenanceStatus } from "@/lib/types";
import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface EquipmentFiltersProps {
  searchTerm: string;
  statusFilter: "all" | EquipmentMaintenanceStatus;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: "all" | EquipmentMaintenanceStatus) => void;
}

const EquipmentFilters = ({ searchTerm, statusFilter, onSearchChange, onStatusChange }: EquipmentFiltersProps) => {
  const { t } = useLanguage();
  const [scanOpen, setScanOpen] = useState(false);
  const [buffer, setBuffer] = useState("");
  const lastKeyTimeRef = useRef<number>(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const closingRef = useRef(false);
  const lastAppliedRef = useRef<string | null>(null);
  const openedAtRef = useRef<number>(0);

  // Basic barcode detection via fast key events while the dialog is open
  useEffect(() => {
    if (!scanOpen) return;
    const handler = (e: KeyboardEvent) => {
      const now = Date.now();
      lastKeyTimeRef.current = now;
      if ((e.key === "Enter" || e.key === "Tab") && buffer.trim().length > 0) {
        // Commit immediately on typical scanner terminators
        e.preventDefault();
        const value = buffer.trim();
        if (value.length > 0) {
          onSearchChange(value);
          lastAppliedRef.current = value;
          setBuffer("");
          setScanOpen(false);
        }
        return;
      }
      // Ignore meta keys
      if (e.key.length === 1) {
        setBuffer((prev) => prev + e.key);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [scanOpen, buffer, onSearchChange]);

  useEffect(() => {
    if (scanOpen) {
      // Focus hidden input for mobile scanners that require focus
      closingRef.current = false;
      setBuffer("");
      openedAtRef.current = Date.now();
      inputRef.current?.focus();
    }
  }, [scanOpen]);

  // Camera scanner setup/teardown
  useEffect(() => {
    if (!scanOpen) {
      // stop reader if open
      try {
        const r = codeReaderRef.current as unknown as { reset?: () => void };
        r?.reset?.();
      } catch {}
      return;
    }
    const setup = async () => {
      try {
        const reader = new BrowserMultiFormatReader();
        codeReaderRef.current = reader;
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        reader.decodeFromVideoDevice(undefined, videoRef.current as HTMLVideoElement, (result) => {
          if (result) {
            const value = (result.getText?.() || "").trim();
            const tooSoon = Date.now() - openedAtRef.current < 600; // debounce first frame
            const isSameAsLast = value && lastAppliedRef.current && value === lastAppliedRef.current;
            if (value.length > 0 && !closingRef.current && !(tooSoon && isSameAsLast)) {
              closingRef.current = true;
              onSearchChange(value);
              lastAppliedRef.current = value;
              setBuffer("");
              // Small delay to allow UI settle before closing
              setTimeout(() => setScanOpen(false), 50);
            }
          }
        });
      } catch {
        // Camera might be blocked; rely on keyboard wedge fallback
      }
    };
    void setup();
    return () => {
      try {
        const r = codeReaderRef.current as unknown as { reset?: () => void };
        r?.reset?.();
      } catch {}
      const media = videoRef.current?.srcObject as MediaStream | null;
      media?.getTracks().forEach((t) => t.stop());
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, [scanOpen, onSearchChange]);

  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <div className="relative flex-1">
        <Search className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder={t("search.placeholder")}
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 rtl:pl-4 rtl:pr-10 pr-10 rtl:pl-10"
        />
        {/* Scanner button - trailing side: right for LTR, left for RTL */}
        <Dialog
          open={scanOpen}
          onOpenChange={(v) => {
            setScanOpen(v);
            if (v) {
              // Reset search and last scanned state on open to avoid reusing previous value
              onSearchChange("");
              lastAppliedRef.current = null;
              setBuffer("");
            }
          }}
        >
          <DialogTrigger asChild>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="absolute right-2 rtl:right-auto rtl:left-2 top-1/2 -translate-y-1/2 h-8 w-8"
              aria-label="Scan barcode"
            >
              <ScanLine className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t("Scan barcode")}</DialogTitle>
            </DialogHeader>
            <div className="p-2">
              <p className="text-sm text-muted-foreground mb-2">
                {t("Aim your scanner at the barcode or camera.")}
              </p>
              <div className="w-full flex justify-center">
                <video ref={videoRef} className="rounded-md w-full max-w-sm bg-black/50" muted playsInline />
              </div>
              {/* Hidden text input to support mobile/USB scanners that require a focused field */}
              <input
                ref={inputRef}
                value={buffer}
                onChange={(e) => setBuffer(e.target.value)}
                className="w-[1px] h-[1px] opacity-0 pointer-events-none"
                aria-hidden
              />
              <div className="mt-2 text-xs text-muted-foreground break-all">
                {buffer}
              </div>
              <div className="mt-4 flex gap-2">
                <Button variant="outline" onClick={() => { setBuffer(""); setScanOpen(false); }}>
                  {t("Cancel")}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={statusFilter} onValueChange={(v) => onStatusChange(v as "all" | EquipmentMaintenanceStatus)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t("filter.byStatus")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filter.allEquipment")}</SelectItem>
            <SelectItem value="good">{t("filter.upToDate")}</SelectItem>
            <SelectItem value="due">{t("filter.dueSoon")}</SelectItem>
            <SelectItem value="overdue">{t("filter.overdue")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default EquipmentFilters;
