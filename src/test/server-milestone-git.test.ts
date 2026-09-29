import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { join } from "node:path";
import { $ } from "bun";
import { FileSystem } from "../file-system/operations.ts";
import { BacklogServer } from "../server/index.ts";
import { createUniqueTestDir, retry, safeCleanup } from "./test-utils.ts";

let TEST_DIR: string;
let server: BacklogServer | null = null;
let filesystem: FileSystem;
let serverPort = 0;

const gitStatus = async () => (await $`git status --porcelain`.cwd(TEST_DIR).text()).trim();
const lastCommitMessage = async () => (await $`git log -1 --format=%s`.cwd(TEST_DIR).text()).trim();

const api = (path: string, init?: RequestInit) =>
	fetch(`http://127.0.0.1:${serverPort}${path}`, {
		headers: { "Content-Type": "application/json" },
		...init,
	});

describe("BacklogServer milestone git commits", () => {
	beforeEach(async () => {
		TEST_DIR = createUniqueTestDir("server-milestone-git");
		filesystem = new FileSystem(TEST_DIR);
		await filesystem.ensureBacklogStructure();
		await filesystem.saveConfig({
			projectName: "Server Milestone Git",
			statuses: ["To Do", "In Progress", "Done"],
			labels: [],
			milestones: [],
			dateFormat: "YYYY-MM-DD",
			remoteOperations: false,
			autoCommit: true,
		});

		await $`git init -b main`.cwd(TEST_DIR).quiet();
		await $`git config user.name "Test User"`.cwd(TEST_DIR).quiet();
		await $`git config user.email test@example.com`.cwd(TEST_DIR).quiet();
		await $`git add .`.cwd(TEST_DIR).quiet();
		await $`git commit -m baseline`.cwd(TEST_DIR).quiet();

		server = new BacklogServer(TEST_DIR);
		await server.start(0, false);
		serverPort = server.getPort() ?? 0;
		expect(serverPort).toBeGreaterThan(0);
		await retry(
			async () => {
				const res = await fetch(`http://127.0.0.1:${serverPort}/api/milestones`);
				if (!res.ok) throw new Error("server not ready");
			},
			10,
			50,
		);
	});

	afterEach(async () => {
		if (server) {
			await server.stop();
			server = null;
		}
		await safeCleanup(TEST_DIR);
	});

	it("commits a milestone created from the web API", async () => {
		const res = await fetch(`http://127.0.0.1:${serverPort}/api/milestones`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ title: "Release 1.0" }),
		});
		expect(res.status).toBe(201);
		const created = (await res.json()) as { id: string };

		expect(await gitStatus()).toBe("");
		expect(await lastCommitMessage()).toBe(`backlog: Add milestone ${created.id}`);
	});

	it("removes a milestone whose file was never committed", async () => {
		await Bun.write(
			join(filesystem.milestonesDir, "m-0 - untracked.md"),
			'---\nid: m-0\ntitle: "Untracked"\n---\n\n## Description\n\nMilestone: Untracked\n',
		);

		const res = await fetch(`http://127.0.0.1:${serverPort}/api/milestones/m-0`, {
			method: "DELETE",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ taskHandling: "clear" }),
		});
		expect(res.status).toBe(200);

		expect(await gitStatus()).toBe("");
		expect(await lastCommitMessage()).toBe("backlog: Remove milestone m-0");
		const milestones = await filesystem.listMilestones();
		expect(milestones.map((milestone) => milestone.id)).not.toContain("m-0");
	});

	it("creates, edits and clears a milestone due date, and keeps it across a rename", async () => {
		const createRes = await api("/api/milestones", {
			method: "POST",
			body: JSON.stringify({ title: "Release 1.0", dueDate: "2026-12-15" }),
		});
		expect(createRes.status).toBe(201);
		const created = (await createRes.json()) as { id: string; dueDate?: string };
		expect(created.dueDate).toBe("2026-12-15");
		expect((await filesystem.loadMilestone(created.id))?.dueDate).toBe("2026-12-15");

		const renameRes = await api(`/api/milestones/${created.id}`, {
			method: "PUT",
			body: JSON.stringify({ title: "Release 2.0" }),
		});
		expect(renameRes.status).toBe(200);
		expect((await filesystem.loadMilestone(created.id))?.dueDate).toBe("2026-12-15");

		const editRes = await api(`/api/milestones/${created.id}`, {
			method: "PUT",
			body: JSON.stringify({ title: "Release 2.0", dueDate: "2027-01-31" }),
		});
		expect(editRes.status).toBe(200);
		expect((await filesystem.loadMilestone(created.id))?.dueDate).toBe("2027-01-31");
		expect(await gitStatus()).toBe("");
		expect(await lastCommitMessage()).toBe(`backlog: Update milestone ${created.id} due date`);

		const clearRes = await api(`/api/milestones/${created.id}`, {
			method: "PUT",
			body: JSON.stringify({ title: "Release 2.0", dueDate: null }),
		});
		expect(clearRes.status).toBe(200);
		expect((await filesystem.loadMilestone(created.id))?.dueDate).toBeUndefined();
		expect(await gitStatus()).toBe("");
	});

	it("rejects invalid milestone due dates", async () => {
		const createRes = await api("/api/milestones", {
			method: "POST",
			body: JSON.stringify({ title: "Bad date", dueDate: "2026-02-30" }),
		});
		expect(createRes.status).toBe(400);

		const okRes = await api("/api/milestones", { method: "POST", body: JSON.stringify({ title: "Good" }) });
		const created = (await okRes.json()) as { id: string };
		const editRes = await api(`/api/milestones/${created.id}`, {
			method: "PUT",
			body: JSON.stringify({ title: "Good", dueDate: "15/12/2026" }),
		});
		expect(editRes.status).toBe(400);
		expect((await filesystem.loadMilestone(created.id))?.dueDate).toBeUndefined();
	});
});
