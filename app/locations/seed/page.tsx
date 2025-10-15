"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle, AlertCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

const LOCATIONS_TO_ADD = [
  { name: "College of Medicine", nameAr: "كلية الطب" },
  { name: "College of Dentistry", nameAr: "كلية طب الأسنان" },
  { name: "Pharmacy", nameAr: "كلية الصيدلة" },
  { name: "Nursing", nameAr: "كلية التمريض" },
  { name: "Applied Medical Sciences", nameAr: "كلية العلوم الطبية التطبيقية" },
  { name: "Public Health and Health Informatics", nameAr: "كلية الصحة العامة والمعلوماتية الصحية" },
  { name: "Sciences", nameAr: "كلية العلوم" },
  { name: "Diagnostics and Research", nameAr: "مركز التشخيص والبحوث" },
  { name: "University Clinics", nameAr: "العيادات الجامعية" },
];

interface SeedResult {
  message?: string;
  locations?: unknown[];
  summary?: {
    deleted: number;
    added: number;
    total: number;
    errors: number;
  };
  results?: {
    added: Array<{ campus: string; name: string }>;
    deleted: Array<{ campus: string; name: string }>;
    errors: Array<{ campus: string; name: string; error: string }>;
  };
}

export default function SeedLocationsPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SeedResult | null>(null);
  const [currentLocations, setCurrentLocations] = useState<Array<{ id: string; campus: string; name: string; name_ar?: string }>>([]);

  const fetchCurrentLocations = async () => {
    try {
      const response = await fetch('/api/locations/debug');
      if (response.ok) {
        const data = await response.json();
        setCurrentLocations(data.locations || []);
      }
    } catch (error) {
      console.error('Failed to fetch current locations:', error);
    }
  };

  useEffect(() => {
    void fetchCurrentLocations();
  }, []);

  const handleSeed = async () => {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/locations/seed', {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data);
        toast("Success", {
          description: `Deleted ${data.summary.deleted} old locations, added ${data.summary.added} new locations`,
        });
        // Refresh current locations
        await fetchCurrentLocations();
      } else {
        throw new Error(data.error || 'Failed to reset locations');
      }
    } catch (error) {
      toast("Error", {
        description: error instanceof Error ? error.message : "Failed to seed locations",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Reset Main Campus Locations</CardTitle>
            <CardDescription>
              ⚠️ This will DELETE all existing locations and add only the 9 official Main Campus locations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Current Locations in Database */}
            {currentLocations.length > 0 && (
              <div className="p-4 rounded-lg border bg-yellow-50 dark:bg-yellow-950/20">
                <div className="flex items-start gap-2 mb-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-yellow-900 dark:text-yellow-100">
                      Current Locations in Database ({currentLocations.length})
                    </h3>
                    <p className="text-sm text-yellow-800 dark:text-yellow-200 mt-1">
                      {currentLocations.some(loc => !loc.name_ar) && (
                        <span className="font-semibold">⚠️ Missing translations detected! </span>
                      )}
                      Click the button below to replace these with the 9 official locations.
                    </p>
                  </div>
                </div>
                <div className="space-y-1 text-sm max-h-60 overflow-y-auto">
                  {currentLocations.map((loc, idx) => (
                    <div key={loc.id} className="flex items-start gap-2 p-2 rounded bg-white/50 dark:bg-black/20">
                      <span className="text-muted-foreground">{idx + 1}.</span>
                      <div className="flex-1">
                        <div className="font-medium">
                          {loc.name}
                          {!loc.name_ar && <Badge variant="destructive" className="ml-2 text-xs">No Arabic</Badge>}
                        </div>
                        {loc.name_ar && (
                          <div className="text-xs text-muted-foreground">{loc.name_ar}</div>
                        )}
                        <div className="text-xs text-muted-foreground">{loc.campus}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Preview of locations */}
            <div>
              <h3 className="font-semibold mb-3">Locations to be added:</h3>
              <div className="grid grid-cols-1 gap-2 text-sm">
                {LOCATIONS_TO_ADD.map((loc, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 rounded bg-muted/50">
                    <span className="text-muted-foreground">{idx + 1}.</span>
                    <div className="flex-1">
                      <div className="font-medium">{loc.name}</div>
                      <div className="text-xs text-muted-foreground">{loc.nameAr}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Button */}
            <Button 
              onClick={handleSeed} 
              disabled={loading}
              className="w-full"
              size="lg"
              variant="destructive"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Resetting Locations...
                </>
              ) : (
                <>Reset to {LOCATIONS_TO_ADD.length} Official Locations</>
              )}
            </Button>

            {/* Results */}
            {result && result.summary && (
              <div className="space-y-3 mt-6 p-4 rounded-lg border bg-muted/20">
                <div className="flex items-center gap-2 font-semibold">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Summary
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Deleted</div>
                    <div className="text-2xl font-bold text-red-600">{result.summary.deleted}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Added</div>
                    <div className="text-2xl font-bold text-green-600">{result.summary.added}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Errors</div>
                    <div className="text-2xl font-bold text-orange-600">{result.summary.errors}</div>
                  </div>
                </div>

                {result.results && result.results.added.length > 0 && (
                  <div>
                    <div className="font-medium text-sm mb-2 text-green-600">✓ Added:</div>
                    <div className="space-y-1 text-sm">
                      {result.results.added.map((loc: string, idx: number) => (
                        <div key={idx} className="text-muted-foreground">• {loc}</div>
                      ))}
                    </div>
                  </div>
                )}


                {result.results && result.results.errors.length > 0 && (
                  <div>
                    <div className="font-medium text-sm mb-2 text-destructive flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      Errors:
                    </div>
                    <div className="space-y-1 text-sm">
                      {result.results.errors.map((err: string, idx: number) => (
                        <div key={idx} className="text-destructive">• {err}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

