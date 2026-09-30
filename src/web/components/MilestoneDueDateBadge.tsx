import React from "react";

// Parse as UTC so the displayed day never shifts with the viewer's timezone.
const formatDueDate = (value: string): string => {
	const date = new Date(`${value}T00:00:00Z`);
	if (Number.isNaN(date.getTime())) return value;
	return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
};

interface MilestoneDueDateBadgeProps {
	dueDate: string;
	/** A completed milestone is never shown as overdue. */
	isCompleted: boolean;
}

const MilestoneDueDateBadge: React.FC<MilestoneDueDateBadgeProps> = ({ dueDate, isCompleted }) => {
	const isOverdue = !isCompleted && dueDate < new Date().toLocaleDateString("en-CA");
	return (
		<span
			title={isOverdue ? "Overdue" : "Due date"}
			className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
				isOverdue
					? "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300"
					: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
			}`}
		>
			<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth={2}
					d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
				/>
			</svg>
			{formatDueDate(dueDate)}
		</span>
	);
};

export default MilestoneDueDateBadge;
