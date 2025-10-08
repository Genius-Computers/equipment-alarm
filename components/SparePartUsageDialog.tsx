"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { SparePart } from "@/lib/types";
import type { JServiceRequest } from "@/lib/types/service-request";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { formatSaudiDate } from "@/lib/utils";

interface SparePartUsageDialogProps {
  sparePart: SparePart;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SparePartUsageDialog({
  sparePart,
  open,
  onOpenChange,
}: SparePartUsageDialogProps) {
  console.log('[SparePartUsageDialog] Component rendered with sparePart:', sparePart.id, 'open:', open);
  const [serviceRequests, setServiceRequests] = useState<JServiceRequest[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    console.log('[SparePartUsageDialog] useEffect triggered, open:', open);
    const fetchServiceRequests = async () => {
      if (!open) return;
      
      console.log('[SparePartUsageDialog] Dialog opened, fetching service requests for spare part:', sparePart.id, sparePart.name);
      setLoading(true);
      try {
        const url = `/api/spare-parts/${sparePart.id}/service-requests`;
        console.log('[SparePartUsageDialog] Fetching from URL:', url);
        const response = await fetch(url, { cache: 'no-store' });
        console.log('[SparePartUsageDialog] Response status:', response.status);
        if (response.ok) {
          const json = await response.json();
          console.log('[SparePartUsageDialog] Response data:', json);
          setServiceRequests(json.data || []);
          console.log('[SparePartUsageDialog] Set', (json.data || []).length, 'service requests');
        } else {
          const errorText = await response.text();
          console.error('[SparePartUsageDialog] Error response:', errorText);
        }
      } catch (error) {
        console.error("[SparePartUsageDialog] Failed to fetch service requests:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchServiceRequests();
  }, [open, sparePart.id, sparePart.name]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Usage History: {sparePart.name}
          </DialogTitle>
          <DialogDescription>
            Service requests where this spare part has been used
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-4">
          {loading ? (
            <>
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </>
          ) : serviceRequests.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-sm text-muted-foreground">
                This spare part hasn&apos;t been used in any service requests yet.
              </CardContent>
            </Card>
          ) : (
            serviceRequests.map((sr) => (
              <Link
                key={sr.id}
                href={`/service-requests/${sr.id}/print`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {sr.ticketId || sr.id.slice(0, 8)}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {sr.requestType?.replace(/_/g, " ")}
                          </Badge>
                          <Badge
                            variant={
                              sr.approvalStatus === "approved"
                                ? "default"
                                : sr.approvalStatus === "rejected"
                                ? "destructive"
                                : "secondary"
                            }
                            className="text-xs"
                          >
                            {sr.approvalStatus}
                          </Badge>
                        </div>
                        {sr.equipment && (
                          <p className="text-sm text-muted-foreground">
                            Equipment: {sr.equipment.name}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Scheduled: {formatSaudiDate(sr.scheduledAt)}
                        </p>
                        
                        {/* Show spare part details from this service request */}
                        {sr.sparePartsNeeded && Array.isArray(sr.sparePartsNeeded) && (
                          <div className="mt-2">
                            {sr.sparePartsNeeded
                              .filter((part) => part.sparePartId === sparePart.id)
                              .map((part, idx) => (
                                <div key={idx} className="text-xs text-muted-foreground">
                                  Quantity used: {part.quantity}
                                  {part.cost > 0 && ` • Cost: ${part.cost}`}
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                      <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0 ml-2" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

