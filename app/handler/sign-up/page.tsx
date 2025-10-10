"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Link from "next/link";
import Image from "next/image";
import { useLanguage } from "@/hooks/useLanguage";

export default function SignUpPage() {
  const { t } = useLanguage();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !displayName) {
      toast(t("toast.error"), { description: t("auth.error.nameEmailRequired") });
      return;
    }
    if (!password || !confirmPassword) {
      toast(t("toast.error"), { description: t("auth.error.passwordConfirmRequired") });
      return;
    }
    if (password !== confirmPassword) {
      toast(t("toast.error"), { description: t("auth.error.passwordsNoMatch") });
      return;
    }
    const strong = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
    if (!strong.test(password)) {
      toast(t("toast.error"), { description: t("auth.error.passwordWeak") });
      return;
    }
    try {
      setLoading(true);
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, displayName }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || "Failed to sign up");
      }
      toast(t("toast.success"), { description: t("auth.success.accountCreated") });
      window.location.href = "/handler/sign-in";
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to sign up";
      toast(t("toast.error"), { description: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background to-muted/30">
      <div className="w-full max-w-md space-y-6">
        <div className="flex items-center justify-center gap-3">
          <Image src={'/logo.png'} alt="Logo" width={48} height={48} />
          <div className="text-center">
            <h1 className="text-xl font-semibold leading-tight">{t("auth.brand.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("auth.brand.subtitle")}</p>
          </div>
        </div>
        <Card className="w-full">
          <CardHeader>
            <CardTitle>{t("auth.signup.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium">{t("auth.signup.name")}</label>
                <Input
                  placeholder={t("auth.signup.name.placeholder")}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium">{t("auth.signup.email")}</label>
                <Input
                  type="email"
                  placeholder={t("auth.signup.email.placeholder")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium">{t("auth.signup.password")}</label>
                <Input
                  type="password"
                  placeholder={t("auth.signup.password.placeholder")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">{t("auth.signup.password.helper")}</p>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium">{t("auth.signup.confirm")}</label>
                <Input
                  type="password"
                  placeholder={t("auth.signup.confirm.placeholder")}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading || !email || !displayName || !password || !confirmPassword}>
                {loading ? `${t("toast.success")}` : t("auth.signup.submit")}
              </Button>
            </form>
            <div className="text-sm text-muted-foreground mt-3 text-center">
              {t("auth.signup.haveAccount")} <Link href="/handler/sign-in" className="underline">{t("auth.signup.signIn")}</Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
