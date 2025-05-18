import { vi } from "vitest";

vi.mock("./src/lib/log.ts", () => {
	return {
		log: {
			info: vi.fn(),
			error: vi.fn(),
			debug: vi.fn(),
			log: vi.fn(),
			warn: vi.fn(),
		},
	};
});

vi.mock("node:fs", async () => {
	const memfs = await vi.importActual("memfs");

	// Support both `import fs from "fs"` and "import { readFileSync } from "fs"`
	return { default: memfs.fs, ...memfs.fs };
});
