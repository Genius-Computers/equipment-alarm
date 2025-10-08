"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useUser } from "@stackframe/stack";
import { toast } from "sonner";
import { Calendar, Printer } from "lucide-react";

type AttendanceRecord = {
  id: string;
  user_id: string;
  date: string;
  log_in_time: string;
  log_out_time: string | null;
  employee_id: string | null;
  display_name: string | null;
};

export default function AttendancePage() {
  const user = useUser();
  const role = user?.clientReadOnlyMetadata?.role as string | undefined;
  const canViewAttendance = role !== "end_user";

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedDate && canViewAttendance) {
      loadAttendance();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, canViewAttendance]);

  const loadAttendance = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/attendance?date=${selectedDate}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load attendance');
      const json = await res.json();
      setRecords(json.data || []);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Error loading attendance';
      toast('Error', { description: message });
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formatTime = (timestamp: string | null) => {
    if (!timestamp) return '-';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  if (!canViewAttendance) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-6 py-8">
          <Card>
            <CardHeader>
              <CardTitle>Attendance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                You do not have permission to view attendance records.
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-6 py-8 space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Attendance
              </CardTitle>
              <Button onClick={handlePrint} variant="outline" size="sm" className="print:hidden">
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 print:hidden">
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="max-w-xs"
              />
              <Button onClick={loadAttendance}>Load</Button>
            </div>

            <div className="print:block hidden mb-4">
              <div className="text-center">
                <h2 className="text-xl font-bold">Attendance Report</h2>
                <p className="text-sm text-muted-foreground">Date: {new Date(selectedDate).toLocaleDateString()}</p>
              </div>
            </div>

            {loading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : records.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-8">
                No attendance records found for {new Date(selectedDate).toLocaleDateString()}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2 font-medium">Name</th>
                      <th className="text-left p-2 font-medium">Employee ID</th>
                      <th className="text-left p-2 font-medium">Log In Time</th>
                      <th className="text-left p-2 font-medium">Log Out Time</th>
                      <th className="text-left p-2 font-medium hidden print:table-cell">Signature</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((record) => (
                      <tr key={record.id} className="border-b">
                        <td className="p-2">{record.display_name || record.user_id}</td>
                        <td className="p-2">{record.employee_id || '-'}</td>
                        <td className="p-2">{formatTime(record.log_in_time)}</td>
                        <td className="p-2">{formatTime(record.log_out_time)}</td>
                        <td className="p-2 hidden print:table-cell">
                          <div className="border-b border-gray-400 h-8"></div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

