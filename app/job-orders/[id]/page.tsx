"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Loader2, ClipboardList, MapPin, Box } from "lucide-react";
import { toast } from "sonner";
import { JobOrder, JobOrderItem } from "@/lib/types";

export default function ViewJobOrderPage() {
  const params = useParams();
  const router = useRouter();
  const jobOrderId = params.id as string;

  const [jobOrder, setJobOrder] = useState<JobOrder | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (jobOrderId) {
      fetchJobOrder();
    }
  }, [jobOrderId]);

  const fetchJobOrder = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/job-orders/${jobOrderId}`);
      if (!response.ok) throw new Error('Failed to fetch job order');
      
      const data = await response.json();
      setJobOrder(data);
    } catch (error) {
      console.error('Error fetching job order:', error);
      toast.error("Failed to load job order");
      router.push('/job-orders/list');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted':
        return 'default';
      case 'in_progress':
        return 'default';
      case 'completed':
        return 'outline';
      case 'cancelled':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!jobOrder) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Job order not found</p>
          <Button onClick={() => router.push('/job-orders/list')} className="mt-4">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            className="mb-4"
            onClick={() => router.push('/job-orders/list')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Job Orders
          </Button>
          
          <div className="flex items-center gap-3 mb-2">
            <ClipboardList className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Job Order Details</h1>
              <p className="text-muted-foreground">Order #{jobOrder.orderNumber}</p>
            </div>
          </div>
        </div>

        {/* Job Order Details */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Order Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-muted-foreground mb-1">Order Number</div>
                <div className="font-semibold">{jobOrder.orderNumber}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Campus</div>
                <div className="font-semibold flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {jobOrder.campus}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Sublocation</div>
                <div className="font-semibold">{jobOrder.sublocation}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Total Items</div>
                <div className="font-semibold flex items-center gap-2">
                  <Box className="h-4 w-4" />
                  {jobOrder.items.length}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Status</div>
                <Badge variant={getStatusColor(jobOrder.status)}>
                  {jobOrder.status.toUpperCase()}
                </Badge>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Submitted</div>
                <div className="font-semibold">
                  {new Date(jobOrder.submittedAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Equipment List */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Equipment & Service Requests</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Each item has an associated service request with the ticket number shown below.
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {jobOrder.items.map((item: JobOrderItem, index: number) => (
                <div key={item.equipmentId}>
                  {index > 0 && <Separator className="my-4" />}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="font-mono">
                          #{item.ticketNumber}
                        </Badge>
                        <h3 className="font-semibold text-lg">{item.equipmentName}</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                        {item.partNumber && (
                          <div>
                            <span className="font-medium">Part Number:</span> {item.partNumber}
                          </div>
                        )}
                        {item.serialNumber && (
                          <div>
                            <span className="font-medium">Serial Number:</span> {item.serialNumber}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-between gap-4">
          <Button
            variant="outline"
            onClick={() => router.push('/job-orders/list')}
          >
            Back to List
          </Button>
          <Button
            onClick={() => router.push('/service-requests')}
          >
            View Service Requests
          </Button>
        </div>
      </div>
    </div>
  );
}


