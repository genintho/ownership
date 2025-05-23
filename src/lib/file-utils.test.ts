import { expect, describe, it, beforeAll, afterAll } from "vitest";
import { computePathToTest } from "./file-utils.ts";
import { Config } from "./configuration.ts";
import * as fs from "node:fs";
import * as path from "node:path";

describe("computePathToTest", () => {
	beforeAll(() => {
		fs.mkdirSync("./test-dir/subdir", { recursive: true });
		fs.writeFileSync("./test-dir/file1.txt", "file1");
		fs.writeFileSync("./test-dir/subdir/file2.txt", "file2");
		fs.writeFileSync("./outisde.txt", "test file");
	});

	afterAll(() => {
		fs.rmSync("./test-dir", { recursive: true, force: true });
		fs.rmSync("./test-file.txt", { force: true });
	});

	it("handles directory path with trailing slash", async () => {
		const config = new Config({ path: "./test-dir/", config: "" }, {});
		const result = await computePathToTest(config);

		expect(result).toContain(path.resolve(config.pathAbs, "./file1.txt"));
		expect(result).toContain(path.resolve(config.pathAbs, "./subdir/file2.txt"));
		expect(result).not.toContain(path.resolve(config.pathAbs, "./outside.txt"));
	});

	it("handles directory path without trailing slash", async () => {
		const config = new Config({ path: "./test-dir", config: "" }, {});
		const result = await computePathToTest(config);
		expect(result).toContain(path.resolve(config.pathAbs, "./file1.txt"));
		expect(result).toContain(path.resolve(config.pathAbs, "./subdir/file2.txt"));
		expect(result).not.toContain(path.resolve(config.pathAbs, "./outside.txt"));
	});

	it("handles single file path", async () => {
		const config = new Config({ path: "./test-dir/file1.txt", config: "" }, {});
		const result = await computePathToTest(config);
		expect(config.pathAbs).toContain("test-dir/file1.txt");
		expect(result).toEqual([config.pathAbs]);
	});
});
