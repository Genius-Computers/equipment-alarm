"use client";
import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search as SearchIcon, Box, Calendar, AlertCircle, Headphones, PlusCircle, Package, LogIn, LogOut, Loader2 } from "lucide-react";
import Header from "@/components/Header";
import AddEquipmentForm from "@/components/AddEquipmentForm";
import ServiceRequestDialog from "@/components/ServiceRequestDialog";
import { useSelfProfile } from "@/hooks/useSelfProfile";
import { useEquipment } from "@/hooks/useEquipment";
import Link from "next/link";
import EquipmentResultCard from "@/components/EquipmentResultCard";
import { AttendanceDialog } from "@/components/AttendanceDialog";
import { useAttendance } from "@/hooks/useAttendance";
import { toast } from "sonner";

const Page = () => {
  const {
    addEquipment,
    equipmentNameCache,
    isCaching,
    searchTerm,
    setSearchTerm,
    searchResults,
    isSearching,
  } = useEquipment(false);

  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string>("");
  const [localFilter, setLocalFilter] = useState<string>("");
  const [serviceRequestDialogOpen, setServiceRequestDialogOpen] = useState(false);
  const { profile, loading: profileLoading } = useSelfProfile();
  const isEndUser = profile?.role === "end_user";
  
  const isTechnician = profile?.role === "technician";
  const { showPrompt, setShowPrompt, logIn, logOut, isLoggedIn, isLoggedOut, loading: attendanceLoading } = useAttendance(isTechnician);
  
  const handleLogOut = async () => {
    try {
      await logOut();
      toast("Success", { description: "Logged out successfully" });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to log out";
      toast("Error", { description: message });
    }
  };
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
      <AttendanceDialog open={showPrompt} onOpenChange={setShowPrompt} onLogIn={logIn} />
      <div className="container mx-auto px-6 py-8">
        {/* Attendance Log In/Out for Technicians */}
        {isTechnician && !isLoggedOut && (
          <div className="mb-6 flex justify-center">
            <Button
              onClick={isLoggedIn ? handleLogOut : logIn}
              disabled={attendanceLoading}
              size="lg"
              className="gap-2"
              variant={isLoggedIn ? "outline" : "default"}
            >
              {attendanceLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : isLoggedIn ? (
                <>
                  <LogOut className="h-5 w-5" />
                  Log Out
                </>
              ) : (
                <>
                  <LogIn className="h-5 w-5" />
                  Log In
                </>
              )}
            </Button>
          </div>
        )}

        {/* Homepage Search - Hidden for end users */}
        {!isEndUser && (
          <div className="mb-10">
            <div className="relative">
              <SearchIcon className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search equipment by name, tag number, or location"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 rtl:pl-4 rtl:pr-10"
              />
            </div>

            {(searchTerm?.trim()?.length ?? 0) > 0 && (
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {isSearching ? "Searching..." : `${searchResults.length} result${searchResults.length === 1 ? "" : "s"}`}
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
                  <div className="text-center py-10 text-muted-foreground text-sm">No equipment found.</div>
                )}
              </div>
            )}
          </div>
        )}

        <div className={`grid gap-6 ${isEndUser ? 'grid-cols-1 max-w-2xl mx-auto' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
          {(isEndUser ? [
            // End users only see Job Order
            {
              title: "Job Order",
              description: "Submit a new support or service request.",
              icon: <Headphones className="h-6 w-6 cursor-pointer text-orange-500" />,
              cta: (
                <>
                  <Select
                    value={selectedEquipmentId}
                    onValueChange={(value) => {
                      setSelectedEquipmentId(value);
                      setServiceRequestDialogOpen(true);
                    }}
                    disabled={isCaching || equipmentNameCache.length === 0}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={isCaching ? "Loading..." : "Select Equipment"} />
                    </SelectTrigger>
                    <SelectContent>
                      <div className="p-2">
                        <Input
                          value={localFilter}
                          onChange={(e) => setLocalFilter(e.target.value)}
                          placeholder="Type to filter by name or serial number..."
                          className="h-8"
                        />
                      </div>
                      {equipmentNameCache
                        .filter((eq) => {
                          const q = localFilter.trim().toLowerCase();
                          if (!q) return true;
                          const name = eq.name?.toLowerCase() || "";
                          const serial = eq.serialNumber?.toLowerCase() || "";
                          return name.includes(q) || serial.includes(q);
                        })
                        .slice(0, 200)
                        .map((eq) => (
                        <SelectItem key={eq.id} value={eq.id}>
                          {eq.name} {eq.serialNumber ? `(${eq.serialNumber})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedEquipmentId && (
                    <ServiceRequestDialog
                      equipmentId={selectedEquipmentId}
                      equipmentName={equipmentNameCache.find((eq) => eq.id === selectedEquipmentId)?.name}
                      open={serviceRequestDialogOpen}
                      onOpenChange={(isOpen) => {
                        setServiceRequestDialogOpen(isOpen);
                        if (!isOpen) {
                          setSelectedEquipmentId("");
                        }
                      }}
                      onCreated={() => {
                        setServiceRequestDialogOpen(false);
                        setSelectedEquipmentId("");
                      }}
                    />
                  )}
                </>
              ),
            },
          ] : [
            // All other users see all cards
            {
              title: "Add Equipment/Device",
              description: "Register new devices into the system.",
              icon: <PlusCircle className="h-6 w-6 cursor-pointer text-primary" />,
              cta: <AddEquipmentForm onSubmitEquipment={addEquipment} />,
            },
            {
              title: "Inventory",
              description: "View and manage all available equipment.",
              icon: <Box className="h-6 w-6 cursor-pointer text-green-600" />,
              cta: (
                <Link href={"/equipments"} className="w-full">
                  <Button variant="outline" className="w-full">
                    Open
                  </Button>
                </Link>
              ),
            },
            {
              title: "Spare Parts",
              description: "Manage inventory of spare parts.",
              icon: <Package className="h-6 w-6 cursor-pointer text-blue-600" />,
              cta: (
                <Link href={"/spare-parts"} className="w-full">
                  <Button variant="outline" className="w-full">
                    Open
                  </Button>
                </Link>
              ),
            },
            {
              title: "Maintenance Schedule Preview",
              description: "Check upcoming maintenance tasks.",
              icon: <Calendar className="h-6 w-6 cursor-pointer text-purple-600" />,
              cta: (
                <Link href={"/service-requests"} className="w-full">
                  <Button variant="outline" className="w-full">
                    Open
                  </Button>
                </Link>
              ),
            },
            {
              title: "Maintenance Overdue",
              description: "See devices with overdue maintenance.",
              icon: <AlertCircle className="h-6 w-6 cursor-pointer text-red-600" />,
              cta: (
                <Link href={"/equipments?status=overdue"} className="w-full">
                  <Button variant="outline" className="w-full">
                    Open
                  </Button>
                </Link>
              ),
            },
            {
              title: "Job Order",
              description: "Submit a new support or service request.",
              icon: <Headphones className="h-6 w-6 cursor-pointer text-orange-500" />,
              cta: (
                <>
                  <Select
                    value={selectedEquipmentId}
                    onValueChange={(value) => {
                      setSelectedEquipmentId(value);
                      setServiceRequestDialogOpen(true);
                    }}
                    disabled={isCaching || equipmentNameCache.length === 0}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={isCaching ? "Loading..." : "Select Equipment"} />
                    </SelectTrigger>
                    <SelectContent>
                      <div className="p-2">
                        <Input
                          value={localFilter}
                          onChange={(e) => setLocalFilter(e.target.value)}
                          placeholder="Type to filter by name or serial number..."
                          className="h-8"
                        />
                      </div>
                      {equipmentNameCache
                        .filter((eq) => {
                          const q = localFilter.trim().toLowerCase();
                          if (!q) return true;
                          const name = eq.name?.toLowerCase() || "";
                          const serial = eq.serialNumber?.toLowerCase() || "";
                          return name.includes(q) || serial.includes(q);
                        })
                        .slice(0, 200)
                        .map((eq) => (
                        <SelectItem key={eq.id} value={eq.id}>
                          {eq.name} {eq.serialNumber ? `(${eq.serialNumber})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedEquipmentId && (
                    <ServiceRequestDialog
                      equipmentId={selectedEquipmentId}
                      equipmentName={equipmentNameCache.find((eq) => eq.id === selectedEquipmentId)?.name}
                      open={serviceRequestDialogOpen}
                      onOpenChange={(isOpen) => {
                        setServiceRequestDialogOpen(isOpen);
                        if (!isOpen) {
                          setSelectedEquipmentId("");
                        }
                      }}
                      onCreated={() => {
                        setServiceRequestDialogOpen(false);
                        setSelectedEquipmentId("");
                      }}
                    />
                  )}
                </>
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
