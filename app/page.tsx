"use client";
import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search as SearchIcon } from "lucide-react";
import { PlusCircle, Box, Calendar, AlertCircle, Headphones } from "lucide-react";
import Header from "@/components/Header";
import AddEquipmentForm from "@/components/AddEquipmentForm";
import ServiceRequestDialog from "@/components/ServiceRequestDialog";
import { useEquipment } from "@/hooks/useEquipment";
import Link from "next/link";

const Page = () => {
  const {
    addEquipment,
    equipmentNameCache,
    isCaching,
    searchTerm,
    setSearchTerm,
    searchResults,
  } = useEquipment(false);

  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string>("");
  const [serviceRequestDialogOpen, setServiceRequestDialogOpen] = useState(false);
  return (
    <main>
      <Header />
      <div className="container mx-auto px-6 py-8">
        {/* Homepage Search */}
        <div className="mb-10">
          <div className="relative">
            <SearchIcon className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search equipment by name, part number, or location"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 rtl:pl-4 rtl:pr-10"
            />
          </div>

          {(searchTerm?.trim()?.length ?? 0) > 0 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {isCaching ? "Loading cache..." : `${searchResults.length} result${searchResults.length === 1 ? "" : "s"}`}
              </p>
            </div>
          )}

          {(searchTerm?.trim()?.length ?? 0) > 0 && (
            <div className="mt-6">
              {/* Compressed results UI */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {searchResults.map((e) => (
                  <Link key={e.id} href={`/equipments/${e.id}`} className="rounded-lg border p-4 hover:bg-muted/40 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{e.name}</div>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {[e.partNumber, e.model, e.manufacturer].filter(Boolean).join(" • ")}
                    </div>
                    {e.location ? <div className="text-xs mt-1">{e.location}</div> : null}
                    {e.serialNumber ? <div className="text-xs text-muted-foreground mt-1">SN: {e.serialNumber}</div> : null}
                  </Link>
                ))}
              </div>
              {!isCaching && searchResults.length === 0 && (
                <div className="text-center py-10 text-muted-foreground text-sm">No equipment found.</div>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
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
              title: "Raise a Service Request",
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
                      {equipmentNameCache.map((eq) => (
                        <SelectItem key={eq.id} value={eq.id}>
                          {eq.name}
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
          ].map((c) => (
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
