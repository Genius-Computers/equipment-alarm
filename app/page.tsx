"use client";
import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search as SearchIcon, Box, Calendar, AlertCircle, ClipboardList, PlusCircle, Package, Loader2, MapPin } from "lucide-react";
import Header from "@/components/Header";
import AddEquipmentForm from "@/components/AddEquipmentForm";
import { useSelfProfile } from "@/hooks/useSelfProfile";
import { useEquipment } from "@/hooks/useEquipment";
import { useLanguage } from "@/hooks/useLanguage";
import Link from "next/link";
import EquipmentResultCard from "@/components/EquipmentResultCard";

const Page = () => {
  const { t } = useLanguage();
  const {
    addEquipment,
    searchTerm,
    setSearchTerm,
    searchResults,
    isSearching,
  } = useEquipment(false);

  const { profile, loading: profileLoading } = useSelfProfile();
  const isEndUser = profile?.role === "end_user";
  // Show loading state while profile is loading to prevent flash
  if (profileLoading) {
    return (
      <main>
        <Header />
        <div className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main>
      <Header />
      <div className="container mx-auto px-6 py-8">
        {/* Homepage Search - Hidden for end users */}
        {!isEndUser && (
          <div className="mb-10">
            <div className="relative">
              <SearchIcon className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder={t("common.searchPlaceholder")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 rtl:pl-4 rtl:pr-10"
              />
            </div>

            {(searchTerm?.trim()?.length ?? 0) > 0 && (
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {isSearching ? t("common.searching") : `${searchResults.length} ${t("common.results", { count: searchResults.length })}`}
                </p>
              </div>
            )}

            {(searchTerm?.trim()?.length ?? 0) > 0 && (
              <div className="mt-6">
                {/* Compressed results UI */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {searchResults.map((e) => (
                    <EquipmentResultCard key={e.id} equipment={e} />
                  ))}
                </div>
                {!isSearching && searchResults.length === 0 && (
                  <div className="text-center py-10 text-muted-foreground text-sm">{t("common.noEquipmentFound")}</div>
                )}
              </div>
            )}
          </div>
        )}

        <div className={`grid gap-6 ${isEndUser ? 'grid-cols-1 max-w-2xl mx-auto' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
          {(isEndUser ? [
            // End users only see Service Requests
            {
              title: t("dashboard.maintenanceSchedule"),
              description: t("dashboard.maintenanceScheduleDesc"),
              icon: <Calendar className="h-6 w-6 cursor-pointer text-purple-600" />,
              cta: (
                <Link href={"/service-requests"} className="w-full">
                  <Button variant="outline" className="w-full">
                    {t("common.open")}
                  </Button>
                </Link>
              ),
            },
          ] : [
            // All other users see all cards
            {
              title: t("dashboard.addEquipment"),
              description: t("dashboard.addEquipmentDesc"),
              icon: <PlusCircle className="h-6 w-6 cursor-pointer text-primary" />,
              cta: <AddEquipmentForm onSubmitEquipment={addEquipment} />,
            },
            {
              title: t("dashboard.inventory"),
              description: t("dashboard.inventoryDesc"),
              icon: <Box className="h-6 w-6 cursor-pointer text-green-600" />,
              cta: (
                <Link href={"/equipments"} className="w-full">
                  <Button variant="outline" className="w-full">
                    {t("common.open")}
                  </Button>
                </Link>
              ),
            },
            {
              title: t("dashboard.spareParts"),
              description: t("dashboard.sparePartsDesc"),
              icon: <Package className="h-6 w-6 cursor-pointer text-blue-600" />,
              cta: (
                <Link href={"/spare-parts"} className="w-full">
                  <Button variant="outline" className="w-full">
                    {t("common.open")}
                  </Button>
                </Link>
              ),
            },
            {
              title: t("dashboard.locations"),
              description: t("dashboard.locationsDesc"),
              icon: <MapPin className="h-6 w-6 cursor-pointer text-indigo-600" />,
              cta: (
                <Link href={"/locations"} className="w-full">
                  <Button variant="outline" className="w-full">
                    {t("common.open")}
                  </Button>
                </Link>
              ),
            },
            {
              title: t("dashboard.maintenanceSchedule"),
              description: t("dashboard.maintenanceScheduleDesc"),
              icon: <Calendar className="h-6 w-6 cursor-pointer text-purple-600" />,
              cta: (
                <Link href={"/service-requests"} className="w-full">
                  <Button variant="outline" className="w-full">
                    {t("common.open")}
                  </Button>
                </Link>
              ),
            },
            {
              title: t("dashboard.maintenanceOverdue"),
              description: t("dashboard.maintenanceOverdueDesc"),
              icon: <AlertCircle className="h-6 w-6 cursor-pointer text-red-600" />,
              cta: (
                <Link href={"/preventive-maintenance"} className="w-full">
                  <Button variant="outline" className="w-full">
                    {t("common.open")}
                  </Button>
                </Link>
              ),
            },
            {
              title: t("dashboard.jobOrders"),
              description: t("dashboard.jobOrdersDesc"),
              icon: <ClipboardList className="h-6 w-6 cursor-pointer text-orange-500" />,
              cta: (
                <Link href={"/job-orders"} className="w-full">
                  <Button variant="outline" className="w-full">
                    {t("common.open")}
                  </Button>
                </Link>
              ),
            },
          ]).map((c) => (
            <Card key={c.title} className="flex flex-col justify-between">
              <CardHeader className="flex items-center gap-4">
                <div className="p-2 rounded-full bg-muted/50">{c.icon}</div>
                <div>
                  <CardTitle>{c.title}</CardTitle>
                  <CardDescription>{c.description}</CardDescription>
                </div>
              </CardHeader>
              <CardFooter>{c?.cta}</CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
};

export default Page;
