import type { Metadata } from "next";
import { StackProvider, StackTheme } from "@stackframe/stack";
import { stackServerApp } from "../stack";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { LanguageProvider } from "@/hooks/useLanguage";
import { ThemeProvider } from "@/components/theme-provider";
import ApprovalGate from "@/components/ApprovalGate";
import { Suspense } from "react";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import AppSidebar from "@/components/AppSidebar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "University of Ha'il • Equipment Maintenance",
  description: "Track maintenance schedules, spare parts approvals, and completion notes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <StackProvider app={stackServerApp}>
          <StackTheme>
            <ThemeProvider attribute="class" defaultTheme="system" enableSystem storageKey="hail-equip-theme">
              <LanguageProvider>
                <Suspense fallback={null}>
                  <SidebarProvider>
                    <AppSidebar />
                    <SidebarInset>
                      <div className="flex items-center gap-2 p-2 border-b print:hidden">
                        <SidebarTrigger />
                      </div>
                      <ApprovalGate>{children}</ApprovalGate>
                    </SidebarInset>
                  </SidebarProvider>
                </Suspense>
                <Toaster />
              </LanguageProvider>
            </ThemeProvider>
          </StackTheme>
        </StackProvider>
      </body>
    </html>
  );
}
