"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Box, ChevronRight, Hash, MapPin } from "lucide-react";

export type EquipmentResult = {
  id: string;
  name: string;
  partNumber?: string;
  model?: string;
  manufacturer?: string;
  location?: string;
  locationName?: string;
  campus?: string;
  subLocation?: string;
  serialNumber?: string;
};

type EquipmentResultCardProps = {
  equipment: EquipmentResult;
};

export default function EquipmentResultCard({ equipment }: EquipmentResultCardProps) {
  const e = equipment;
  return (
    <Link
      href={e.partNumber ? `/equipments/tag/${encodeURIComponent(e.partNumber)}` : `/equipments/${e.id}`}
      className="group rounded-xl border p-4 hover:bg-muted/40 hover:shadow-sm hover:border-primary/30 transition-colors"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-md bg-muted/60 text-muted-foreground">
            <Box className="h-4 w-4" />
          </div>
          <div className="font-medium">{e.name}</div>
        </div>
        <ChevronRight className="h-4 w-4 opacity-50 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {e.partNumber ? <Badge variant="outline">Tag: {e.partNumber}</Badge> : null}
        {e.model ? <Badge variant="secondary">{e.model}</Badge> : null}
        {e.manufacturer ? <Badge variant="secondary">{e.manufacturer}</Badge> : null}
      </div>
      {(e.locationName || e.location) ? (
        <div className="text-xs mt-3 space-y-0.5">
          <div className="flex items-center gap-1">
            <MapPin className="h-3 w-3 text-muted-foreground" />
            <span className="font-medium">{e.locationName || e.location}</span>
          </div>
          {e.campus && (
            <div className="text-muted-foreground ml-4">{e.campus}</div>
          )}
          {e.subLocation && (
            <div className="text-muted-foreground ml-4">Room: {e.subLocation}</div>
          )}
        </div>
      ) : null}
      {e.serialNumber ? (
        <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
          <Hash className="h-3 w-3" /> {e.serialNumber}
        </div>
      ) : null}
    </Link>
  );
}
