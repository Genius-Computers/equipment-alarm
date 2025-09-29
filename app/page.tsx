"use client";
import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusCircle, Box, Calendar, AlertCircle, Headphones } from "lucide-react";
import Header from "@/components/Header";
import AddEquipmentForm from "@/components/AddEquipmentForm";
import ServiceRequestDialog from "@/components/ServiceRequestDialog";
import { useEquipment } from "@/hooks/useEquipment";
import Link from "next/link";

const Page = () => {
  const { addEquipment, equipmentNameCache, isCaching } = useEquipment(false);
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string>("");
  const [serviceRequestDialogOpen, setServiceRequestDialogOpen] = useState(false);
  return (
    <main>
      <Header />
      <div className="container mx-auto px-6 py-8">
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
