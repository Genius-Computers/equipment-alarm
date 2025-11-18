"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import ServiceRequestCard from "@/components/ServiceRequestCard";
import type { JServiceRequest } from "@/lib/types/service-request";
import { ServiceRequestType } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useLanguage } from "@/hooks/useLanguage";
import { Loader2, Wrench } from "lucide-react";
import { useSelfProfile } from "@/hooks/useSelfProfile";
import { useRouter } from "next/navigation";

export default function PreventiveMaintenanceTicketsPage() {
	const { t } = useLanguage();
	const { profile } = useSelfProfile();
	const role = profile?.role || null;
	const router = useRouter();

	const [loading, setLoading] = useState(true);
	const [requests, setRequests] = useState<JServiceRequest[]>([]);

	const load = async () => {
		try {
			setLoading(true);
			const res = await fetch("/api/service-request?pageSize=100&scope=pending", { cache: "no-store" });
			if (!res.ok) throw new Error("Failed to load service requests");
			const data = await res.json();
			const all: JServiceRequest[] = data.data || [];
			setRequests(all.filter((r) => r.requestType === ServiceRequestType.PREVENTIVE_MAINTENANCE));
		} catch (err) {
			console.error(err);
			toast.error("Failed to load preventive maintenance requests");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		void load();
	}, []);

	return (
		<div className="min-h-screen bg-background">
			<Header />
			<main className="container mx-auto px-4 py-8 space-y-4 max-w-6xl">
				<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
					<div className="flex items-center gap-3">
						<Wrench className="h-8 w-8 text-primary" />
						<div>
							<h1 className="text-2xl font-semibold">Preventive Maintenance Tickets</h1>
							<p className="text-muted-foreground">
								View and work on preventive maintenance service requests
							</p>
						</div>
					</div>
					{role === "admin" || role === "admin_x" || role === "supervisor" ? (
						<Button
							variant="outline"
							onClick={() => router.push("/preventive-maintenance")}
						>
							View overdue equipment
						</Button>
					) : null}
				</div>

				<Card>
					<CardHeader>
						<CardTitle className="text-lg">Pending requests</CardTitle>
					</CardHeader>
					<CardContent>
						{loading ? (
							<div className="flex items-center gap-2 text-muted-foreground">
								<Loader2 className="h-4 w-4 animate-spin" />
								<span>Loading...</span>
							</div>
						) : requests.length === 0 ? (
							<div className="text-muted-foreground">No preventive maintenance requests found.</div>
						) : (
							<div className="grid grid-cols-1 gap-4">
								{requests.map((r) => (
									<ServiceRequestCard
										key={r.id}
										request={r}
										canApprove={role === "admin" || role === "admin_x" || role === "supervisor"}
									/>
								))}
							</div>
						)}
					</CardContent>
				</Card>
			</main>
		</div>
	);
}


