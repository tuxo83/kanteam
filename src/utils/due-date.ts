const DUE_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/** True when the value is a real calendar date in YYYY-MM-DD form (rejects 2026-02-30). */
export function isValidDueDate(value: string): boolean {
	const match = value.match(DUE_DATE_PATTERN);
	if (!match) return false;
	const [, year, month, day] = match.map(Number) as [number, number, number, number];
	const date = new Date(Date.UTC(year, month - 1, day));
	return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}
