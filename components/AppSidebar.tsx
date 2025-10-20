"use client";

import Link from "next/link";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Home, Box, Calendar, Settings as SettingsIcon, Users, Package, ClipboardCheck, MapPin, ClipboardList, FileText } from "lucide-react";
import { usePathname } from "next/navigation";
import { useUser } from "@stackframe/stack";
import { useLanguage } from "@/hooks/useLanguage";
import { canManageUsers } from "@/lib/types/user";

export default function AppSidebar() {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || (href !== "/" && pathname?.startsWith(href));
  const user = useUser();
  const role = user?.clientReadOnlyMetadata?.role as string | undefined;
  const { isRTL, t } = useLanguage();

  return pathname.startsWith("/handler/") ? null : (
    <Sidebar collapsible="icon" side={isRTL ? "right" : "left"}>
      <SidebarHeader className="px-3 py-2"></SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t("sidebar.menu")}</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={isActive("/")}>
                <Link href="/">
                  <Home />
                  <span>{t("sidebar.home")}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            {role !== "end_user" && (
              <>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/equipments")}>
                    <Link href="/equipments">
                      <Box />
                      <span>{t("sidebar.inventory")}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/spare-parts")}>
                    <Link href="/spare-parts">
                      <Package />
                      <span>{t("spareParts.title")}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/locations")}>
                    <Link href="/locations">
                      <MapPin />
                      <span>{t("sidebar.locations")}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/job-orders")}>
                    <Link href="/job-orders">
                      <ClipboardList />
                      <span>{t("sidebar.jobOrders")}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/service-requests")}>
                    <Link href="/service-requests">
                      <Calendar />
                      <span>{t("sidebar.serviceRequests")}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </>
            )}
            <SidebarSeparator />
            {role !== "end_user" && (
              <>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/attendance")}>
                    <Link href="/attendance">
                      <ClipboardCheck />
                      <span>{t("attendance.title")}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/reports")}>
                    <Link href="/reports/monthly">
                      <FileText />
                      <span>{t("reports.title")}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </>
            )}
            {canManageUsers(role) && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/users")}>
                  <Link href="/users">
                    <Users />
                    <span>{t("sidebar.manageUsers")}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={isActive("/settings")}>
                <Link href="/settings">
                  <SettingsIcon />
                  <span>{t("sidebar.accountSettings")}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
