"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search, ClipboardList, ArrowRight, MapPin } from "lucide-react";
import { toast } from "sonner";
import Header from "@/components/Header";
import { useLanguage } from "@/hooks/useLanguage";

interface Equipment {
  id: string;
  name: string;
  partNumber?: string;
  model?: string;
  manufacturer?: string;
  serialNumber?: string;
  location: string; // legacy - campus
  subLocation?: string;
  locationId?: string;
  locationName?: string;
  campus?: string;
  status: string;
}

export default function CreateJobOrderPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [filteredEquipment, setFilteredEquipment] = useState<Equipment[]>([]);
  const [selectedEquipment, setSelectedEquipment] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [locations, setLocations] = useState<Array<{id: string, name: string, nameAr?: string, campus: string}>>([]);

  useEffect(() => {
    fetchEquipment();
    fetchLocations();
  }, []);

  useEffect(() => {
    filterEquipment();
  }, [equipment, searchTerm, locationFilter, statusFilter]);

  const fetchLocations = async () => {
    try {
      const response = await fetch('/api/locations');
      if (response.ok) {
        const data = await response.json();
        setLocations(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch locations:', error);
    }
  };

  const fetchEquipment = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/equipment?pageSize=10000');
      if (!response.ok) throw new Error('Failed to fetch equipment');
      
      const data = await response.json();
      setEquipment(data.data || []);
    } catch (error) {
      console.error('Error fetching equipment:', error);
      toast.error("Failed to load equipment");
    } finally {
      setLoading(false);
    }
  };

  const filterEquipment = () => {
    let filtered = equipment;

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(eq => 
        eq.name.toLowerCase().includes(term) ||
        eq.partNumber?.toLowerCase().includes(term) ||
        eq.model?.toLowerCase().includes(term) ||
        eq.manufacturer?.toLowerCase().includes(term) ||
        eq.serialNumber?.toLowerCase().includes(term) ||
        eq.locationName?.toLowerCase().includes(term) ||
        eq.campus?.toLowerCase().includes(term) ||
        eq.subLocation?.toLowerCase().includes(term)
      );
    }

    // Location filter
    if (locationFilter !== "all") {
      filtered = filtered.filter(eq => eq.locationId === locationFilter);
    }

    // Status filter
    if (statusFilter !== "all" && statusFilter !== "unknown") {
      filtered = filtered.filter(eq => eq.status === statusFilter);
    } else if (statusFilter === "unknown") {
      filtered = filtered.filter(eq => !eq.status || eq.status.trim() === '');
    }

    setFilteredEquipment(filtered);
  };

  const handleEquipmentToggle = (equipmentId: string) => {
    const newSelected = new Set(selectedEquipment);
    if (newSelected.has(equipmentId)) {
      newSelected.delete(equipmentId);
    } else {
      newSelected.add(equipmentId);
    }
    setSelectedEquipment(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedEquipment.size === filteredEquipment.length) {
      setSelectedEquipment(new Set());
    } else {
      setSelectedEquipment(new Set(filteredEquipment.map(eq => eq.id)));
    }
  };

  const handleCreateJobOrder = () => {
    if (selectedEquipment.size === 0) {
      toast.error("Please select at least one equipment item");
      return;
    }

    const equipmentIds = Array.from(selectedEquipment).join(',');
    router.push(`/job-orders/review?equipmentIds=${equipmentIds}`);
  };

  const getUniqueStatuses = () => {
    const statuses = [...new Set(equipment.map(eq => eq.status).filter(status => status && status.trim() !== ''))];
    return statuses.sort();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <ClipboardList className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold">Create Job Order</h1>
            </div>
            <p className="text-muted-foreground">
              Select equipment items to include in your job order
            </p>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Filter Equipment</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Filter by location or status to find equipment.
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search equipment..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={locationFilter} onValueChange={setLocationFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Locations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Locations</SelectItem>
                    {locations.map(location => {
                      const currentLang = t("lang");
                      const displayName = currentLang === "ar" 
                        ? (location.nameAr || location.name)
                        : location.name;
                      return (
                        <SelectItem key={location.id} value={location.id}>
                          <div className="flex flex-col items-start">
                            <span>{displayName}</span>
                            <span className="text-xs text-muted-foreground">{location.campus}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {getUniqueStatuses().map(status => (
                      <SelectItem key={status} value={status || 'unknown'}>
                        {status || 'Unknown Status'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={() => router.push('/job-orders/list')}>
                  View Job Orders
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Equipment Selection */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  Select Equipment ({selectedEquipment.size} selected)
                </CardTitle>
                <div className="flex gap-2">
                  {locationFilter !== "all" && filteredEquipment.length > 0 && (
                    <Button variant="outline" size="sm" onClick={handleSelectAll}>
                      {selectedEquipment.size === filteredEquipment.length ? 'Deselect All' : 'Select All'}
                    </Button>
                  )}
                  <Button 
                    onClick={handleCreateJobOrder}
                    disabled={selectedEquipment.size === 0}
                    className="gap-2"
                  >
                    Create Job Order
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredEquipment.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No equipment found matching your filters</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {filteredEquipment.map((eq) => (
                    <div
                      key={eq.id}
                      className={`flex items-center gap-4 p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedEquipment.has(eq.id) 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => handleEquipmentToggle(eq.id)}
                    >
                      <Checkbox
                        checked={selectedEquipment.has(eq.id)}
                        onChange={() => handleEquipmentToggle(eq.id)}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{eq.name}</h3>
                          <Badge variant="secondary" className="capitalize">
                            {eq.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          {eq.partNumber && (
                            <span>Tag: {eq.partNumber}</span>
                          )}
                          {eq.model && <span>Model: {eq.model}</span>}
                          {eq.manufacturer && <span>Make: {eq.manufacturer}</span>}
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            <div className="flex flex-col">
                              <span className="font-medium">{eq.locationName || eq.subLocation || eq.location}</span>
                              {eq.campus && <span className="text-xs">{eq.campus}</span>}
                              {eq.subLocation && <span className="text-xs">Room: {eq.subLocation}</span>}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
