"use client";

import { useCallback, useEffect, useState } from "react";
import type { User } from "@/lib/types/user";

export function useSelfProfile(options: { autoLoad?: boolean } = { autoLoad: true }) {
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(!!options.autoLoad);
  const [saving, setSaving] = useState<boolean>(false);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/users/me", { cache: "no-store" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || "Failed to load profile");
      }
      const j = await res.json();
      setProfile((j?.data as User | null) ?? null);
    } finally {
      setLoading(false);
    }
  }, []);

  const saveProfile = useCallback(
    async (next: Partial<User>) => {
      if (!next) return;
      setSaving(true);
      try {
        const body = {
          displayName: next.displayName,
          phone: next.phone,
          designation: next.designation,
          department: next.department,
        };
        const res = await fetch("/api/users/me", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(j?.error || "Failed to save profile");
        }
        setProfile((j?.data as User | null) ?? null);
        return j?.data as User | null;
      } finally {
        setSaving(false);
      }
    },
    []
  );

  useEffect(() => {
    if (options.autoLoad) {
      loadProfile();
    }
  }, [loadProfile, options.autoLoad]);

  return { profile, setProfile, loading, saving, loadProfile, saveProfile } as const;
}
