"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useUser } from "@stackframe/stack";
import { toast } from "sonner";
import { Calendar, Printer, LogIn, LogOut, Clock } from "lucide-react";
import { formatSaudiDate, formatSaudiTime, getTodaySaudiDate } from "@/lib/utils";
import { useAttendance } from "@/hooks/useAttendance";
import { canLogAttendance } from "@/lib/types/user";
import { AttendanceDialog } from "@/components/AttendanceDialog";

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
  const canLog = canLogAttendance(role);
  
  const {
    todayAttendance,
    loading: attendanceLoading,
    showPrompt,
    setShowPrompt,
    logIn,
    logOut,
    isLoggedIn,
    isLoggedOut,
  } = useAttendance(canLog, role);

  const [selectedDate, setSelectedDate] = useState(getTodaySaudiDate());
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
    <div className="min-h-screen bg-background print:bg-white print:min-h-0">
      <style jsx global>{`
        @media print {
          @page { 
            size: A4 portrait; 
            margin: 15mm;
          }
          body { 
            -webkit-print-color-adjust: exact; 
            print-color-adjust: exact;
            font-family: Arial, sans-serif;
            background: white !important;
          }
          header, nav, .print\\:hidden { 
            display: none !important; 
          }
          .print\\:block { 
            display: block !important; 
          }
          .print\\:table-cell { 
            display: table-cell !important; 
          }
          main, .container {
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
          }
        }
      `}</style>
      <div className="print:hidden">
        <Header />
      </div>
      <main className="container mx-auto px-6 py-8 space-y-6 print:p-0 print:m-0">
        {/* Personal Attendance Controls - Screen only */}
        {canLog && (
          <div className="print:hidden mb-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  My Attendance Today
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-center gap-4">
                  <Button
                    onClick={async () => {
                      try {
                        await logIn();
                        toast("Success", { description: "Logged in successfully" });
                        loadAttendance(); // Refresh the records
                      } catch (e: unknown) {
                        const message = e instanceof Error ? e.message : "Failed to log in";
                        toast("Error", { description: message });
                      }
                    }}
                    disabled={!!isLoggedIn || attendanceLoading}
                    className="gap-2"
                    variant={isLoggedIn ? "outline" : "default"}
                  >
                    <LogIn className="h-4 w-4" />
                    {isLoggedIn ? (
                      <>IN: {formatSaudiTime(todayAttendance?.log_in_time)}</>
                    ) : (
                      "Time In"
                    )}
                  </Button>
                  
                  <Button
                    onClick={async () => {
                      try {
                        await logOut();
                        toast("Success", { description: "Logged out successfully" });
                        loadAttendance(); // Refresh the records
                      } catch (e: unknown) {
                        const message = e instanceof Error ? e.message : "Failed to log out";
                        toast("Error", { description: message });
                      }
                    }}
                    disabled={!isLoggedIn || !!isLoggedOut || attendanceLoading}
                    className="gap-2"
                    variant={isLoggedOut ? "outline" : "default"}
                  >
                    <LogOut className="h-4 w-4" />
                    {isLoggedOut ? (
                      <>OUT: {formatSaudiTime(todayAttendance?.log_out_time)}</>
                    ) : (
                      "Time Out"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Attendance Dialog */}
        <AttendanceDialog
          open={showPrompt}
          onOpenChange={setShowPrompt}
          onLogIn={logIn}
        />

        {/* Screen-only controls */}
        <div className="print:hidden mb-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Attendance Records
                </CardTitle>
                <Button onClick={handlePrint} variant="outline" size="sm">
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="max-w-xs"
                />
                <Button onClick={loadAttendance}>Load</Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">

            {/* Print-only formal header */}
            <div className="print:block hidden mb-3">
              {/* Header with logo in center - inside rectangle */}
              <div className="border border-gray-300 p-3 bg-white mb-3">
                <div className="flex items-center justify-between mb-2">
                  {/* Left side - English */}
                  <div className="text-left flex-1">
                    <div className="text-base font-semibold">Kingdom of Saudi Arabia</div>
                    <div className="text-base font-semibold">Ministry of Education</div>
                    <div className="text-base font-semibold">University of Hail</div>
                  </div>
                  
                  {/* Center - University Logo */}
                  <div className="flex-shrink-0 mx-8 flex items-center">
                    <img 
                      src={`/universty-logo.png?t=${Date.now()}`} 
                      alt="University of Hail Logo" 
                      className="w-24 h-28 object-contain"
                    />
                  </div>
                  
                  {/* Right side - Arabic */}
                  <div className="text-right flex-1">
                    <div className="text-base font-semibold">المملكة العربية السعودية</div>
                    <div className="text-base font-semibold">وزارة التعليم</div>
                    <div className="text-base font-semibold">جامعة حائل</div>
                    <div className="text-base font-semibold">الإدارة العامة للتجهيزات التعليمية والمعامل</div>
                  </div>
                </div>

                {/* Arabic department title - inside rectangle */}
                <div className="text-center">
                  <div className="text-base font-bold">إدارة صيانة الأجهزة الطبية والعلمية</div>
                </div>
              </div>

              {/* Title and date - outside rectangle */}
              <div className="text-center mb-3">
                <div className="text-lg font-bold bg-gray-100 py-2 px-4 border border-gray-300 inline-block">Daily Attendance - Medical Maintenance</div>
                <div className="text-sm mt-2 font-medium">
                  {selectedDate}
                </div>
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
                No attendance records found for {formatSaudiDate(selectedDate)}
              </div>
            ) : (
              <>
                {/* Screen view - simple table */}
                <div className="overflow-x-auto print:hidden">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2 font-medium">Name</th>
                        <th className="text-left p-2 font-medium">Emp. ID</th>
                        <th className="text-left p-2 font-medium">IN Time</th>
                        <th className="text-left p-2 font-medium">OUT Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {records.map((record) => (
                        <tr key={record.id} className="border-b">
                          <td className="p-2">{record.display_name || record.user_id}</td>
                          <td className="p-2">{record.employee_id || '-'}</td>
                          <td className="p-2">{formatSaudiTime(record.log_in_time)}</td>
                          <td className="p-2">{formatSaudiTime(record.log_out_time)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Print view - formal table */}
                <div className="overflow-x-auto hidden print:block">
                  <table className="w-full border-collapse border-2 border-gray-800">
                    <thead>
                      <tr>
                        <th className="border border-gray-800 text-left p-1 font-bold text-sm" rowSpan={2}>Name</th>
                        <th className="border border-gray-800 text-center p-1 font-bold text-sm" rowSpan={2}>Emp. ID</th>
                        <th className="border border-gray-800 text-center p-1 font-bold text-sm" colSpan={2}>IN</th>
                        <th className="border border-gray-800 text-center p-1 font-bold text-sm" colSpan={2}>OUT</th>
                      </tr>
                      <tr>
                        <th className="border border-gray-800 text-center p-1 font-bold text-sm">Time</th>
                        <th className="border border-gray-800 text-center p-1 font-bold text-sm">Sign</th>
                        <th className="border border-gray-800 text-center p-1 font-bold text-sm">Time</th>
                        <th className="border border-gray-800 text-center p-1 font-bold text-sm">Sign</th>
                      </tr>
                    </thead>
                    <tbody>
                      {records.map((record) => (
                        <tr key={record.id}>
                          <td className="border border-gray-800 text-left p-1 text-sm">{record.display_name || record.user_id}</td>
                          <td className="border border-gray-800 text-center p-1 text-sm">{record.employee_id || '-'}</td>
                          <td className="border border-gray-800 text-center p-1 text-sm">{formatSaudiTime(record.log_in_time)}</td>
                          <td className="border border-gray-800 text-center p-1">
                            <div className="border-b border-gray-400 h-4"></div>
                          </td>
                          <td className="border border-gray-800 text-center p-1 text-sm">{formatSaudiTime(record.log_out_time)}</td>
                          <td className="border border-gray-800 text-center p-1">
                            <div className="border-b border-gray-400 h-4"></div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* Print-only footer */}
            <div className="print:block hidden mt-8 border border-gray-300 p-4 bg-white">
              <div className="text-center space-y-2">
                <div className="text-sm font-medium">المدير العام للإدارة العامة للتجهيزات التعليمية والمعامل</div>
                <div className="text-sm font-medium">خالد بن عبد الرحمن المطير</div>
              </div>
            </div>
        </div>
      </main>
    </div>
  );
}

