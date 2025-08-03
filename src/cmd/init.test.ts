import { describe, it, expect, vi, beforeEach } from "vitest";
import { handler } from "./init.ts";
import * as fs from "node:fs";
import { initDefault } from "../lib/configuration.ts";
import { dump as YamlDump } from "js-yaml";

// Mock dependencies
vi.mock("node:fs");
vi.mock("js-yaml");
vi.mock("../lib/configuration");

describe("init command handler", () => {
	const mockFs = vi.mocked(fs);
	const mockYamlDump = vi.mocked(YamlDump);
	const mockInitDefault = vi.mocked(initDefault);

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
		const mockDefaultConfig = { version: 1, logLevel: "info" as const, pathToBaseline: ".ownership-todo.yml" };
		const mockYamlOutput = "version: 1\nlogLevel: info\npathToBaseline: .ownership-todo.yml\n";

		mockFs.existsSync.mockReturnValue(false);
		mockInitDefault.mockReturnValue(mockDefaultConfig);
		mockYamlDump.mockReturnValue(mockYamlOutput);

		handler(argv);

		expect(mockFs.existsSync).toHaveBeenCalledWith("./config.yaml");
		expect(mockFs.writeFileSync).toHaveBeenCalledTimes(1);
		expect(mockFs.writeFileSync).toHaveBeenNthCalledWith(1, "./config.yaml", mockYamlOutput);
		expect(mockYamlDump).toHaveBeenCalledWith(mockDefaultConfig, { sortKeys: true });
	});

	it("should create a config file at a custom path if none exists", () => {
		const customPath = "./custom-path/my-config.yml";
		const argv = { ...baseArgv, config: customPath, update: false };
		const mockDefaultConfig = { version: 1, logLevel: "debug" as const };
		const mockYamlOutput = "version: 1\nlogLevel: debug\n";

		mockFs.existsSync.mockReturnValue(false);
		mockInitDefault.mockReturnValue(mockDefaultConfig);
		mockYamlDump.mockReturnValue(mockYamlOutput);

		handler(argv);

		expect(mockFs.existsSync).toHaveBeenCalledWith(customPath);
		expect(mockFs.writeFileSync).toHaveBeenCalledTimes(1);
		expect(mockFs.writeFileSync).toHaveBeenNthCalledWith(1, customPath, mockYamlOutput);
		expect(mockYamlDump).toHaveBeenCalledWith(mockDefaultConfig, { sortKeys: true });
	});

	it("should do nothing if config file exists and update is false", () => {
		const argv = { ...baseArgv, config: "./config.yaml", update: false };

		mockFs.existsSync.mockReturnValue(true);

		handler(argv);

		expect(mockFs.existsSync).toHaveBeenCalledWith("./config.yaml");
		expect(mockFs.writeFileSync).not.toHaveBeenCalled();
		expect(mockYamlDump).not.toHaveBeenCalled();
	});

	it("should update the config file if it exists and update is true", () => {
		const argv = { ...baseArgv, config: "./config.yaml", update: true };
		const mockUpdatedConfig = { version: 2 };
		const mockYamlOutput = "version: 2\n";

		mockFs.existsSync.mockReturnValue(true); // File exists
		mockInitDefault.mockReturnValue(mockUpdatedConfig);
		mockYamlDump.mockReturnValue(mockYamlOutput);

		handler(argv);

		expect(mockFs.existsSync).toHaveBeenCalledWith("./config.yaml");
		expect(mockFs.writeFileSync).toHaveBeenCalledTimes(1);
		expect(mockFs.writeFileSync).toHaveBeenNthCalledWith(1, "./config.yaml", mockYamlOutput);
	});
});
