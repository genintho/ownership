import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { config, initDefault } from "./configuration.ts";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import * as fs from "node:fs";
import { OErrorNoConfig, OErrorNoPaths } from "./errors.ts";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("parseConfig", () => {
	const testDir = path.join(__dirname, "test_configs");

	beforeAll(() => {
		if (!fs.existsSync(testDir)) {
			fs.mkdirSync(testDir, { recursive: true });
		}
	});

	afterAll(() => {
		if (fs.existsSync(testDir)) {
			fs.rmSync(testDir, { recursive: true, force: true });
		}
	});

	it("should throw an error if the config file does not exist", () => {
		expect(() =>
			config({
				pathToConfig: path.join(testDir, "nonexistent.yaml"),
				pathsToScan: ["./"],
			}),
		).toThrow(OErrorNoConfig);
	});

	it("should throw an error if the config file is invalid YAML", () => {
		const invalidYamlPath = path.join(testDir, "invalid.yaml");
		fs.writeFileSync(invalidYamlPath, "invalid yaml: content:"); // Malformed YAML

		expect(() => config({ pathToConfig: invalidYamlPath, pathsToScan: ["./"] })).toThrowError(
			/\nError loading or parsing config file: /,
		);
	});

	it("generate a default config", () => {
		expect(initDefault()).toMatchSnapshot();
	});

	it("should handle multiple paths", () => {
		const conf = config({ pathsToScan: ["./src", "./lib", "./test.js"] });
		expect(conf.pathsToScan).toHaveLength(3);
		expect(conf.pathsToScan[0]).toBe("src");
		expect(conf.pathsToScan[1]).toBe("lib");
		expect(conf.pathsToScan[2]).toBe("test.js");
	});

	it.only("a path must be set", () => {
		expect(() => config({ pathToConfig: "aa.yaml", pathsToScan: [] })).toThrow(OErrorNoPaths);
	});
});
