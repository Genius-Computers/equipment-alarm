"use client";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useUser } from "@stackframe/stack";
import CustomPagination from "@/components/CustomPagination";
import ServiceRequestFilters from "@/components/ServiceRequestFilters";
import ServiceRequestCard from "@/components/ServiceRequestCard";
import { useServiceRequests } from "@/hooks/useServiceRequests";
import { ServiceRequestApprovalStatus, ServiceRequestWorkStatus } from "@/lib/types";

const Page = () => {
	const user = useUser();
	const role = user?.clientReadOnlyMetadata?.role as string | undefined;
	const canApprove = role === "admin" || role === "supervisor";

	const {
		filteredRequests,
		loading,
		page,
		pageSize,
		total,
		setPage,
		searchTerm,
		setSearchTerm,
		priorityFilter,
		setPriorityFilter,
		scope,
		setScope,
		updatingById,
		changeApprovalStatus,
		changeWorkStatus,
		refresh,
	} = useServiceRequests();

	return (
		<div className="min-h-screen bg-background">
			<Header />
			<main className="container mx-auto px-6 py-8 space-y-6">
				<ServiceRequestFilters
					search={searchTerm}
					onSearchChange={setSearchTerm}
					priority={priorityFilter}
					onPriorityChange={setPriorityFilter}
				/>

				<div className="flex items-center gap-2">
					<button
						className={`px-3 py-1 rounded border text-sm ${scope === "pending" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
						onClick={() => setScope("pending")}
					>
						Pending
					</button>
					<button
						className={`px-3 py-1 rounded border text-sm ${scope === "completed" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
						onClick={() => setScope("completed")}
					>
						Completed
					</button>
				</div>

				{loading ? (
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						{[...Array(4)].map((_, i) => (
							<Card key={i}>
								<CardHeader>
									<Skeleton className="h-5 w-40" />
								</CardHeader>
								<CardContent className="space-y-2">
									<Skeleton className="h-4 w-64" />
									<Skeleton className="h-4 w-52" />
								</CardContent>
							</Card>
						))}
					</div>
				) : (
					<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
						{filteredRequests.map((r) => (
							<ServiceRequestCard
								key={r.id}
								request={r}
								canApprove={canApprove}
								isUpdatingApproval={!!updatingById[r.id]?.approval}
								isUpdatingWork={!!updatingById[r.id]?.work}
								onApprove={(id) => changeApprovalStatus(id, ServiceRequestApprovalStatus.APPROVED)}
								onReject={(id) => changeApprovalStatus(id, ServiceRequestApprovalStatus.REJECTED)}
								onComplete={(id) => changeWorkStatus(id, ServiceRequestWorkStatus.COMPLETED)}
								onCancel={(id) => changeWorkStatus(id, ServiceRequestWorkStatus.CANCELLED)}
								onEdited={refresh}
							/>
						))}
					</div>
				)}
				<CustomPagination
					page={page}
					pageSize={pageSize}
					total={total}
					onPrev={() => setPage(Math.max(1, page - 1))}
					onNext={() => {
						const totalPages = Math.max(1, Math.ceil(total / pageSize));
						setPage(Math.min(totalPages, page + 1));
					}}
				/>
			</main>
		</div>
	);
};

export default Page;
