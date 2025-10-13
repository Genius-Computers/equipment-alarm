"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Plus, Loader2, MapPin, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { isValidCampus } from "@/lib/config";

interface Location {
  id: string;
  campus: string;
  name: string;
}

export default function CampusLocationsPage() {
  const params = useParams();
  const router = useRouter();
  const campus = decodeURIComponent(params.campus as string);

  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [newLocationName, setNewLocationName] = useState("");
  const [adding, setAdding] = useState(false);

  const fetchLocations = async () => {
    try {
      setLoading(true);
      
      // Validate campus
      if (!isValidCampus(campus)) {
        toast("Error", { description: "Invalid campus selected" });
        router.push('/locations');
        return;
      }
      
      // Fetch locations only
      const locationsRes = await fetch(`/api/locations?campus=${encodeURIComponent(campus)}`);
      if (!locationsRes.ok) throw new Error('Failed to fetch locations');
      const locationsData = await locationsRes.json();
      setLocations(locationsData.data || []);
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
    if (campus) {
      void fetchLocations();
    }
  }, [campus]);

  const handleAddLocation = async () => {
    if (!newLocationName.trim()) {
      toast("Error", { description: "Please enter a location name" });
      return;
    }

    setAdding(true);
    try {
      const response = await fetch('/api/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campus,
          name: newLocationName.trim(),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add location');
      }

      toast("Success", { description: "Location added successfully" });
      setNewLocationName("");
      await fetchLocations();
    } catch (error) {
      toast("Error", { 
        description: error instanceof Error ? error.message : "Failed to add location" 
      });
    } finally {
      setAdding(false);
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
            onClick={() => router.push('/locations')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Campuses
          </Button>
          
          <div className="flex items-center gap-3 mb-2">
            <MapPin className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">{campus}</h1>
          </div>
          <p className="text-muted-foreground">
            Manage locations and view equipment for this campus
          </p>
        </div>

        {/* Add Location Form */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Add New Location</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                placeholder="Enter location name (e.g., Engineering Building - Floor 2)"
                value={newLocationName}
                onChange={(e) => setNewLocationName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    void handleAddLocation();
                  }
                }}
                disabled={adding}
              />
              <Button onClick={handleAddLocation} disabled={adding || !newLocationName.trim()}>
                {adding ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Add
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Locations List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : locations.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-muted-foreground">
                <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No locations added yet</p>
                <p className="text-sm mt-2">Add your first location above</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {locations.map((location) => (
              <Card 
                key={location.id}
                className="group cursor-pointer hover:shadow-lg transition-all"
                onClick={() => router.push(`/locations/${encodeURIComponent(campus)}/${encodeURIComponent(location.name)}`)}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="p-2 rounded-full bg-primary/10">
                        <MapPin className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold group-hover:text-primary transition-colors">
                          {location.name}
                        </h3>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
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


