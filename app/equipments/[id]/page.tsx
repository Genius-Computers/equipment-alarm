"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { JEquipment } from "@/lib/types";
import { useParams } from "next/navigation";

const DetailPage = () => {
  const params = useParams();
  const id = String(params?.id || "");
  const [item, setItem] = useState<JEquipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const controller = new AbortController();
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/equipment/${id}`, { cache: "no-store", signal: controller.signal });
        if (!res.ok) throw new Error("Failed to load equipment");
        const json = await res.json();
        if (!alive) return;
        setItem(json.data as JEquipment);
      } catch (e: unknown) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setError(e instanceof Error ? e.message : "Error loading equipment");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
      controller.abort();
    };
  }, [id]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-6 py-8">
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : error ? (
          <div className="text-sm text-destructive">{error}</div>
        ) : item ? (
          <Card>
            <CardHeader>
              <CardTitle>{item.name}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Part Number</div>
                <div>{item.partNumber || "-"}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Location</div>
                <div>{item.location || "-"}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Model</div>
                <div>{item.model || "-"}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Manufacturer</div>
                <div>{item.manufacturer || "-"}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Serial Number</div>
                <div>{item.serialNumber || "-"}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Status</div>
                <div>{String(item.status || "-")}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Maintenance Status</div>
                <div>{item.maintenanceStatus || "-"}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Next Maintenance</div>
                <div>{item.nextMaintenance || "-"}</div>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </main>
    </div>
  );
};

export default DetailPage;


