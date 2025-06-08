import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { parseConfig } from "./configuration.ts";
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
		const argv = {
			config: path.join(testDir, "nonexistent.yaml"),
			paths: ["./"],
		};
		expect(() => parseConfig(argv)).toThrow(OErrorNoConfig);
	});

	it("should throw an error if the config file is invalid YAML", () => {
		const invalidYamlPath = path.join(testDir, "invalid.yaml");
		fs.writeFileSync(invalidYamlPath, "invalid yaml: content:"); // Malformed YAML

		const argv = {
			config: invalidYamlPath,
			paths: ["./"],
		};

		expect(() => parseConfig(argv)).toThrowError(/\nError loading or parsing config file: /);
	});

	it("generate a default config", () => {
		const p = path.join(testDir, "conf.yaml");
		fs.writeFileSync(p, "{}");

		const conf = parseConfig({ config: p, paths: ["./target_path"], debug: true });
		expect(conf.paths).toHaveLength(1);
		expect(conf.root).toBe(process.cwd());
		const confJson = conf.toJSON();
		// @TODO figure out how to actually test this without hardcoding a path in the snapshot
		expect(confJson).toMatchSnapshot();
	});

	it("should handle multiple paths", () => {
		const p = path.join(testDir, "conf.yaml");
		fs.writeFileSync(p, "{}");

		const conf = parseConfig({ config: p, paths: ["./src", "./lib", "./test.js"], debug: true });
		expect(conf.paths).toHaveLength(3);
		expect(conf.paths[0]).toBe("src");
		expect(conf.paths[1]).toBe("lib");
		expect(conf.paths[2]).toBe("test.js");
	});

	it("a path must", () => {
		const p = path.join(testDir, "conf.yaml");
		fs.writeFileSync(p, "{}");

		expect(() => parseConfig({ config: p, paths: [] })).toThrow(OErrorNoPaths);
	});
});
