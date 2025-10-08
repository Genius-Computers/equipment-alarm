"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/hooks/useLanguage";
import { toast } from "sonner";
import { useUser } from "@stackframe/stack";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type UserRow = { id: string; email: string | null; displayName?: string | null; role?: string; signedUpAt?: string | null };

const UsersPage = () => {
  const { t } = useLanguage();
  const user = useUser();
  const myRole = (user?.clientReadOnlyMetadata?.role) as string | undefined;
  const canManage = myRole === 'admin' || myRole === 'supervisor';

  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [creating, setCreating] = useState(false);
  const [newUser, setNewUser] = useState({ email: "", displayName: "", role: "" });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<{ id: string; name: string } | null>(null);

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
      setNewUser({ email: "", displayName: "", role: "technician" });
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
      setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async () => {
    if (!userToDelete) return;
    
    try {
      setLoading(true);
      const res = await fetch(`/api/users/${userToDelete.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || 'Failed to delete');
      }
      toast(t("toast.success"), { description: t("toast.updated") });
      setRows((prev) => prev.filter((u) => u.id !== userToDelete.id));
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to delete';
      toast(t("toast.error"), { description: message });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (id: string, name: string) => {
    setUserToDelete({ id, name });
    setDeleteDialogOpen(true);
  };

  if (!canManage) {
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
                <Select value={newUser.role || undefined} onValueChange={(v) => setNewUser((s) => ({ ...s, role: v }))}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("users.role")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="end_user">End User</SelectItem>
                    <SelectItem value="technician">Technician</SelectItem>
                    <SelectItem value="supervisor">Supervisor</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="admin_x">Admin X</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={createUser} disabled={creating || !newUser.email || !newUser.role}>
                  {t("users.create")}
                </Button>
              </div>
            </div>
          <div className="text-xs text-muted-foreground">
            {t("users.passwordSetupNote")}
            {" "}
            <a
              href="/handler/forgot-password"
              className="ml-1 underline"
              target="_blank"
              rel="noreferrer"
            >
              /handler/forgot-password
            </a>
            <Button
              variant="outline"
              size="sm"
              className="ml-2 h-6 px-2"
              onClick={() => {
                const path = "/handler/forgot-password";
                const link = typeof window !== "undefined" ? `${window.location.origin}${path}` : path;
                navigator.clipboard.writeText(link).then(
                  () => toast(t("toast.success"), { description: t("users.copied") }),
                  () => toast(t("toast.error"), { description: t("users.copyError") })
                );
              }}
            >
              {t("users.copyLink")}
            </Button>
          </div>
          </CardContent>
        </Card>

        {/* Pending approvals: users without any role assigned */}
        {!loading && rows.filter((u) => !u.role).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Pending approvals</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {rows.filter((u) => !u.role).map((u) => (
                <div key={u.id} className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 border rounded-md p-3">
                  <div className="sm:flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{u.displayName || u.email || u.id}</div>
                    <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                  </div>
                  <Badge variant="secondary" className="capitalize">Pending</Badge>
                  <Select value={undefined} onValueChange={(v) => changeRole(u.id, v)}>
                    <SelectTrigger className="w-full sm:w-[160px]">
                      <SelectValue placeholder={t("users.role")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="end_user">End User</SelectItem>
                      <SelectItem value="technician">Technician</SelectItem>
                      <SelectItem value="supervisor">Supervisor</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="admin_x">Admin X</SelectItem>
                    </SelectContent>
                  </Select>
                  <Separator orientation="vertical" className="h-6 hidden sm:flex" />
                  <Button variant="outline" size="sm" className="w-full sm:w-auto" onClick={() => handleDeleteClick(u.id, u.displayName || u.email || u.id)}>Delete</Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

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
            rows.filter((u) => !!u.role).map((u) => (
              <Card key={u.id} className="hover:shadow-lg transition-shadow duration-200 overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 flex-wrap">
                    <span className="flex-1 min-w-0 truncate">{u.displayName || u.email || u.id}</span>
                    <Badge variant="secondary" className="capitalize">{u.role}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                  <div className="text-sm text-muted-foreground sm:flex-1 min-w-0">
                    <span className="block truncate">{u.email}</span>
                  </div>
                  <Select value={u.role!} onValueChange={(v) => changeRole(u.id, v)}>
                    <SelectTrigger className="w-full sm:w-[160px]">
                      <SelectValue placeholder={t("users.role")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="end_user">End User</SelectItem>
                      <SelectItem value="technician">Technician</SelectItem>
                      <SelectItem value="supervisor">Supervisor</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="admin_x">Admin X</SelectItem>
                    </SelectContent>
                  </Select>
                  <Separator orientation="vertical" className="h-6 hidden sm:flex" />
                  <Button variant="destructive" size="sm" className="w-full sm:w-auto" onClick={() => handleDeleteClick(u.id, u.displayName || u.email || u.id)}>Delete</Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the user <strong>{userToDelete?.name}</strong>. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setUserToDelete(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={deleteUser} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
};

export default UsersPage;
