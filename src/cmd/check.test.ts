import { expect, describe, it, beforeAll, afterAll } from "vitest";
import * as cmd from "./check.ts";
import { Config } from "../lib/configuration.ts";
import * as fs from "node:fs";
import * as path from "node:path";


describe("findOwner", () => {
	it("match simple regexp", () => {
		const regexps = {
			donut: new RegExp("bob.png"),
		};
		expect(cmd.findOwner(regexps, "bob.png")).toBe("donut");
	});
	it("match simple regexp", () => {
		const regexps = {
			donut: new RegExp("something|bob.png"),
		};
		expect(cmd.findOwner(regexps, "bob.png")).toBe("donut");
	});
	it("return null on miss", () => {
		const regexps = {
			donut: new RegExp("bob.png"),
		};
		expect(cmd.findOwner(regexps, "null.png")).toBeNull();
	});
});

describe("computePathToTest", () => {
	beforeAll(() => {
		fs.mkdirSync("./test-dir/subdir", {recursive: true});
		fs.writeFileSync("./test-dir/file1.txt", "file1");
		fs.writeFileSync("./test-dir/subdir/file2.txt", "file2");
		fs.writeFileSync("./outisde.txt", "test file");
	});

	afterAll(() => {
		fs.rmSync("./test-dir", { recursive: true, force: true });
		fs.rmSync("./test-file.txt", { force: true });
	});

	it("handles directory path with trailing slash", () => {
		const config = new Config(
			{ path: "./test-dir/", config: "" }, {}
		);
		const result = cmd.computePathToTest(config);
		expect(result).toContain(path.resolve(config.pathAbs,"./file1.txt"));
		expect(result).toContain(path.resolve(config.pathAbs,"./subdir/file2.txt"));
		expect(result).not.toContain(path.resolve(config.pathAbs,"./outside.txt"));
	});

	it("handles directory path without trailing slash", () => {
		const config = new Config(
			{ path: "./test-dir", config: "" },
			{}
		);
		const result = cmd.computePathToTest(config);
		expect(result).toContain(path.resolve(config.pathAbs,"./file1.txt"));
		expect(result).toContain(path.resolve(config.pathAbs,"./subdir/file2.txt"));
		expect(result).not.toContain(path.resolve(config.pathAbs,"./outside.txt"));
	});

	it("handles single file path", () => {
		const config = new Config(
			{ path: "./test-dir/file1.txt", config: "" },
			{}
		);
		const result = cmd.computePathToTest(config);
		expect(config.pathAbs).toContain("test-dir/file1.txt");
		expect(result).toEqual([config.pathAbs]);
	});
});
