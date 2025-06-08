import { expect, describe, it, beforeAll } from "vitest";
import * as cmd from "./check.ts";
import { Config } from "../lib/configuration.ts";
import * as fs from "node:fs";
import { Baseline } from "../lib/baseline.ts";

describe("findOwner", () => {
	it("match simple regexp", () => {
		const regexps = {
			donut: new RegExp("bob.png"),
		};
		expect(cmd.findOwner(regexps, new Baseline("/root", {}), "bob.png")).toBe("donut");
	});

	it("match nested regexp", () => {
		const regexps = {
			donut: new RegExp("something|bob.png"),
		};
		expect(cmd.findOwner(regexps, new Baseline("/root", {}), "bob.png")).toBe("donut");
	});

	it("return null on miss", () => {
		const regexps = {
			donut: new RegExp("bob.png"),
		};
		expect(cmd.findOwner(regexps, new Baseline("/root", {}), "null.png")).toBeNull();
	});

	it("baseline match return symbol", () => {
		expect(cmd.findOwner({}, new Baseline("/root", { files: ["baseline.png"] }), "baseline.png")).toBe(
			cmd.MATCH_BASELINE,
		);
	});
});

describe("assembleAllRegExp", () => {
	it("empty feature returns empty map", () => {
		const config = new Config({ paths: ["test-dir"], config: "" }, {});
		const result = cmd.assembleAllRegExp(config);
		expect(result).toEqual({});
	});

	it("should handle glob patterns", () => {
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
			  "donut-team": /\\^utils\\(\\?:\\\\/\\|\\(\\?:\\(\\?!\\(\\?:\\\\/\\|\\^\\)\\\\\\.\\)\\.\\)\\*\\?\\)\\?\\$/,
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
		expect(result).toHaveProperty("ai-team");
		expect(result["ai-team"]).toBeInstanceOf(RegExp);
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
		const result = await cmd.runTest(config, new Baseline("/root", {}));
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
						files: ["**/tax.cpp", "src/main.cpp"],
						owner: "donut",
					},
				},
			},
		);
		const result = await cmd.runTest(config, new Baseline("/root", { files: ["readme.md"] }), files);
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
