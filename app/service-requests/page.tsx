"use client";
import Header from "@/components/Header";
import { useUser } from "@stackframe/stack";
import CustomPagination from "@/components/CustomPagination";
import ServiceRequestFilters from "@/components/ServiceRequestFilters";
import ServiceRequestCard from "@/components/ServiceRequestCard";
import ServiceRequestStats from "@/components/ServiceRequestStats";
import { useServiceRequests } from "@/hooks/useServiceRequests";
import { ServiceRequestApprovalStatus, ServiceRequestWorkStatus } from "@/lib/types";
import { Bell } from "lucide-react";

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
		setPageSize,
		priorityFilter,
		setPriorityFilter,
		assignedToMe,
		setAssignedToMe,
		scope,
		setScope,
		updatingById,
		refreshKey,
		changeApprovalStatus,
		changeWorkStatus,
		refresh,
	} = useServiceRequests();

	// Count requests awaiting approval (for supervisors only)
	const pendingApprovalCount = canApprove 
		? filteredRequests.filter(r => r.approvalStatus === ServiceRequestApprovalStatus.PENDING).length 
		: 0;

	return (
		<div className="min-h-screen bg-background">
			<Header />
			<main className="container mx-auto px-6 py-8 space-y-6">
				<div className="flex items-center justify-between gap-4">
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

					{canApprove && pendingApprovalCount > 0 && scope === "pending" && (
						<div className="flex items-center gap-2 bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 px-4 py-2 rounded-lg border-2 border-amber-300 dark:border-amber-700 animate-pulse">
							<Bell className="h-5 w-5" />
							<span className="font-semibold">
								{pendingApprovalCount} {pendingApprovalCount === 1 ? 'request' : 'requests'} awaiting approval
							</span>
						</div>
					)}
				</div>

				{role === "technician" && (
					<div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200 p-3 rounded-md text-sm">
						<strong>Note:</strong> You are viewing only approved service requests. Unapproved requests are pending supervisor approval.
					</div>
				)}

				<ServiceRequestStats scope={scope} refreshTrigger={refreshKey} />

				<ServiceRequestFilters
					priority={priorityFilter}
					onPriorityChange={setPriorityFilter}
					showAssignedToggle={role === "technician" || role === "end_user"}
					assignedToMe={assignedToMe}
					onAssignedToMeChange={setAssignedToMe}
				/>

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
					onPageChange={(newPage) => setPage(newPage)}
					onPageSizeChange={(newPageSize) => {
						setPageSize(newPageSize);
						setPage(1);
					}}
				/>
			</main>
		</div>
	);
};

export default Page;
