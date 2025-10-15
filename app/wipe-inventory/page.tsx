"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function WipeInventoryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const handleWipe = async () => {
    if (confirmText !== "WIPE ALL DATA") {
      toast.error("Please type 'WIPE ALL DATA' to confirm");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/wipe-inventory", {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to wipe data");
      }

      const data = await res.json();
      toast.success("Data wiped successfully!", {
        description: `Deleted ${data.deleted.equipment} equipment, ${data.deleted.serviceRequests} service requests, ${data.deleted.jobOrders} job orders, ${data.deleted.spareParts} spare parts`,
      });

      // Redirect to home
      router.push("/");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to wipe data");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="w-full max-w-2xl border-destructive">
        <CardHeader>
          <div className="flex items-center gap-3">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <div>
              <CardTitle className="text-2xl text-destructive">⚠️ Wipe All Inventory Data</CardTitle>
              <CardDescription>This action cannot be undone</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-destructive/10 p-4 rounded-lg space-y-2">
            <p className="font-semibold text-destructive">This will permanently delete:</p>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>All equipment items</li>
              <li>All service requests and tickets</li>
              <li>All job orders</li>
              <li>All spare parts</li>
            </ul>
          </div>

          <div className="bg-green-500/10 p-4 rounded-lg space-y-2">
            <p className="font-semibold text-green-700 dark:text-green-400">This will NOT delete:</p>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Users and their accounts</li>
              <li>Locations (campuses and buildings)</li>
              <li>System settings</li>
            </ul>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium">
              Type <span className="font-mono bg-muted px-2 py-1 rounded">WIPE ALL DATA</span> to confirm:
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-destructive"
              placeholder="WIPE ALL DATA"
              disabled={loading}
            />
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => router.push("/")}
              disabled={loading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleWipe}
              disabled={loading || confirmText !== "WIPE ALL DATA"}
              className="flex-1"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {loading ? "Wiping..." : "Wipe All Data"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

