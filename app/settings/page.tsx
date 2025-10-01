"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";
import { useSelfProfile } from "@/hooks/useSelfProfile";
import { toast } from "sonner";
import Link from "next/link";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Settings, User as UserIcon, Palette } from "lucide-react";

export default function SettingsPage() {
  const { t, language, setLanguage } = useLanguage();
  const { profile, loading, saving, saveProfile } = useSelfProfile();
  const [form, setForm] = useState({ displayName: "", phone: "", designation: "", department: "" });

  useEffect(() => {
    setForm({
      displayName: profile?.displayName || "",
      phone: profile?.phone || "",
      designation: profile?.designation || "",
      department: profile?.department || "",
    });
  }, [profile]);

  const onSave = async () => {
    try {
      const updated = await saveProfile(form);
      if (updated) {
        toast(t("toast.success"), { description: t("toast.updated") });
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to save";
      toast(t("toast.error"), { description: message });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <Card className="sticky top-6">
              <CardHeader className="flex flex-row items-center gap-2">
                <Settings className="h-5 w-5 text-primary" />
                <CardTitle>{t("settings.title") || "Settings"}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <p>{t("settings.subtitle") || "Manage your account, preferences and appearance."}</p>
                <Separator />
                <div className="flex items-center justify-between">
                  <span>{t("settings.themeQuick") || "Theme"}</span>
                  <ModeToggle />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center gap-2">
                <UserIcon className="h-5 w-5 text-primary" />
                <CardTitle>{t("settings.account") || "Account"}</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="email">{t("settings.email") || "Email"}</Label>
                  <Input id="email" value={profile?.email || ""} disabled />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="displayName">{t("settings.displayName") || "Display name"}</Label>
                  <Input id="displayName" value={form.displayName} onChange={(e) => setForm((s) => ({ ...s, displayName: e.target.value }))} disabled={loading || saving} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="designation">{t("settings.designation") || "Designation"}</Label>
                  <Input id="designation" placeholder={t("settings.designationPlaceholder") || "e.g. Biomedical Engineer"} value={form.designation} onChange={(e) => setForm((s) => ({ ...s, designation: e.target.value }))} disabled={loading || saving} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">{t("settings.department") || "Department"}</Label>
                  <Input id="department" placeholder={t("settings.departmentPlaceholder") || "e.g. Maintenance"} value={form.department} onChange={(e) => setForm((s) => ({ ...s, department: e.target.value }))} disabled={loading || saving} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="phone">{t("settings.phone") || "Phone"}</Label>
                  <Input id="phone" placeholder={t("settings.phonePlaceholder") || "e.g. +966 5XXXXXXXX"} value={form.phone} onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))} disabled={loading || saving} />
                </div>
              </CardContent>
              <CardFooter className="flex flex-col md:flex-row md:justify-between gap-3">
                <Button variant="outline" asChild>
                  <Link href="/handler/forgot-password">{t("settings.resetPassword") || "Reset password"}</Link>
                </Button>
                <Button onClick={onSave} disabled={saving || loading}>
                  {saving ? (t("settings.saving") || "Saving...") : (t("settings.save") || "Save changes")}
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center gap-2">
                <Palette className="h-5 w-5 text-primary" />
                <CardTitle>{t("settings.appearance") || "Appearance"}</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="theme">{t("settings.theme") || "Theme"}</Label>
                  <div className="flex items-center gap-2">
                    <ModeToggle />
                    <span className="text-xs text-muted-foreground">{t("settings.themeHint") || "Choose light, dark or system"}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="language">{t("settings.language") || "Language"}</Label>
                  <Select value={language} onValueChange={(v) => (v === 'ar' || v === 'en') && setLanguage(v)}>
                    <SelectTrigger id="language">
                      <SelectValue placeholder={t("settings.selectLanguage") || "Select language"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="ar">العربية</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
