import { vi } from "vitest";

vi.mock("./src/lib/log.ts", () => {
	return {
		log: {
			setLevel: vi.fn(),
			info: vi.fn(),
			error: vi.fn(),
			debug: vi.fn(),
			log: vi.fn(),
			warn: vi.fn(),
			time: vi.fn(),
			timeEnd: vi.fn(),
		},
	};
});

vi.mock("node:fs", async () => {
	const memfs = await vi.importActual("memfs");

	return { default: memfs.fs, ...memfs.fs };
});
