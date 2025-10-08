"use client";

import { useCallback, useEffect, useState } from "react";

type AttendanceRecord = {
  id: string;
  user_id: string;
  date: string;
  log_in_time: string;
  log_out_time: string | null;
  employee_id: string | null;
  display_name: string | null;
};

const ATTENDANCE_PROMPT_KEY = "attendance_prompted_date";

export function useAttendance(isTechnician: boolean) {
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  const loadTodayAttendance = useCallback(async () => {
    if (!isTechnician) return;
    
    try {
      setLoading(true);
      const res = await fetch("/api/attendance", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load attendance");
      const json = await res.json();
      setTodayAttendance(json.data);
      
      // Check if we should show the prompt
      const today = new Date().toISOString().split('T')[0];
      const lastPrompted = localStorage.getItem(ATTENDANCE_PROMPT_KEY);
      
      // Show prompt if: no attendance record for today AND haven't prompted today yet
      if (!json.data && lastPrompted !== today) {
        setShowPrompt(true);
        localStorage.setItem(ATTENDANCE_PROMPT_KEY, today);
      }
    } catch (e: unknown) {
      console.error("Failed to load attendance:", e);
    } finally {
      setLoading(false);
    }
  }, [isTechnician]);

  const logIn = useCallback(async () => {
    const res = await fetch("/api/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "login" }),
    });
    
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error(json.error || "Failed to log in");
    }
    
    const json = await res.json();
    setTodayAttendance(json.data);
    return json.data;
  }, []);

  const logOut = useCallback(async () => {
    const res = await fetch("/api/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    });
    
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error(json.error || "Failed to log out");
    }
    
    const json = await res.json();
    setTodayAttendance(json.data);
    return json.data;
  }, []);

  useEffect(() => {
    if (isTechnician) {
      loadTodayAttendance();
    }
  }, [isTechnician, loadTodayAttendance]);

  const isLoggedIn = todayAttendance && todayAttendance.log_in_time;
  const isLoggedOut = todayAttendance && todayAttendance.log_out_time;

  return {
    todayAttendance,
    loading,
    showPrompt,
    setShowPrompt,
    logIn,
    logOut,
    isLoggedIn,
    isLoggedOut,
    refresh: loadTodayAttendance,
  };
}

