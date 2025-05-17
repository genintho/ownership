import { describe, it, expect, vi, beforeEach } from "vitest";
import { handler } from "./init.ts";
import * as fs from "node:fs";
import { dump as YamlDump } from "js-yaml";
import { parseConfig } from "../lib/configuration.ts";

// Mock dependencies
vi.mock("node:fs");
vi.mock("js-yaml");
vi.mock("../lib/configuration");

describe("init command handler", () => {
	const mockFs = vi.mocked(fs);
	const mockYamlDump = vi.mocked(YamlDump);
	const mockParseConfig = vi.mocked(parseConfig);

	// Minimal argv structure based on yargs Arguments type and usage in handler
	const baseArgv = {
		_: [],
		$0: "test-script",
	};

	beforeEach(() => {
		vi.resetAllMocks(); // Reset mocks before each test
	});

	it("should create a default config.yaml if none exists", () => {
		const argv = { ...baseArgv, config: "./config.yaml", update: false };
		const mockDefaultConfig = { version: 1, settings: { theme: "dark" } };
		const mockYamlOutput = "version: 1\nsettings:\n  theme: dark";

		mockFs.existsSync.mockReturnValue(false);
		// @ts-expect-error
		mockParseConfig.mockReturnValue(mockDefaultConfig);
		mockYamlDump.mockReturnValue(mockYamlOutput);

		handler(argv);

		expect(mockFs.existsSync).toHaveBeenCalledWith("./config.yaml");
		expect(mockFs.writeFileSync).toHaveBeenCalledTimes(2);
		expect(mockFs.writeFileSync).toHaveBeenNthCalledWith(1, "./config.yaml", "{}");
		expect(mockParseConfig).toHaveBeenCalledWith(argv);
		expect(mockYamlDump).toHaveBeenCalledWith(mockDefaultConfig);
		expect(mockFs.writeFileSync).toHaveBeenNthCalledWith(2, "./config.yaml", mockYamlOutput);
	});

	it("should create a config file at a custom path if none exists", () => {
		const customPath = "./custom-path/my-config.yml";
		const argv = { ...baseArgv, config: customPath, update: false };
		const mockDefaultConfig = { version: 1, settings: { mode: "test" } };
		const mockYamlOutput = "version: 1\nsettings:\n  mode: test";

		mockFs.existsSync.mockReturnValue(false);
		// @ts-expect-error
		mockParseConfig.mockReturnValue(mockDefaultConfig);
		mockYamlDump.mockReturnValue(mockYamlOutput);

		handler(argv);

		expect(mockFs.existsSync).toHaveBeenCalledWith(customPath);
		expect(mockFs.writeFileSync).toHaveBeenCalledTimes(2);
		expect(mockFs.writeFileSync).toHaveBeenNthCalledWith(1, customPath, "{}");
		expect(mockParseConfig).toHaveBeenCalledWith(argv);
		expect(mockYamlDump).toHaveBeenCalledWith(mockDefaultConfig);
		expect(mockFs.writeFileSync).toHaveBeenNthCalledWith(2, customPath, mockYamlOutput);
	});

	it("should do nothing if config file exists and update is false", () => {
		const argv = { ...baseArgv, config: "./config.yaml", update: false };

		mockFs.existsSync.mockReturnValue(true);

		handler(argv);

		expect(mockFs.existsSync).toHaveBeenCalledWith("./config.yaml");
		expect(mockFs.writeFileSync).not.toHaveBeenCalled();
		expect(mockParseConfig).not.toHaveBeenCalled();
		expect(mockYamlDump).not.toHaveBeenCalled();
	});

	it("should update the config file if it exists and update is true", () => {
		const argv = { ...baseArgv, config: "./config.yaml", update: true };
		const mockUpdatedConfig = { version: 2, settings: { theme: "light", newOption: true } };
		const mockYamlOutput = "version: 2\nsettings:\n  theme: light\n  newOption: true";

		mockFs.existsSync.mockReturnValue(true); // File exists
		// @ts-expect-error
		mockParseConfig.mockReturnValue(mockUpdatedConfig);
		mockYamlDump.mockReturnValue(mockYamlOutput);

		handler(argv);

		expect(mockFs.existsSync).toHaveBeenCalledWith("./config.yaml");
		expect(mockFs.writeFileSync).toHaveBeenCalledTimes(2);
		expect(mockFs.writeFileSync).toHaveBeenNthCalledWith(1, "./config.yaml", "{}");
		expect(mockParseConfig).toHaveBeenCalledWith(argv);
		expect(mockYamlDump).toHaveBeenCalledWith(mockUpdatedConfig);
		expect(mockFs.writeFileSync).toHaveBeenNthCalledWith(2, "./config.yaml", mockYamlOutput);
	});
});
