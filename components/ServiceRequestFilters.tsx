"use client";

import { Filter, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ServiceRequestPriority } from "@/lib/types";
import { useLanguage } from "@/hooks/useLanguage";

interface ServiceRequestFiltersProps {
	search: string;
	onSearchChange: (value: string) => void;
	priority: "all" | ServiceRequestPriority;
	onPriorityChange: (value: "all" | ServiceRequestPriority) => void;
}

export default function ServiceRequestFilters({
	search,
	onSearchChange,
	priority,
	onPriorityChange,
}: ServiceRequestFiltersProps) {
	const { t } = useLanguage();
	return (
		<div className="flex flex-col sm:flex-row gap-4">
			<div className="relative flex-1">
				<Search className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
				<Input
					value={search}
					onChange={(e) => onSearchChange(e.target.value)}
					placeholder={t("search.placeholder")}
					className="pl-10 rtl:pl-4 rtl:pr-10"
				/>
			</div>
			<div className="flex items-center gap-2">
				<Filter className="h-4 w-4 text-muted-foreground" />
				<Select value={priority} onValueChange={(v) => onPriorityChange(v as "all" | ServiceRequestPriority)}>
					<SelectTrigger className="w-[160px]">
						<SelectValue placeholder={t("serviceRequest.priority")} />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">{t("filter.all")}</SelectItem>
						<SelectItem value={ServiceRequestPriority.LOW}>{t("serviceRequest.priorities.low")}</SelectItem>
						<SelectItem value={ServiceRequestPriority.MEDIUM}>{t("serviceRequest.priorities.medium")}</SelectItem>
						<SelectItem value={ServiceRequestPriority.HIGH}>{t("serviceRequest.priorities.high")}</SelectItem>
					</SelectContent>
				</Select>
			</div>
		</div>
	);
}
