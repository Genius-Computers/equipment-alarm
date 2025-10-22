"use client";

import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { QrCode, Download, Printer } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { useMemo, useRef } from "react";

interface EquipmentQRCodeProps {
  equipmentId: string;
  tagNumber?: string | null;
  equipmentName?: string;
}

export default function EquipmentQRCode({ equipmentId, tagNumber, equipmentName }: EquipmentQRCodeProps) {
  const { t } = useLanguage();
  const svgRef = useRef<SVGSVGElement | null>(null);

  const url = useMemo(() => {
    if (typeof window === "undefined") return "";
    const base = window.location.origin;
    // Prefer tag-based URL if tag is available
    if (tagNumber && tagNumber.trim().length > 0) {
      return `${base}/equipments/tag/${encodeURIComponent(tagNumber)}`;
    }
    return `${base}/equipments/${equipmentId}`;
  }, [equipmentId, tagNumber]);

  const handleDownload = () => {
    const svg = svgRef.current;
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.download = `${(equipmentName || tagNumber || equipmentId).toString()}-QR.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  const handlePrint = () => {
    const svg = svgRef.current;
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const printWindow = window.open("", "_blank", "width=400,height=500");
    if (!printWindow) return;
    const doc = printWindow.document;
    doc.open();
    doc.write(`<!DOCTYPE html><html><head><title>Print QR</title>
      <style>body{display:flex;align-items:center;justify-content:center;height:100vh;margin:0} .meta{font-family:ui-sans-serif,system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:12px;text-align:center;margin-top:8px}</style>
    </head><body>
      <div>
        ${svgData}
        <div class="meta">${equipmentName || tagNumber || equipmentId}</div>
      </div>
      <script>window.onload = () => { window.print(); setTimeout(() => window.close(), 100); };</script>
    </body></html>`);
    doc.close();
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <QrCode className="h-4 w-4 mr-2 rtl:mr-0 rtl:ml-2" />
          {t("QR Code")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{equipmentName || tagNumber || "Equipment QR"}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 p-4">
          <QRCodeSVG ref={svgRef} value={url} size={256} level="M" includeMargin />
          <div className="text-xs text-muted-foreground break-all text-center max-w-full">{url}</div>
          <div className="flex gap-2 w-full">
            <Button onClick={handleDownload} className="flex-1">
              <Download className="h-4 w-4 mr-2" />
              {t("Download QR")}
            </Button>
            <Button onClick={handlePrint} variant="outline" className="flex-1">
              <Printer className="h-4 w-4 mr-2" />
              {t("Print")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}



