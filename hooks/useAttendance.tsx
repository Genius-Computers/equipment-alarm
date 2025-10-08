"use client";

import { useCallback, useEffect, useState } from "react";
import { showAttendancePopup } from "@/lib/types/user";
import { getTodaySaudiDate } from "@/lib/utils";

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

export function useAttendance(canLog: boolean, role?: string) {
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  const loadTodayAttendance = useCallback(async () => {
    if (!canLog) return;
    
    try {
      setLoading(true);
      const res = await fetch("/api/attendance", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load attendance");
      const json = await res.json();
      setTodayAttendance(json.data);
      
      // Check if we should show the prompt (only for roles that get auto-popup)
      const shouldShowPopup = showAttendancePopup(role);
      const today = getTodaySaudiDate();
      const lastPrompted = localStorage.getItem(ATTENDANCE_PROMPT_KEY);
      
      // Show prompt if: should get popup AND no attendance record for today AND haven't prompted today yet
      if (shouldShowPopup && !json.data && lastPrompted !== today) {
        setShowPrompt(true);
        localStorage.setItem(ATTENDANCE_PROMPT_KEY, today);
      }
    } catch (e: unknown) {
      console.error("Failed to load attendance:", e);
    } finally {
      setLoading(false);
    }
  }, [canLog, role]);

  const logIn = useCallback(async () => {
    console.log('[useAttendance] Attempting to log in...');
    const res = await fetch("/api/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "login" }),
    });
    
    console.log('[useAttendance] Response status:', res.status);
    
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      console.error('[useAttendance] Log in failed:', json);
      throw new Error(json.error || "Failed to log in");
    }
    
    const json = await res.json();
    console.log('[useAttendance] Log in successful:', json);
    setTodayAttendance(json.data);
    return json.data;
  }, []);

  const logOut = useCallback(async () => {
    console.log('[useAttendance] Attempting to log out...');
    const res = await fetch("/api/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    });
    
    console.log('[useAttendance] Response status:', res.status);
    
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      console.error('[useAttendance] Log out failed:', json);
      throw new Error(json.error || "Failed to log out");
    }
    
    const json = await res.json();
    console.log('[useAttendance] Log out successful:', json);
    setTodayAttendance(json.data);
    return json.data;
  }, []);

  useEffect(() => {
    if (canLog) {
      loadTodayAttendance();
    }
  }, [canLog, loadTodayAttendance]);

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

