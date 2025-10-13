"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Loader2, MapPin, Box } from "lucide-react";
import { toast } from "sonner";
import { Equipment } from "@/lib/types";
import { isValidCampus } from "@/lib/config";

export default function SubLocationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const campus = decodeURIComponent(params.campus as string);
  const sublocation = decodeURIComponent(params.sublocation as string);

  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchEquipment = async () => {
    try {
      setLoading(true);
      
      // Validate campus
      if (!isValidCampus(campus)) {
        toast("Error", { description: "Invalid campus selected" });
        router.push('/locations');
        return;
      }
      
      // Fetch location to get the ID
      const locationsRes = await fetch(`/api/locations?campus=${encodeURIComponent(campus)}`);
      if (locationsRes.ok) {
        const locationsData = await locationsRes.json();
        const location = locationsData.data?.find(
          (loc: { name: string; id: string }) => loc.name === sublocation
        );
        if (location) {
          setLocationId(location.id);
        }
      }
      
      // Fetch all equipment and filter by location and sublocation
      const equipmentRes = await fetch(`/api/equipment?pageSize=10000`);
      if (!equipmentRes.ok) throw new Error('Failed to fetch equipment');
      const equipmentData = await equipmentRes.json();
      const allEquipment: Equipment[] = equipmentData.data || [];

      // Filter equipment by campus and sublocation (only valid campuses)
      const filtered = allEquipment.filter(
        (eq) => eq.location === campus && 
                eq.subLocation === sublocation &&
                isValidCampus(eq.location)
      );

      setEquipment(filtered);
    } catch (error) {
      console.error('Error fetching equipment:', error);
      toast("Error", { 
        description: error instanceof Error ? error.message : "Failed to fetch equipment" 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLocation = async () => {
    if (!locationId) return;
    
    setDeleting(true);
    try {
      const response = await fetch(`/api/locations/${locationId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete location');
      }

      toast("Success", { description: "Location deleted successfully" });
      router.push(`/locations/${encodeURIComponent(campus)}`);
    } catch (error) {
      toast("Error", { 
        description: error instanceof Error ? error.message : "Failed to delete location" 
      });
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  useEffect(() => {
    if (campus && sublocation) {
      void fetchEquipment();
    }
  }, [campus, sublocation]);

  const getMaintenanceStatusColor = (status?: string) => {
    switch (status) {
      case 'good':
        return 'default';
      case 'due':
        return 'secondary';
      case 'overdue':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            className="mb-4"
            onClick={() => router.push(`/locations/${encodeURIComponent(campus)}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to {campus}
          </Button>
          
          <div className="flex items-center gap-3 mb-2">
            <MapPin className="h-8 w-8 text-primary" />
            <div>
              <div className="text-sm text-muted-foreground">{campus}</div>
              <h1 className="text-3xl font-bold">{sublocation}</h1>
            </div>
          </div>
          
          {!loading && (
            <div className="flex items-center justify-between mt-4">
              <Badge variant="outline" className="text-base py-1 px-3">
                <Box className="h-4 w-4 mr-2" />
                {equipment.length} Equipment
              </Badge>
              {/* Status badge will go here later */}
              
              {locationId && (
                <button
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-xs text-muted-foreground hover:text-destructive transition-colors underline"
                >
                  delete
                </button>
              )}
            </div>
          )}
        </div>

        {/* Equipment List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : equipment.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-muted-foreground">
                <Box className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No equipment found at this location</p>
                <p className="text-sm mt-2">Equipment will appear here once added</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {equipment.map((eq) => (
              <Card 
                key={eq.id}
                className="cursor-pointer hover:shadow-lg transition-all"
                onClick={() => router.push(`/equipments/${eq.id}`)}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-1">{eq.name}</CardTitle>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{eq.partNumber}</span>
                        {eq.serialNumber && (
                          <>
                            <span>•</span>
                            <span>SN: {eq.serialNumber}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge variant={getMaintenanceStatusColor(eq.maintenanceStatus)}>
                        {eq.maintenanceStatus || 'N/A'}
                      </Badge>
                      <Badge variant="outline">
                        {eq.status}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    {eq.manufacturer && (
                      <div>
                        <span className="text-muted-foreground">Manufacturer:</span>
                        <p className="font-medium">{eq.manufacturer}</p>
                      </div>
                    )}
                    {eq.model && (
                      <div>
                        <span className="text-muted-foreground">Model:</span>
                        <p className="font-medium">{eq.model}</p>
                      </div>
                    )}
                    {eq.lastMaintenance && (
                      <div>
                        <span className="text-muted-foreground">Last Maintenance:</span>
                        <p className="font-medium">
                          {new Date(eq.lastMaintenance).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                    {eq.nextMaintenance && (
                      <div>
                        <span className="text-muted-foreground">Next Maintenance:</span>
                        <p className="font-medium">
                          {new Date(eq.nextMaintenance).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Location</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{sublocation}&quot;?
              {equipment.length > 0 && (
                <span className="block mt-2 text-destructive font-medium">
                  This location contains {equipment.length} equipment item(s) and cannot be deleted.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDeleteLocation();
              }}
              disabled={deleting || equipment.length > 0}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

