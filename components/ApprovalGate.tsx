"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useUser } from "@stackframe/stack";
import Header from "@/components/Header";
import { useLanguage } from "@/hooks/useLanguage";

export default function ApprovalGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { t } = useLanguage();
  const user = useUser();
  const role = (user?.clientReadOnlyMetadata?.role) as string | undefined;

  const isHandlerRoute = pathname?.startsWith("/handler/");
  if (isHandlerRoute) return children;

  if (user && !role) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-6 py-8">
          <div className="max-w-2xl mx-auto text-center space-y-3">
            <h1 className="text-2xl font-semibold">{t("auth.pendingApprovalTitle")}</h1>
            <p className="text-sm text-muted-foreground">{t("auth.pendingApprovalDesc")}</p>
          </div>
        </main>
      </div>
    );
  }

  return children;
}


