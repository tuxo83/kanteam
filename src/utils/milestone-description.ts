import type { Milestone } from "../types/index.ts";

/** The description to show, or "" when it is only the "Milestone: <title>" placeholder written at creation. */
export function getMilestoneDescription(milestone: Pick<Milestone, "title" | "description">): string {
	const description = (milestone.description ?? "").trim();
	return description === `Milestone: ${milestone.title}` ? "" : description;
}
