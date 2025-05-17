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
