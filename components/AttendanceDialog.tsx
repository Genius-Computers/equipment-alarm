"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ClipboardCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface AttendanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLogIn: () => Promise<void>;
}

export function AttendanceDialog({ open, onOpenChange, onLogIn }: AttendanceDialogProps) {
  const [loading, setLoading] = useState(false);

  const handleLogIn = async () => {
    try {
      setLoading(true);
      await onLogIn();
      toast("Success", { description: "Attendance logged successfully" });
      onOpenChange(false);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to log attendance";
      toast("Error", { description: message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-primary" />
            Log In for Attendance
          </DialogTitle>
          <DialogDescription>
            Would you like to log in for today's attendance? Your log in time will be recorded now.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Not Now
          </Button>
          <Button onClick={handleLogIn} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Log In
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

