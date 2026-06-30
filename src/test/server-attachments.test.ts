import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { FileSystem } from "../file-system/operations.ts";
import { BacklogServer } from "../server/index.ts";
import { createUniqueTestDir, retry, safeCleanup } from "./test-utils.ts";

let TEST_DIR: string;
let filesystem: FileSystem;
let server: BacklogServer | null = null;
let serverPort = 0;

async function fetchWithTimeout(path: string, timeoutMs = 1000): Promise<Response> {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), timeoutMs);
	try {
		return await fetch(`http://127.0.0.1:${serverPort}${path}`, { signal: controller.signal });
	} finally {
		clearTimeout(timeout);
	}
}

describe("BacklogServer attachment serving", () => {
	beforeEach(async () => {
		TEST_DIR = createUniqueTestDir("server-attachments");
		filesystem = new FileSystem(TEST_DIR);
		await filesystem.ensureBacklogStructure();

		// ensure config so server starts cleanly
		await filesystem.saveConfig({
			projectName: "Server Attachments",
			statuses: ["To Do", "In Progress", "Done"],
			labels: [],
			milestones: [],
			dateFormat: "YYYY-MM-DD",
			remoteOperations: false,
		});

		// create backlog/attachments/<task>/ with a small image and a secret file outside it
		const backlogRoot = dirname(filesystem.docsDir);
		const attachmentsDir = join(backlogRoot, "attachments", "TASK-1");
		await mkdir(attachmentsDir, { recursive: true });
		await Bun.write(join(attachmentsDir, "screenshot.png"), "PNGTEST");
		// a sibling file outside the attachments directory that must stay unreachable
		await Bun.write(join(backlogRoot, "secret.txt"), "TOP SECRET\n");

		server = new BacklogServer(TEST_DIR);
		await server.start(0, false);
		const port = server.getPort();
		expect(port).not.toBeNull();
		serverPort = port ?? 0;

		// wait for server to be reachable
		await retry(
			async () => {
				const res = await fetchWithTimeout("/api/status", 500);
				if (!res.ok) throw new Error("server not ready");
				return true;
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

	it("serves existing attachment images with the correct Content-Type and body", async () => {
		const res = await fetchWithTimeout("/attachments/TASK-1/screenshot.png");
		expect(res.status).toBe(200);
		expect(res.headers.get("content-type")).toBe("image/png");
		const body = await res.text();
		expect(body).toBe("PNGTEST");
	});

	it("returns 404 for missing attachments", async () => {
		const res = await fetchWithTimeout("/attachments/TASK-1/missing.png");
		expect(res.status).toBe(404);
	});

	it("rejects path traversal attempts with 404", async () => {
		// encoded traversal aimed at the sibling secret file
		const res = await fetchWithTimeout("/attachments/%2e%2e/secret.txt");
		expect(res.status).toBe(404);

		// deeper encoded traversal that would otherwise escape the project root
		const res2 = await fetchWithTimeout("/attachments/TASK-1/%2e%2e/%2e%2e/secret.txt");
		expect(res2.status).toBe(404);
	});
});
