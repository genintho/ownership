import { expect, describe, it, beforeAll, vi } from "vitest";
import { scan } from "./scanner.ts";
import { Config } from "../lib/configuration.ts";
import * as fs from "node:fs";
import { Baseline } from "../lib/baseline.ts";

describe("scanner", () => {
	describe("scan", () => {
		const files = ["src/main.cpp", "src/utils/str.cpp", "src/utils/tax.cpp", "readme.md"];

		beforeAll(() => {
			fs.mkdirSync("./src/utils", { recursive: true });
			for (const file of files) {
				fs.writeFileSync(file, "file1");
			}
		});

		it("files outside the path are ignored", async () => {
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
			const result = await scan(config);
			expect(result.errors).toMatchInlineSnapshot(`
				[
				  OErrorFileNoOwner {
				    "filePath": "src/main.cpp",
				  },
				  OErrorFileNoOwner {
				    "filePath": "src/utils/str.cpp",
				  },
				]
			`);
		});

		it("file found in the baseline are ignored", async () => {
			const baselineModule = await import("../lib/baseline.ts");
			vi.spyOn(baselineModule, "initialize").mockReturnValue(new Baseline({ files: ["src/main.cpp"] }));

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
			const result = await scan(config);
			expect(result.errors).toMatchInlineSnapshot(`
				[
				  OErrorFileNoOwner {
				    "filePath": "src/utils/str.cpp",
				  },
				]
			`);
		});
	});
});
