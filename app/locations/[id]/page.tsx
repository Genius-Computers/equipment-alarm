"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, Building } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/hooks/useLanguage";

interface Location {
  id: string;
  campus: string;
  name: string;
  nameAr?: string;
}

interface Equipment {
  id: string;
  name: string;
  partNumber: string;
  status: string;
  subLocation: string;
  locationId?: string;
  locationName?: string;
  campus?: string;
}

export default function LocationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { t } = useLanguage();
  const locationId = params.id as string;

  const [location, setLocation] = useState<Location | null>(null);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);

  const getLocationName = (loc: Location) => {
    const currentLang = t("lang");
    if (currentLang === "ar") {
      return loc.nameAr || loc.name;
    } else {
      return loc.name;
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch location details
      const locationRes = await fetch(`/api/locations/${locationId}`);
      if (locationRes.ok) {
        const locationData = await locationRes.json();
        setLocation(locationData.data);
      } else if (locationRes.status === 404) {
        // Location was deleted or doesn't exist - redirect to locations page
        router.push('/locations');
        return;
      } else {
        throw new Error('Location not found');
      }

      // Fetch equipment in this location
      // For now, we'll fetch all equipment and filter (can be optimized later)
      const equipmentRes = await fetch(`/api/equipment?pageSize=1000`);
      if (equipmentRes.ok) {
        const equipmentData = await equipmentRes.json();
        const allEquipment: Equipment[] = equipmentData.data || [];
        
        // Filter equipment for this location
        const locationEquipment = allEquipment.filter(
          (eq) => eq.locationId === locationId
        );
        setEquipment(locationEquipment);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast("Error", { 
        description: error instanceof Error ? error.message : "Failed to fetch location data" 
      });
      // Redirect back to locations if location not found
      if (error instanceof Error && error.message.includes('not found')) {
        router.push('/locations');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (locationId) {
      void fetchData();
    }
  }, [locationId]);


  if (loading) {
    return (
      <div className="min-h-screen p-4 md:p-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!location) {
    return (
      <div className="min-h-screen p-4 md:p-8">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Building className="h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Location Not Found</h2>
          <p className="text-muted-foreground mb-4">
            The location you're looking for doesn't exist.
          </p>
          <Button onClick={() => router.push('/locations')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Locations
          </Button>
        </div>
      </div>
    );
  }

  // Group equipment by sublocation (text field)
  const equipmentBySublocations = equipment.reduce((acc, eq) => {
    const subloc = eq.subLocation?.trim() || "General";
    if (!acc[subloc]) {
      acc[subloc] = [];
    }
    acc[subloc].push(eq);
    return acc;
  }, {} as Record<string, Equipment[]>);

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            className="mb-4"
            onClick={() => router.push('/locations')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Locations
          </Button>
          
          <div className="flex items-center gap-3 mb-2">
            <Building className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">{getLocationName(location)}</h1>
              <Badge variant="secondary" className="mt-1">
                {location.campus}
              </Badge>
            </div>
          </div>
          <p className="text-muted-foreground">
            {t("locations.viewEquipment")}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Building className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{equipment.length}</p>
                  <p className="text-sm text-muted-foreground">{t("locations.equipmentItems")}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Building className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-2xl font-bold text-green-600">
                    {equipment.filter(eq => eq.status === 'Working').length}
                  </p>
                  <p className="text-sm text-muted-foreground">{t("locations.workingEquipment")}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Equipment grouped by sublocation */}
        <div className="space-y-6">
          {equipment.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <Building className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>{t("locations.noEquipment")}</p>
                  <p className="text-sm mt-2">{t("locations.equipmentWillAppear")}</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            Object.entries(equipmentBySublocations).map(([sublocationName, items]) => (
              <Card key={sublocationName}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building className="h-5 w-5" />
                    {sublocationName === "General" ? t("locations.general") : sublocationName}
                    <Badge variant="outline">
                      {items.length} {items.length === 1 ? 'item' : 'items'}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {items.map((item) => (
                      <Card 
                        key={item.id} 
                        className="p-4 cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => router.push(`/equipments/${item.id}`)}
                      >
                        <div>
                          <h4 className="font-semibold">{item.name}</h4>
                          <p className="text-sm text-muted-foreground">{item.partNumber}</p>
                          {sublocationName !== "General" && (
                            <p className="text-xs text-muted-foreground mt-1">{item.subLocation}</p>
                          )}
                          <Badge 
                            variant={item.status === 'Working' ? 'default' : 'destructive'}
                            className="mt-2"
                          >
                            {item.status}
                          </Badge>
                        </div>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
