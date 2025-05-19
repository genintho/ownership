import { expect, describe, it, beforeAll, afterAll } from "vitest";
import * as cmd from "./check.ts";
import { Config } from "../lib/configuration.ts";
import * as fs from "node:fs";
import * as path from "node:path";
import { Baseline } from "../lib/baseline.ts";

describe("findOwner", () => {
	it("match simple regexp", () => {
		const regexps = {
			donut: new RegExp("bob.png"),
		};
		expect(cmd.findOwner(regexps, [], new Baseline({}), "bob.png")).toBe("donut");
	});

	it("match nested regexp", () => {
		const regexps = {
			donut: new RegExp("something|bob.png"),
		};
		expect(cmd.findOwner(regexps, [], new Baseline({}), "bob.png")).toBe("donut");
	});

	it("return null on miss", () => {
		const regexps = {
			donut: new RegExp("bob.png"),
		};
		expect(cmd.findOwner(regexps, [], new Baseline({}), "null.png")).toBeNull();
	});

	it("baseline match return symbol", () => {
		expect(cmd.findOwner({}, [], new Baseline({ files: ["baseline.png"] }), "./baseline.png")).toBe(cmd.MATCH_BASELINE);
	});

	it("exclude match return symbol", () => {
		expect(cmd.findOwner({}, [new RegExp("baseline.png")], new Baseline(), "./baseline.png")).toBe(cmd.MATCH_EXCLUDE);
	});
});

describe("assembleAllRegExp", () => {
	it("empty feature returns empty map", () => {
		const config = new Config({ path: "./test-dir", config: "" }, {});
		const result = cmd.assembleAllRegExp(config);
		expect(result).toEqual({});
	});
	it("feature with files returns map with file regexps", () => {
		const config = new Config(
			{ path: "./test-dir", config: "" },
			{
				features: {
					donut: {
						files: ["bob.png", "something/.*", "something/else.txt"],
						owner: "donut",
					},
				},
			},
		);
		const result = cmd.assembleAllRegExp(config);
		expect(result).toEqual({
			donut: new RegExp("bob.png|something/.*|something/else.txt"),
		});
	});
});

describe("runTest", () => {
	const files = ["./src/main.cpp", "./src/utils/str.cpp", "./src/utils/tax.cpp", "./readme.md"];
	beforeAll(() => {
		fs.mkdirSync("./src/utils", { recursive: true });
		for (const file of files) {
			fs.writeFileSync(file, "file1");
		}
	});

	it("empty feature returns empty map", () => {
		const config = new Config({ path: "./src", config: "" }, {});
		const result = cmd.runTest(config, new Baseline({}), []);
		expect(result).toMatchInlineSnapshot(`
			[
			  OErrorNothingToTest {},
			]
		`);
	});

	it("feature with files returns map with file regexps", () => {
		const config = new Config(
			{ path: "./src", config: "" },
			{
				features: {
					billing: {
						files: [".*/tax.cpp"],
						owner: "donut",
					},
				},
			},
		);
		const result = cmd.runTest(config, new Baseline({}), files);
		expect(result).toMatchInlineSnapshot(`
			[
			  OErrorFileNoOwner {
			    "filePath": "./src/main.cpp",
			  },
			  OErrorFileNoOwner {
			    "filePath": "./src/utils/str.cpp",
			  },
			  OErrorFileNoOwner {
			    "filePath": "./readme.md",
			  },
			]
		`);
	});

	it("file found in the baseline are ignored", () => {
		const config = new Config(
			{ path: "./src", config: "" },
			{
				features: {
					billing: {
						files: [".*/tax.cpp", "./src/main.cpp"],
						owner: "donut",
					},
				},
			},
		);
		const result = cmd.runTest(config, new Baseline({ files: ["readme.md"] }), files);
		expect(result).toMatchInlineSnapshot(`
			[
			  OErrorFileNoOwner {
			    "filePath": "./src/utils/str.cpp",
			  },
			]
		`);
	});

	it("file found in the baseline are ignored", () => {
		const config = new Config(
			{ path: "./src", config: "" },
			{
				exclude: ["utils/.*$"],
			},
		);
		const result = cmd.runTest(config, new Baseline({}), files);
		expect(result).toMatchInlineSnapshot(`
			[
			  OErrorFileNoOwner {
			    "filePath": "./src/main.cpp",
			  },
			  OErrorFileNoOwner {
			    "filePath": "./readme.md",
			  },
			]
		`);
	});
});
