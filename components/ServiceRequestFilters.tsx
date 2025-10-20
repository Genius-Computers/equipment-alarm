"use client";

import { Filter } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ServiceRequestPriority } from "@/lib/types";
import { useLanguage } from "@/hooks/useLanguage";

interface ServiceRequestFiltersProps {
	priority: "all" | ServiceRequestPriority | "overdue";
	onPriorityChange: (value: "all" | ServiceRequestPriority | "overdue") => void;
	showAssignedToggle?: boolean;
	assignedToMe?: boolean;
	onAssignedToMeChange?: (value: boolean) => void;
}

export default function ServiceRequestFilters({
	priority,
	onPriorityChange,
	showAssignedToggle,
	assignedToMe,
	onAssignedToMeChange,
}: ServiceRequestFiltersProps) {
	const { t } = useLanguage();
	return (
		<div className="flex flex-col sm:flex-row gap-4">
			<div className="flex items-center gap-2">
				<Filter className="h-4 w-4 text-muted-foreground" />
				<Select value={priority} onValueChange={(v) => onPriorityChange(v as "all" | ServiceRequestPriority | "overdue")}>
					<SelectTrigger className="w-[160px]">
						<SelectValue placeholder={t("serviceRequest.priority")} />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">{t("filter.all")}</SelectItem>
						<SelectItem value={ServiceRequestPriority.LOW}>{t("serviceRequest.priorities.low")}</SelectItem>
						<SelectItem value={ServiceRequestPriority.MEDIUM}>{t("serviceRequest.priorities.medium")}</SelectItem>
						<SelectItem value={ServiceRequestPriority.HIGH}>{t("serviceRequest.priorities.high")}</SelectItem>
						<SelectItem value="overdue">{t("filter.overdue")}</SelectItem>
					</SelectContent>
				</Select>
				{showAssignedToggle ? (
					<div className="flex items-center gap-2 ml-2">
						<Switch checked={!!assignedToMe} onCheckedChange={(v) => onAssignedToMeChange?.(v)} id="assigned-to-me" />
						<label htmlFor="assigned-to-me" className="text-sm">
							{t("serviceRequest.assignedToMe")}
						</label>
					</div>
				) : null}
			</div>
		</div>
	);
}
