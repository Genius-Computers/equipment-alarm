"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ExpandableTextProps {
	text?: string | null;
	maxChars?: number;
	className?: string;
}

export default function ExpandableText({ text, maxChars = 160, className }: ExpandableTextProps) {
	const [expanded, setExpanded] = useState(false);
	const content = String(text ?? "");
	const isLong = content.length > maxChars;
	const display = useMemo(() => {
		if (!isLong || expanded) return content;
		return content.slice(0, maxChars) + "…";
	}, [content, expanded, isLong, maxChars]);

	if (!content) return null;

	return (
		<div className={cn("whitespace-pre-wrap break-words", className)}>
			{display}
			{isLong ? (
				<Button variant="link" size="sm" className="px-1" onClick={() => setExpanded((v) => !v)}>
					{expanded ? "Read less" : "Read more"}
				</Button>
			) : null}
		</div>
	);
}
