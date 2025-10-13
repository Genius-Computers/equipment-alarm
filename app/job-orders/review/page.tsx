"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Loader2, ClipboardList, CheckCircle, MapPin, Box } from "lucide-react";
import { toast } from "sonner";
import { ServiceRequestType, ServiceRequestPriority } from "@/lib/types";

interface EquipmentItem {
  id: string;
  name: string;
  partNumber: string;
  serialNumber: string;
  location: string;
  subLocation: string;
  ticketNumber?: string; // Preview ticket number
}

interface Technician {
  id: string;
  displayName?: string;
  email?: string;
}

export default function ReviewJobOrderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const equipmentIdsParam = searchParams.get('equipmentIds');
  
  const [equipment, setEquipment] = useState<EquipmentItem[]>([]);
  const [equipmentByLocation, setEquipmentByLocation] = useState<Map<string, EquipmentItem[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loadingTechnicians, setLoadingTechnicians] = useState(false);
  const [loadingTickets, setLoadingTickets] = useState(false);
  
  // Form fields for service request details
  const [requestType, setRequestType] = useState<ServiceRequestType>(ServiceRequestType.PREVENTIVE_MAINTENANCE);
  const [priority, setPriority] = useState<ServiceRequestPriority>(ServiceRequestPriority.MEDIUM);
  const [scheduledAt, setScheduledAt] = useState<string>(new Date().toISOString().split('T')[0]);
  const [assignedTechnicianId, setAssignedTechnicianId] = useState<string>("unassigned");
  const [notes, setNotes] = useState<string>("");

  useEffect(() => {
    if (!equipmentIdsParam) {
      toast.error("Invalid job order data");
      router.push('/job-orders');
      return;
    }

    fetchEquipmentDetails();
    fetchTechnicians();
  }, [equipmentIdsParam]);
  
  // Fetch ticket numbers after equipment is loaded
  useEffect(() => {
    if (equipment.length > 0) {
      generateTicketPreviews();
    }
  }, [equipment.length]);

  const fetchEquipmentDetails = async () => {
    try {
      setLoading(true);
      const equipmentIds = equipmentIdsParam?.split(',') || [];
      
      // Fetch all equipment and filter to selected ones
      const response = await fetch('/api/equipment?pageSize=10000');
      if (!response.ok) throw new Error('Failed to fetch equipment');
      
      const data = await response.json();
      const allEquipment = data.data || [];
      
      const selectedEquipment = allEquipment
        .filter((eq: any) => equipmentIds.includes(eq.id))
        .map((eq: any) => ({
          id: eq.id,
          name: eq.name,
          partNumber: eq.partNumber || eq.part_number || '',
          serialNumber: eq.serialNumber || eq.serial_number || '',
          location: eq.location,
          subLocation: eq.subLocation || eq.sub_location || '',
        }));
      
      setEquipment(selectedEquipment);
      
      // Group by location for display
      const grouped = new Map<string, EquipmentItem[]>();
      selectedEquipment.forEach((eq: EquipmentItem) => {
        const key = `${eq.location}|||${eq.subLocation}`;
        if (!grouped.has(key)) {
          grouped.set(key, []);
        }
        grouped.get(key)!.push(eq);
      });
      
      setEquipmentByLocation(grouped);
    } catch (error) {
      console.error('Error fetching equipment:', error);
      toast.error("Failed to load equipment details");
    } finally {
      setLoading(false);
    }
  };

  const fetchTechnicians = async () => {
    try {
      setLoadingTechnicians(true);
      const response = await fetch('/api/users?onlyTechnicians=true');
      if (!response.ok) throw new Error('Failed to fetch technicians');
      
      const data = await response.json();
      setTechnicians(data.data || []);
    } catch (error) {
      console.error('Error fetching technicians:', error);
      // Don't show error toast - technician field is optional
    } finally {
      setLoadingTechnicians(false);
    }
  };

  const generateTicketPreviews = async () => {
    try {
      setLoadingTickets(true);
      
      // Get the next ticket number
      const response = await fetch('/api/service-request?nextTicket=true');
      if (!response.ok) throw new Error('Failed to fetch next ticket');
      
      const data = await response.json();
      const nextTicketId = data.data?.nextTicketId;
      
      if (!nextTicketId) return;
      
      // Parse the ticket format (e.g., "25-0001")
      const parts = nextTicketId.split('-');
      if (parts.length !== 2) return;
      
      const prefix = parts[0];
      let counter = parseInt(parts[1]);
      
      // Assign sequential ticket numbers to equipment
      const updatedEquipment = equipment.map((eq) => ({
        ...eq,
        ticketNumber: `${prefix}-${String(counter++).padStart(4, '0')}`,
      }));
      
      setEquipment(updatedEquipment);
      
      // Re-group by location with ticket numbers
      const grouped = new Map<string, EquipmentItem[]>();
      updatedEquipment.forEach((eq: EquipmentItem) => {
        const key = `${eq.location}|||${eq.subLocation}`;
        if (!grouped.has(key)) {
          grouped.set(key, []);
        }
        grouped.get(key)!.push(eq);
      });
      
      setEquipmentByLocation(grouped);
    } catch (error) {
      console.error('Error generating ticket previews:', error);
      // Don't show error toast - tickets will still be generated server-side
    } finally {
      setLoadingTickets(false);
    }
  };

  const handleCheckout = async () => {
    // Validate required fields
    if (!scheduledAt) {
      toast.error("Please select a schedule date");
      return;
    }

    try {
      setSubmitting(true);
      
      // Create job orders for each location with individual error tracking
      const locationEntries = Array.from(equipmentByLocation.entries());
      const results: Array<{
        locationKey: string;
        success: boolean;
        orderNumber?: string;
        itemCount?: number;
        error?: string;
      }> = [];
      
      for (const [locationKey, items] of locationEntries) {
        const [campus, sublocation] = locationKey.split('|||');
        
        try {
          const response = await fetch('/api/job-orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              campus,
              sublocation,
              equipmentIds: items.map(eq => eq.id),
              requestType,
              priority,
              scheduledAt: new Date(scheduledAt).toISOString(),
              assignedTechnicianId: assignedTechnicianId !== 'unassigned' ? assignedTechnicianId : undefined,
              notes: notes.trim() || undefined,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            results.push({
              locationKey,
              success: true,
              orderNumber: data.orderNumber,
              itemCount: data.itemCount,
            });
          } else {
            let errorMessage = 'Unknown error';
            try {
              const errorData = await response.json();
              errorMessage = errorData.details || errorData.error || 'Unknown error';
            } catch (jsonError) {
              errorMessage = `HTTP ${response.status}: ${response.statusText}`;
            }
            results.push({
              locationKey,
              success: false,
              error: errorMessage,
            });
          }
        } catch (error) {
          results.push({
            locationKey,
            success: false,
            error: error instanceof Error ? error.message : 'Network error',
          });
        }
      }

      // Analyze results
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);
      
      if (successful.length === 0) {
        // All failed
        toast.error(`Failed to create job orders. ${failed.length} location${failed.length !== 1 ? 's' : ''} failed.`, {
          description: failed.map(f => {
            const [campus, sublocation] = f.locationKey.split('|||');
            return `${campus} → ${sublocation}: ${f.error}`;
          }).join('\n'),
          duration: 8000,
        });
      } else if (failed.length === 0) {
        // All succeeded
        const totalServiceRequests = successful.reduce((sum, r) => sum + (r.itemCount || 0), 0);
        toast.success(
          `${successful.length} job order${successful.length !== 1 ? 's' : ''} created! ${totalServiceRequests} service request${totalServiceRequests !== 1 ? 's' : ''} generated.`,
          { duration: 3000 }
        );
        
        // Redirect to service requests page
        setTimeout(() => {
          router.push('/service-requests');
        }, 1500);
      } else {
        // Partial success
        const totalServiceRequests = successful.reduce((sum, r) => sum + (r.itemCount || 0), 0);
        toast.warning(
          `Partial success: ${successful.length} of ${results.length} job orders created (${totalServiceRequests} service requests)`,
          {
            description: `Failed locations:\n${failed.map(f => {
              const [campus, sublocation] = f.locationKey.split('|||');
              return `• ${campus} → ${sublocation}`;
            }).join('\n')}`,
            duration: 10000,
          }
        );
        
        // Still redirect to show the successful ones
        setTimeout(() => {
          router.push('/service-requests');
        }, 2500);
      }
    } catch (error) {
      console.error('Error submitting job order:', error);
      const message = error instanceof Error ? error.message : "Failed to submit job order";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoBack = () => {
    router.push('/job-orders');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (equipment.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">No equipment selected</p>
          <Button onClick={() => router.push('/job-orders')}>
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const locationCount = equipmentByLocation.size;

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            className="mb-4"
            onClick={handleGoBack}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Job Orders
          </Button>
          
          <div className="flex items-center gap-3 mb-2">
            <ClipboardList className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">
                {locationCount > 1 ? 'Review Batch Job Order' : 'Review Job Order'}
              </h1>
              <p className="text-muted-foreground">
                {locationCount > 1 
                  ? `${locationCount} job orders will be created (one per location)`
                  : 'Review and submit your order'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Job Order Details */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Order Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-muted-foreground mb-1">Locations</div>
                <div className="space-y-1">
                  {Array.from(equipmentByLocation.entries()).map(([locationKey, items]) => {
                    const [campus, sublocation] = locationKey.split('|||');
                    return (
                      <div key={locationKey} className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{campus}</span>
                        <span className="text-muted-foreground">→</span>
                        <span>{sublocation}</span>
                        <Badge variant="outline" className="ml-2">
                          {items.length} item{items.length !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Summary</div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Box className="h-4 w-4 text-muted-foreground" />
                    <span className="font-semibold">{equipment.length} Total Equipment</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ClipboardList className="h-4 w-4 text-muted-foreground" />
                    <span className="font-semibold">
                      {locationCount} {locationCount > 1 ? 'Batch' : 'Job'} Order{locationCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                  {locationCount > 1 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Equipment from different locations will be split into separate job orders
                    </p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Service Request Details */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Service Request Details</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              These settings will be applied to all service requests created from this job order.
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Request Type */}
              <div className="flex flex-col gap-2">
                <Label htmlFor="requestType">
                  Request Type <span className="text-destructive">*</span>
                </Label>
                <Select value={requestType} onValueChange={(v) => setRequestType(v as ServiceRequestType)}>
                  <SelectTrigger id="requestType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ServiceRequestType.PREVENTIVE_MAINTENANCE}>
                      Preventive Maintenance
                    </SelectItem>
                    <SelectItem value={ServiceRequestType.CORRECTIVE_MAINTENANCE}>
                      Corrective Maintenance
                    </SelectItem>
                    <SelectItem value={ServiceRequestType.INSTALL}>Install</SelectItem>
                    <SelectItem value={ServiceRequestType.ASSESS}>Assess</SelectItem>
                    <SelectItem value={ServiceRequestType.OTHER}>Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Priority */}
              <div className="flex flex-col gap-2">
                <Label htmlFor="priority">
                  Priority <span className="text-destructive">*</span>
                </Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as ServiceRequestPriority)}>
                  <SelectTrigger id="priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ServiceRequestPriority.LOW}>Low</SelectItem>
                    <SelectItem value={ServiceRequestPriority.MEDIUM}>Medium</SelectItem>
                    <SelectItem value={ServiceRequestPriority.HIGH}>High</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Schedule Date */}
              <div className="flex flex-col gap-2">
                <Label htmlFor="scheduledAt">
                  Schedule Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="scheduledAt"
                  type="date"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  required
                />
              </div>

              {/* Assigned Technician */}
              <div className="flex flex-col gap-2">
                <Label htmlFor="technician">Assigned Technician (Optional)</Label>
                <Select value={assignedTechnicianId} onValueChange={setAssignedTechnicianId}>
                  <SelectTrigger id="technician">
                    <SelectValue placeholder={loadingTechnicians ? "Loading..." : "Select technician (optional)"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">No Assignment</SelectItem>
                    {technicians.map((tech) => (
                      <SelectItem key={tech.id} value={tech.id}>
                        {tech.displayName || tech.email || tech.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Notes Section */}
            <div className="mt-4">
              <Label htmlFor="notes">Additional Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any additional notes or instructions for this job order..."
                className="mt-2 min-h-[80px]"
              />
            </div>
          </CardContent>
        </Card>

        {/* Equipment List - Grouped by Location */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="flex items-center gap-2">
                  Equipment List
                  {loadingTickets && (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Equipment grouped by location. {loadingTickets ? 'Generating ticket numbers...' : 'Ticket numbers shown are previews and will be finalized upon submission.'}
                </p>
              </div>
              <div className="flex flex-col gap-2 items-end">
                <Badge variant="outline" className="text-xs">
                  {requestType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </Badge>
                <Badge variant={priority === 'high' ? 'destructive' : priority === 'low' ? 'secondary' : 'default'} className="text-xs">
                  {priority.toUpperCase()} Priority
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {Array.from(equipmentByLocation.entries()).map(([locationKey, items], groupIndex) => {
                const [campus, sublocation] = locationKey.split('|||');
                return (
                  <div key={locationKey}>
                    {groupIndex > 0 && <Separator className="my-6" />}
                    
                    {/* Location Header */}
                    <div className="flex items-center gap-2 mb-4 p-3 bg-muted/50 rounded-lg">
                      <MapPin className="h-5 w-5 text-primary" />
                      <div className="flex-1">
                        <div className="font-semibold">{campus} → {sublocation}</div>
                        <div className="text-sm text-muted-foreground">
                          {items.length} equipment item{items.length !== 1 ? 's' : ''}
                        </div>
                      </div>
                      <Badge variant="secondary">
                        Job Order {groupIndex + 1}
                      </Badge>
                    </div>
                    
                    {/* Equipment in this location */}
                    <div className="space-y-3 ml-4">
                      {items.map((item, itemIndex) => (
                        <div key={item.id} className="flex items-start justify-between p-3 border rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              {item.ticketNumber && (
                                <Badge variant="outline" className="font-mono text-xs">
                                  #{item.ticketNumber}
                                </Badge>
                              )}
                              <h3 className="font-semibold">{item.name}</h3>
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
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button
            variant="outline"
            onClick={handleGoBack}
            disabled={submitting}
            size="lg"
          >
            Go Back
          </Button>
          <Button
            onClick={handleCheckout}
            disabled={submitting}
            size="lg"
            className="gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4" />
                Checkout & Submit
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

