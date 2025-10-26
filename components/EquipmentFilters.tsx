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
  const videoTrackRef = useRef<MediaStreamTrack | null>(null);
  const [focusMarker, setFocusMarker] = useState<{ x: number; y: number } | null>(null);
  const [zoom, setZoom] = useState<number | null>(null);
  const [zoomRange, setZoomRange] = useState<{ min: number; max: number; step: number } | null>(null);
  const [torchOn, setTorchOn] = useState<boolean>(false);
  // Helpers for safer constraints without using `any`
  type ExtendedCapabilities = MediaTrackCapabilities & { focusMode?: string[]; zoom?: { min: number; max: number; step?: number }; torch?: boolean; pointsOfInterest?: boolean };
  type ExtTrack = MediaStreamTrack & { applyConstraints?: (c: MediaTrackConstraints) => Promise<void>; getCapabilities?: () => ExtendedCapabilities };
  const getTrack = (): ExtTrack | null => (videoTrackRef.current as ExtTrack | null);
  const applyAdvanced = async (track: ExtTrack | null, obj: Partial<{ focusMode: string; zoom: number; torch: boolean; pointsOfInterest: Array<{ x: number; y: number }> }>) => {
    try {
      const constraints: MediaTrackConstraints = { advanced: [obj as unknown as MediaTrackConstraintSet] } as MediaTrackConstraints;
      await track?.applyConstraints?.(constraints);
    } catch {
      // ignore
    }
  };

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
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        videoTrackRef.current = stream.getVideoTracks()[0] || null;

        // Try to set helpful initial constraints (continuous focus / slight zoom) if supported
        try {
          const track = getTrack();
          const caps = (track?.getCapabilities?.() as unknown) as ExtendedCapabilities | undefined;
          const advanced: Partial<{ focusMode: string; zoom: number; torch: boolean }> = {};
          if (caps && Array.isArray(caps.focusMode) && caps.focusMode.includes("continuous")) {
            advanced.focusMode = "continuous";
          }
          const zcap = caps?.zoom as { min: number; max: number; step?: number } | undefined;
          if (zcap && typeof zcap.min === "number" && typeof zcap.max === "number") {
            const z = zcap.min + (zcap.max - zcap.min) * 0.35;
            advanced.zoom = Math.min(zcap.max, Math.max(zcap.min, z));
            setZoomRange({ min: zcap.min, max: zcap.max, step: zcap.step || 0.1 });
            setZoom(z);
          }
          if ((caps as unknown as { torch?: boolean })?.torch === true) {
            advanced.torch = torchOn;
          }
          if (Object.keys(advanced).length > 0) {
            await applyAdvanced(track, advanced);
          }
        } catch {
          // Best-effort; ignore if not supported
        }
        // Start decoding a bit AFTER the video is actually playing to avoid cached first frames
        const r = codeReaderRef.current as unknown as { reset?: () => void };
        r?.reset?.();
        const startDecode = () => {
          setTimeout(() => {
            reader.decodeFromVideoDevice(undefined, videoRef.current as HTMLVideoElement, (result) => {
              if (result) {
                const value = (result.getText?.() || "").trim();
                if (value.length > 0 && !closingRef.current) {
                  closingRef.current = true;
                  onSearchChange(value);
                  lastAppliedRef.current = value;
                  setBuffer("");
                  setTimeout(() => setScanOpen(false), 50);
                }
              }
            });
          }, 350);
        };
        if (videoRef.current?.readyState && videoRef.current.readyState >= 2) {
          startDecode();
        } else if (videoRef.current) {
          videoRef.current.onplaying = () => {
            if (videoRef.current) videoRef.current.onplaying = null;
            startDecode();
          };
        }
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
      videoTrackRef.current = null;
      setZoomRange(null);
      setZoom(null);
      setTorchOn(false);
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
              // Reset search text and input buffer, keep lastAppliedRef to ignore immediate repeats
              onSearchChange("");
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
              <div className="w-full flex justify-center relative">
                <video
                  ref={videoRef}
                  className="rounded-md w-full max-w-sm bg-black/50"
                  muted
                  playsInline
                  onClick={async (e) => {
                    // Map click to normalized [0,1] coordinates and request focus/POI if supported
                    const video = videoRef.current;
                    const track = getTrack();
                    if (!video || !track?.applyConstraints) return;
                    const rect = (e.target as HTMLVideoElement).getBoundingClientRect();
                    const x = (e.clientX - rect.left) / rect.width;
                    const y = (e.clientY - rect.top) / rect.height;
                    setFocusMarker({ x: e.clientX - rect.left, y: e.clientY - rect.top });
                    setTimeout(() => setFocusMarker(null), 600);
                    try {
                      const caps = (track.getCapabilities?.() as unknown) as ExtendedCapabilities | undefined;
                      const adv: Partial<{ focusMode: string; pointsOfInterest: Array<{ x: number; y: number }> }> = {};
                      if (caps && Array.isArray(caps.focusMode) && caps.focusMode.includes("single-shot")) {
                        adv.focusMode = "single-shot";
                      } else if (caps && Array.isArray(caps.focusMode) && caps.focusMode.includes("continuous")) {
                        adv.focusMode = "continuous";
                      }
                      if ((caps as unknown as { pointsOfInterest?: boolean })?.pointsOfInterest) {
                        adv.pointsOfInterest = [{ x: Math.min(1, Math.max(0, x)), y: Math.min(1, Math.max(0, y)) }];
                      }
                      await applyAdvanced(track, adv);
                    } catch {
                      // ignore
                    }
                  }}
                />
                {focusMarker ? (
                  <div
                    className="absolute pointer-events-none border-2 border-white/80 rounded-md"
                    style={{
                      left: Math.max(0, focusMarker.x - 24),
                      top: Math.max(0, focusMarker.y - 24),
                      width: 48,
                      height: 48,
                      boxShadow: "0 0 0 1px rgba(0,0,0,0.4)",
                    }}
                  />
                ) : null}
              </div>
              {/* Controls: Zoom & Torch */}
              <div className="mt-3 flex items-center gap-3">
                {zoomRange ? (
                  <div className="flex-1">
                    <div className="text-xs text-muted-foreground mb-1">Zoom</div>
                    <input
                      type="range"
                      min={zoomRange.min}
                      max={zoomRange.max}
                      step={zoomRange.step}
                      value={zoom ?? zoomRange.min}
                      onChange={async (e) => {
                        const z = Number(e.target.value);
                        setZoom(z);
                        await applyAdvanced(getTrack(), { zoom: z });
                      }}
                    />
                  </div>
                ) : null}

                <Button
                  type="button"
                  variant={torchOn ? "default" : "outline"}
                  onClick={async () => {
                    const track = getTrack();
                    const caps = (track?.getCapabilities?.() as unknown) as ExtendedCapabilities | undefined;
                    if (!((caps as unknown as { torch?: boolean })?.torch)) return;
                    const next = !torchOn;
                    setTorchOn(next);
                    await applyAdvanced(track, { torch: next });
                  }}
                >
                  {torchOn ? t("Torch On") : t("Torch Off")}
                </Button>
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
