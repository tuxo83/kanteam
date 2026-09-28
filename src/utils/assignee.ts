export function normalizeAssignee(task: { assignee?: string | string[] }): void {
	if (typeof task.assignee === "string") {
		task.assignee = [task.assignee];
	} else if (!Array.isArray(task.assignee)) {
		task.assignee = [];
	}
}

/** Distinct, trimmed assignees across tasks, sorted alphabetically. */
export function collectAvailableAssignees(tasks: { assignee?: string[] }[]): string[] {
	const seen = new Set<string>();
	for (const task of tasks) {
		for (const assignee of task.assignee ?? []) {
			if (assignee.trim()) seen.add(assignee.trim());
		}
	}
	return Array.from(seen).sort((a, b) => a.localeCompare(b));
}
