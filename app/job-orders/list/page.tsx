"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ClipboardList, Plus, MapPin, Box } from "lucide-react";
import { toast } from "sonner";
import { JobOrder } from "@/lib/types";

export default function JobOrdersListPage() {
  const router = useRouter();
  const [jobOrders, setJobOrders] = useState<JobOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJobOrders();
  }, []);

  const fetchJobOrders = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/job-orders?pageSize=100');
      if (!response.ok) throw new Error('Failed to fetch job orders');
      
      const data = await response.json();
      setJobOrders(data.data || []);
    } catch (error) {
      console.error('Error fetching job orders:', error);
      toast.error("Failed to load job orders");
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

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <ClipboardList className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold">Job Orders</h1>
            </div>
            <p className="text-muted-foreground">
              View and manage your job orders
            </p>
          </div>
          <Button onClick={() => router.push('/job-orders')} className="gap-2">
            <Plus className="h-4 w-4" />
            Create New
          </Button>
        </div>

        {/* Job Orders List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : jobOrders.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-muted-foreground">
                <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="mb-2">No job orders found</p>
                <p className="text-sm mb-4">Create your first job order to get started</p>
                <Button onClick={() => router.push('/job-orders')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Job Order
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {jobOrders.map((order) => (
              <Card 
                key={order.id}
                className="cursor-pointer hover:shadow-lg transition-all"
                onClick={() => router.push(`/job-orders/${order.id}`)}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-1">
                        Order #{order.orderNumber}
                      </CardTitle>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {order.campus} - {order.sublocation}
                        </span>
                        <span className="flex items-center gap-1">
                          <Box className="h-4 w-4" />
                          {order.items.length} items
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge variant={getStatusColor(order.status)}>
                        {order.status.toUpperCase()}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      <span>
                        Submitted on {new Date(order.submittedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="text-sm font-medium">
                      Order #{order.orderNumber}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


