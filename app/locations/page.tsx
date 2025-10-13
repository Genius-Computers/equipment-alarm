"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, MapPin } from "lucide-react";

export default function LocationsPage() {
  const router = useRouter();

  const campuses = [
    {
      id: "main-campus",
      name: "Main Campus",
      icon: Building2,
      description: "Primary campus location with main facilities",
    },
    {
      id: "aja-complex",
      name: "AJA Complex",
      icon: MapPin,
      description: "Secondary campus location",
    },
  ];

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            Locations
          </h1>
          <p className="text-muted-foreground">
            Select a campus to manage its locations
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {campuses.map((campus) => {
            const Icon = campus.icon;
            return (
              <Card
                key={campus.id}
                className="cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
                onClick={() => router.push(`/locations/${encodeURIComponent(campus.name)}`)}
              >
                <CardContent className="p-8">
                  <div className="flex flex-col items-center text-center space-y-4">
                    <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                      <Icon className="w-10 h-10 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-semibold mb-2">{campus.name}</h2>
                      <p className="text-muted-foreground text-sm">
                        {campus.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

