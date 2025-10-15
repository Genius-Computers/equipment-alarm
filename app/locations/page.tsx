"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Plus, Loader2, MapPin, ChevronRight, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { VALID_CAMPUSES } from "@/lib/config";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/hooks/useLanguage";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Location {
  id: string;
  campus: string;
  name: string;
  nameAr?: string;
}

export default function LocationsPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [newLocationName, setNewLocationName] = useState("");
  const [newLocationCampus, setNewLocationCampus] = useState("");
  const [adding, setAdding] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [equipmentCounts, setEquipmentCounts] = useState<Record<string, number>>({});

  // Helper function to get location display name based on language
  const getLocationName = (location: Location) => {
    const currentLang = t("lang");
    if (currentLang === "ar") {
      // Arabic mode: prefer Arabic name, fallback to English
      return location.nameAr || location.name;
    } else {
      // English mode: prefer English name, fallback to Arabic
      return location.name;
    }
  };

  const fetchLocations = async () => {
    try {
      setLoading(true);
      
      // Fetch all locations (no campus filter)
      const locationsRes = await fetch(`/api/locations`);
      if (!locationsRes.ok) throw new Error('Failed to fetch locations');
      const locationsData = await locationsRes.json();
      setLocations(locationsData.data || []);

      // Fetch equipment to count items per location
      const equipmentRes = await fetch(`/api/equipment?pageSize=10000`);
      if (equipmentRes.ok) {
        const equipmentData = await equipmentRes.json();
        const counts: Record<string, number> = {};
        equipmentData.data.forEach((eq: { locationId?: string }) => {
          if (eq.locationId) {
            counts[eq.locationId] = (counts[eq.locationId] || 0) + 1;
          }
        });
        setEquipmentCounts(counts);
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
      toast("Error", { 
        description: error instanceof Error ? error.message : "Failed to fetch locations" 
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchLocations();
  }, []);

  const handleAddLocation = async () => {
    if (!newLocationName.trim()) {
      toast("Error", { description: "Please enter a location name" });
      return;
    }

    if (!newLocationCampus) {
      toast("Error", { description: "Please select a campus" });
      return;
    }

    setAdding(true);
    try {
      const response = await fetch('/api/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campus: newLocationCampus,
          name: newLocationName.trim(),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add location');
      }

      toast("Success", { description: "Location added successfully" });
      setNewLocationName("");
      setNewLocationCampus("");
      await fetchLocations();
    } catch (error) {
      toast("Error", { 
        description: error instanceof Error ? error.message : "Failed to add location" 
      });
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteLocation = async (locationId: string, locationName: string) => {
    setDeleting(locationId);
    try {
      const response = await fetch(`/api/locations/${locationId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete location');
      }

      toast("Success", { description: `Location "${locationName}" deleted successfully` });
      await fetchLocations();
    } catch (error) {
      toast("Error", { 
        description: error instanceof Error ? error.message : "Failed to delete location" 
      });
    } finally {
      setDeleting(null);
    }
  };

  const filteredLocations = filter === "all" 
    ? locations 
    : locations.filter(loc => loc.campus === filter);

  const locationsByCanvas = VALID_CAMPUSES.map(campus => ({
    campus,
    count: locations.filter(loc => loc.campus === campus).length
  }));

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Building2 className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">{t("locations.title")}</h1>
          </div>
          <p className="text-muted-foreground">
            {t("locations.subtitle")}
          </p>
        </div>

        {/* Campus overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {locationsByCanvas.map(({ campus, count }) => (
            <Card key={campus} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-primary/10">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{campus}</h3>
                    <p className="text-sm text-muted-foreground">{count} locations</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFilter(filter === campus ? "all" : campus)}
                >
                  {filter === campus ? "Show All" : "Filter"}
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {/* Add Location Form */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>{t("locations.addLocation")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">{t("locations.campus")}</label>
                <Select value={newLocationCampus} onValueChange={setNewLocationCampus}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("locations.selectCampus")} />
                  </SelectTrigger>
                  <SelectContent>
                    {VALID_CAMPUSES.map((campus) => (
                      <SelectItem key={campus} value={campus}>
                        {campus}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">{t("locations.locationName")}</label>
                <Input
                  placeholder={t("locations.enterName")}
                  value={newLocationName}
                  onChange={(e) => setNewLocationName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      void handleAddLocation();
                    }
                  }}
                  disabled={adding}
                />
              </div>
              <div className="flex items-end">
                <Button 
                  onClick={handleAddLocation} 
                  disabled={adding || !newLocationName.trim() || !newLocationCampus}
                  className="w-full"
                >
                  {adding ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  {t("locations.addButton")}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Locations List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredLocations.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-muted-foreground">
                <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>
                  {filter === "all" 
                    ? t("locations.noLocations")
                    : t("locations.noLocationsFiltered", { campus: filter })
                  }
                </p>
                <p className="text-sm mt-2">{t("locations.addFirst")}</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">
                {filter === "all" ? t("locations.allLocations") : `${filter} ${t("locations.title")}`} 
                ({filteredLocations.length})
              </h2>
              {filter !== "all" && (
                <Button variant="outline" onClick={() => setFilter("all")}>
                  {t("locations.showAll")}
                </Button>
              )}
            </div>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredLocations.map((location) => {
                const equipmentCount = equipmentCounts[location.id] || 0;
                const canDelete = equipmentCount === 0;
                
                return (
                  <Card 
                    key={location.id}
                    className="group hover:shadow-lg transition-all relative"
                  >
                    <CardContent 
                      className="p-6 cursor-pointer"
                      onClick={() => router.push(`/locations/${location.id}`)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="p-2 rounded-full bg-primary/10">
                            <MapPin className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold group-hover:text-primary transition-colors">
                              {getLocationName(location)}
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="secondary">
                                {location.campus}
                              </Badge>
                              {equipmentCount > 0 && (
                                <Badge variant="outline" className="text-xs">
                                  {equipmentCount} items
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {canDelete && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={(e) => e.stopPropagation()}
                                  disabled={deleting === location.id}
                                >
                                  {deleting === location.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                                  )}
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>{t("locations.delete")}</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {t("locations.deleteConfirm", { name: getLocationName(location) })}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => handleDeleteLocation(location.id, getLocationName(location))}
                                    className="bg-destructive hover:bg-destructive/90"
                                  >
                                    {t("common.delete")}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                          <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

