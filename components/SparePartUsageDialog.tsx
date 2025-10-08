"use client";

import { useState } from "react";
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
  const [serviceRequests, setServiceRequests] = useState<JServiceRequest[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchServiceRequests = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/spare-parts/${sparePart.id}/service-requests`);
      if (response.ok) {
        const { data } = await response.json();
        setServiceRequests(data || []);
      }
    } catch (error) {
      console.error("Failed to fetch service requests:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch when dialog opens
  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen);
    if (newOpen) {
      fetchServiceRequests();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
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
                          Scheduled: {new Date(sr.scheduledAt).toLocaleDateString()}
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

