import { expect, describe, it } from "vitest";
import * as rule from "./rules.ts";

function gen(...strs: string[]) {
	// return {
	// 	file: {},
	// 	dir: {},
	// 	other: {
	// 		donut: new RegExp(str),
	// 	},
	// };

	return new rule.Rules({ featureA: { files: [...strs], owner: "donut" } });
}

describe("findOwner", () => {
	it("match simple regexp", () => {
		const r = gen("a/bob.png");

		expect(r.testPath("a/bob.png")).toBe("donut");
	});

	it("match nested regexp", () => {
		const r = gen("something", "bob.png");
		expect(r.testPath("bob.png")).toBe("donut");
	});

	// it("return null on miss", () => {
	// 	const regexps = gen("bob.png");
	// 	expect(cmd.findOwner(regexps, new Baseline({}), "null.png")).toBeNull();
	// });

	// it("baseline match return symbol", () => {
	// 	expect(cmd.findOwner(gen("bob.png"), new Baseline({ files: ["baseline.png"] }), "baseline.png")).toBe(
	// 		cmd.MATCH_BASELINE,
	// 	);
	// });
});

describe("Rule constructor", () => {
	it("empty feature returns empty map", () => {
		expect(new rule.Rules({})).toMatchInlineSnapshot(`
      Rules {
        "dirRules": {},
        "fileRules": {},
        "otherRules": {},
      }
    `);
	});

	it("should handle file patterns", () => {
		expect(gen("utils/bob.png")).toMatchInlineSnapshot(`
			Rules {
			  "dirRules": {},
			  "fileRules": {
			    "donut": Set {
			      "utils/bob.png",
			    },
			  },
			  "otherRules": {},
			}
		`);
	});

	it("should handle directory patterns", () => {
		expect(gen("utils/**")).toMatchInlineSnapshot(`
			Rules {
			  "dirRules": {
			    "donut": [
			      /\\^utils\\(\\?:\\\\/\\|\\(\\?:\\(\\?!\\(\\?:\\\\/\\|\\^\\)\\\\\\.\\)\\.\\)\\*\\?\\)\\?\\$/,
			    ],
			  },
			  "fileRules": {},
			  "otherRules": {},
			}
		`);
	});

	it("should handle special patterns", () => {
		expect(gen("utils[ba]/**")).toMatchInlineSnapshot(`
			Rules {
			  "dirRules": {},
			  "fileRules": {},
			  "otherRules": {
			    "donut": [
			      /\\^utils\\[ba\\]\\(\\?:\\\\/\\|\\(\\?:\\(\\?!\\(\\?:\\\\/\\|\\^\\)\\\\\\.\\)\\.\\)\\*\\?\\)\\?\\$/,
			    ],
			  },
			}
		`);
	});

	it("complex patterns", () => {
		expect(gen("**/*display_image*.*")).toMatchInlineSnapshot(`
			Rules {
			  "dirRules": {},
			  "fileRules": {},
			  "otherRules": {
			    "donut": [
			      /\\^\\(\\?:\\\\/\\|\\(\\?:\\(\\?!\\(\\?:\\\\/\\|\\^\\)\\\\\\.\\)\\.\\)\\*\\?\\\\/\\)\\?\\(\\?!\\\\\\.\\)\\[\\^/\\]\\*\\?display_image\\[\\^/\\]\\*\\?\\\\\\.\\[\\^/\\]\\*\\?\\$/,
			    ],
			  },
			}
		`);
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
		expect(rule.isGlobForFolders(a)).toBe(expected);
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
		expect(rule.isExactFilePattern(a)).toBe(expected);
	});
});
