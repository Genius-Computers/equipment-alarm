"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/hooks/useLanguage";
import { toast } from "sonner";
import { useUser } from "@stackframe/stack";

type UserRow = { id: string; email: string | null; displayName?: string | null; role?: string; signedUpAt?: string | null };

const UsersPage = () => {
  const { t } = useLanguage();
  const user = useUser();
  const myRole = (user?.clientReadOnlyMetadata?.role) as string | undefined;
  const isAdmin = myRole === 'admin';

  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [creating, setCreating] = useState(false);
  const [newUser, setNewUser] = useState({ email: "", displayName: "", role: "user" });

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/users", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load users");
        const json = await res.json();
        setRows(json.data || []);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Error loading users";
        toast(t("toast.error"), { description: message });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [t]);

  const createUser = async () => {
    try {
      setCreating(true);
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || 'Failed to create user');
      }
      toast(t("toast.success"), { description: t("toast.created") });
      setNewUser({ email: "", displayName: "", role: "user" });
      const j = await (await fetch('/api/users', { cache: 'no-store' })).json();
      setRows(j.data || []);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to create user';
      toast(t("toast.error"), { description: message });
    } finally {
      setCreating(false);
    }
  };

  const changeRole = async (id: string, role: string) => {
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || 'Failed to update role');
      }
      toast(t("toast.success"), { description: t("toast.updated") });
      setRows((prev) => prev.map((u) => (u.id === id ? { ...u, role } : u)));
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to update role';
      toast(t("toast.error"), { description: message });
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-6 py-8">
          <Card>
            <CardHeader>
              <CardTitle>{t("users.title")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">{t("auth.forbidden")}</div>
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
            <CardTitle>{t("users.title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <Input
                placeholder={t("users.email")}
                value={newUser.email}
                onChange={(e) => setNewUser((s) => ({ ...s, email: e.target.value }))}
              />
              <Input
                placeholder={t("users.displayName")}
                value={newUser.displayName}
                onChange={(e) => setNewUser((s) => ({ ...s, displayName: e.target.value }))}
              />
              <div className="flex gap-2">
                <Select value={newUser.role} onValueChange={(v) => setNewUser((s) => ({ ...s, role: v }))}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("users.role")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="supervisor">Supervisor</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={createUser} disabled={creating || !newUser.email}>
                  {t("users.create")}
                </Button>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              After creating a user without a password, share the password setup link with them:
              <span className="ml-1 underline">/handler/forgot-password</span>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {loading ? (
            [...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-5 w-40" />
                </CardHeader>
                <CardContent className="space-y-2">
                  <Skeleton className="h-4 w-64" />
                  <Skeleton className="h-4 w-52" />
                </CardContent>
              </Card>
            ))
          ) : (
            rows.map((u) => (
              <Card key={u.id} className="hover:shadow-lg transition-shadow duration-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span>{u.displayName || u.email || u.id}</span>
                    <Badge variant="secondary" className="capitalize">{u.role || 'user'}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex items-center gap-3">
                  <div className="text-sm text-muted-foreground flex-1">
                    {u.email}
                  </div>
                  <Select value={u.role || 'user'} onValueChange={(v) => changeRole(u.id, v)}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder={t("users.role")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="supervisor">Supervisor</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  );
};

export default UsersPage;
