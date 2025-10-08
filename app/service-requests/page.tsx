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
	const canEdit = role !== "end_user"; // End users can only view

	const {
		filteredRequests,
		loading,
		page,
		pageSize,
		total,
		setPage,
		priorityFilter,
		setPriorityFilter,
		assignedToMe,
		setAssignedToMe,
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
					priority={priorityFilter}
					onPriorityChange={setPriorityFilter}
					showAssignedToggle={role === "technician" || role === "end_user"}
					assignedToMe={assignedToMe}
					onAssignedToMeChange={setAssignedToMe}
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
					<div className="text-sm text-muted-foreground">Updating…</div>
				) : null}
				<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
					{filteredRequests.map((r) => (
						<ServiceRequestCard
							key={r.id}
							request={r}
							canApprove={canApprove}
							canEdit={canEdit}
							isUpdatingApproval={!!updatingById[r.id]?.approval}
							isUpdatingWork={!!updatingById[r.id]?.work}
							onApprove={(id, note) => changeApprovalStatus(id, ServiceRequestApprovalStatus.APPROVED, note)}
							onReject={(id, note) => changeApprovalStatus(id, ServiceRequestApprovalStatus.REJECTED, note)}
							onComplete={(id) => changeWorkStatus(id, ServiceRequestWorkStatus.COMPLETED)}
							onCancel={(id) => changeWorkStatus(id, ServiceRequestWorkStatus.CANCELLED)}
							onEdited={refresh}
						/>
					))}
				</div>
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
