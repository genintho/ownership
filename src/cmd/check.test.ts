import { expect, describe, it, beforeAll } from "vitest";
import * as cmd from "./check.ts";
import { Config } from "../lib/configuration.ts";
import * as fs from "node:fs";
import { Baseline } from "../lib/baseline.ts";

function gen(str: string) {
	return {
		file: {},
		dir: {},
		other: {
			donut: new RegExp(str),
		},
	};
}

describe("findOwner", () => {
	it("match simple regexp", () => {
		const regexps = gen("bob.png");
		expect(cmd.findOwner(regexps, new Baseline({}), "bob.png")).toBe("donut");
	});

	it("match nested regexp", () => {
		const regexps = gen("something|bob.png");
		expect(cmd.findOwner(regexps, new Baseline({}), "bob.png")).toBe("donut");
	});

	it("return null on miss", () => {
		const regexps = gen("bob.png");
		expect(cmd.findOwner(regexps, new Baseline({}), "null.png")).toBeNull();
	});

	it("baseline match return symbol", () => {
		expect(cmd.findOwner(gen("bob.png"), new Baseline({ files: ["baseline.png"] }), "baseline.png")).toBe(
			cmd.MATCH_BASELINE,
		);
	});
});

describe("assembleAllRegExp", () => {
	it("empty feature returns empty map", () => {
		const config = new Config({ paths: ["test-dir"], config: "" }, {});
		const result = cmd.assembleAllRegExp(config);
		expect(result).toEqual({ dir: {}, other: {}, file: {} });
	});

	it("should handle file patterns", () => {
		const config = new Config(
			{ paths: ["./test-dir"], config: "" },
			{
				features: {
					bob: {
						files: ["utils/bob.png"],
						owner: "donut-team",
					},
				},
			},
		);

		const result = cmd.assembleAllRegExp(config);
		expect(result).toMatchInlineSnapshot(`
			{
			  "dir": {},
			  "file": {
			    "donut-team": Set {
			      "^utils\\/bob\\.png$",
			    },
			  },
			  "other": {},
			}
		`);
	});

	it("should handle directory patterns", () => {
		const config = new Config(
			{ paths: ["./test-dir"], config: "" },
			{
				features: {
					bob: {
						files: ["utils/**"],
						owner: "donut-team",
					},
				},
			},
		);

		const result = cmd.assembleAllRegExp(config);
		expect(result).toMatchInlineSnapshot(`
			{
			  "dir": {
			    "donut-team": /\\^utils\\(\\?:\\\\/\\|\\(\\?:\\(\\?!\\(\\?:\\\\/\\|\\^\\)\\\\\\.\\)\\.\\)\\*\\?\\)\\?\\$/,
			  },
			  "file": {},
			  "other": {},
			}
		`);
	});

	it("should handle other patterns", () => {
		const config = new Config(
			{ paths: ["./test-dir"], config: "" },
			{
				features: {
					bob: {
						files: ["utils[ba]/**"],
						owner: "donut-team",
					},
				},
			},
		);

		const result = cmd.assembleAllRegExp(config);
		expect(result).toMatchInlineSnapshot(`
			{
			  "dir": {},
			  "file": {},
			  "other": {
			    "donut-team": /\\^utils\\[ba\\]\\(\\?:\\\\/\\|\\(\\?:\\(\\?!\\(\\?:\\\\/\\|\\^\\)\\\\\\.\\)\\.\\)\\*\\?\\)\\?\\$/,
			  },
			}
		`);
	});

	it("should handle complex glob patterns without throwing syntax errors", () => {
		const config = new Config(
			{ paths: ["./test-dir"], config: "" },
			{
				features: {
					ai_team: {
						files: ["**/*display_image*.*"],
						owner: "ai-team",
					},
				},
			},
		);

		// This should not throw a SyntaxError: Invalid regular expression
		expect(() => cmd.assembleAllRegExp(config)).not.toThrow();

		const result = cmd.assembleAllRegExp(config);
		expect(result.other).toHaveProperty("ai-team");
		expect(result.other["ai-team"]).toBeInstanceOf(RegExp);
	});
});

describe("isGlobForFolders", () => {
	it.each([
		["file.png", false],
		["**/bob.png", false],
		["*/bob.png", false],
		["bob/**", true],
		["bob/*", true],
		["**/bob/**", true],
		["bob", true],
		// @TODO [".git", true],
	])("(%s) -> %d", (a, expected) => {
		expect(cmd.isGlobForFolders(a)).toBe(expected);
	});
	// it.only("(%s) -> %d", () => {
	// expect(cmd.isGlobForFolders("bob/**")).toBe(true);
	// });
});

describe("isExactFilePattern", () => {
	it.each([
		["file.png", true],
		["bob/file.png", true],
		["**/bob.png", false],
		["*/bob.png", false],
		["**/bob/**", false],
	])("(%s) -> %d", (a, expected) => {
		expect(cmd.isExactFilePattern(a)).toBe(expected);
	});
});

describe("runTest", () => {
	const files = ["src/main.cpp", "src/utils/str.cpp", "src/utils/tax.cpp", "readme.md"];

	beforeAll(() => {
		fs.mkdirSync("./src/utils", { recursive: true });
		for (const file of files) {
			fs.writeFileSync(file, "file1");
		}
	});

	it("feature with files returns map with file regexps", async () => {
		const config = new Config(
			{ paths: ["./src"], config: "" },
			{
				features: {
					billing: {
						files: ["**/tax.cpp"],
						owner: "donut",
					},
				},
			},
		);
		const result = await cmd.runTest(config, new Baseline({}));
		expect(result).toMatchInlineSnapshot(`
			{
			  "errors": [
			    OErrorFileNoOwner {
			      "filePath": "src/main.cpp",
			    },
			    OErrorFileNoOwner {
			      "filePath": "src/utils/str.cpp",
			    },
			  ],
			  "nbDir": 2,
			  "nbFileTested": 3,
			}
		`);
	});

	it("file found in the baseline are ignored", async () => {
		const config = new Config(
			{ paths: ["src"], config: "" },
			{
				features: {
					billing: {
						files: ["**/tax.cpp"],
						owner: "donut",
					},
				},
			},
		);
		const result = await cmd.runTest(config, new Baseline({ files: ["src/main.cpp"] }));
		expect(result).toMatchInlineSnapshot(`
			{
			  "errors": [
			    OErrorFileNoOwner {
			      "filePath": "src/utils/str.cpp",
			    },
			  ],
			  "nbDir": 2,
			  "nbFileTested": 3,
			}
		`);
	});
});
