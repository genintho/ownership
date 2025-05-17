import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { parseConfig } from "./configuration.ts";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("parseConfig", () => {
	const testDir = path.join(__dirname, "test_configs");

	beforeAll(() => {
		if (!fs.existsSync(testDir)) {
			fs.mkdirSync(testDir);
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
			path: "./",
		};
		expect(() => parseConfig(argv)).toThrowError(`Configuration file does not exists at '${argv.config}'`);
	});

	it("should throw an error if the config file is invalid YAML", () => {
		const invalidYamlPath = path.join(testDir, "invalid.yaml");
		fs.writeFileSync(invalidYamlPath, "invalid yaml: content:"); // Malformed YAML

		const argv = {
			config: invalidYamlPath,
			path: "./",
		};

		expect(() => parseConfig(argv)).toThrowError(/\nError loading or parsing config file: /);
	});
});
