import { expect, describe, it, beforeAll, afterAll } from "vitest";
import { computePathToTest } from "./file-utils.ts";
import { Config } from "./configuration.ts";
import * as fs from "node:fs";

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
		const config = new Config({ paths: ["./test-dir/"], config: "" }, {});
		const result = await computePathToTest(config);

		expect(result).toContain("./file1.txt");
		expect(result).toContain("./subdir/file2.txt");
		expect(result).not.toContain("./outside.txt");
	});

	it("handles directory path without trailing slash", async () => {
		const config = new Config({ paths: ["./test-dir"], config: "" }, {});
		const result = await computePathToTest(config);
		expect(result).toContain("./file1.txt");
		expect(result).toContain("./subdir/file2.txt");
		expect(result).not.toContain("./outside.txt");
	});

	it("handles single file path", async () => {
		const config = new Config({ paths: ["./test-dir/file1.txt"], config: "" }, {});
		const result = await computePathToTest(config);
		expect(config.paths[0].relative).toContain("test-dir/file1.txt");
		expect(result).toEqual([config.paths[0].relative]);
	});

	it("does not include excluded files", async () => {
		const config = new Config({ paths: ["./test-dir"], config: "" }, { exclude: ["subdir"] });
		const result = await computePathToTest(config);
		expect(result).toHaveLength(1);
		expect(result).not.toContain("./subdir/file2.txt");
	});

	it("handles multiple paths", async () => {
		const config = new Config({ paths: ["./test-dir/file1.txt", "./test-dir/subdir"], config: "" }, {});
		const result = await computePathToTest(config);

		// Should include the single file and files from the directory
		expect(result).toContain("./test-dir/file1.txt");
		expect(result).toContain("./test-dir/subdir/file2.txt");
		expect(result).toHaveLength(2);
	});

	it.only("handles mix of files and directories", async () => {
		fs.writeFileSync("./standalone.txt", "standalone");

		const config = new Config({ paths: ["./standalone.txt", "./test-dir"], config: "" }, {});
		const result = await computePathToTest(config);

		// Should include standalone file and all files from test-dir
		expect(result).toContain("standalone.txt");
		expect(result).toContain("test-dir/file1.txt");
		expect(result).toContain("test-dir/subdir/file2.txt");

		fs.rmSync("./standalone.txt", { force: true });
	});
});
