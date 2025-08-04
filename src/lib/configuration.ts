import * as fs from "node:fs";
import { load as YamlLoad } from "js-yaml";
import { log } from "./log.ts";
import type { LogLevel } from "./log.ts";
import { OErrorNoPaths } from "./errors.ts";
import { minimatch } from "minimatch";

/**
 * Configuration object used by the tool.
 */
export type Configuration = {
	logLevel: LogLevel;
	pathToConfig: string;
	pathsToScan: string | string[];
	pathToBaseline: string;
	pathToExclude: RegExp[];
	teams: Teams;
	features: Features;
	version: number;
};

export type Features = {
	[key: string]: Feature;
};

export type Feature = {
	description?: string;
	files: string[];
	owner: string;
};

/**
 * Configuration option that can be stored in a file
 */
type StoredConfig = Partial<{
	version: number;
	logLevel: LogLevel;
	pathToBaseline: string;
	/**
	 * List of global patterns to exclude from the scan.
	 */
	exclude: string[];
	teams: Teams;
	features: Features;
}>;

export type ConfigurationOptions = {
	pathsToScan: string | string[];
	// optional
	version?: number;
	pathToConfig?: string;
	pathToBaseline?: string;
	logLevel?: LogLevel;
	// pathToConfigFile?: string;
	exclude?: string[];
};

export type Team = { name: string };
export type Teams = Team[];

export function combineConfig(input: StoredConfig & ConfigurationOptions): Configuration {
	return {
		version: input.version || 1,
		logLevel: input.logLevel || "info",
		pathsToScan: input.pathsToScan || ["."],
		pathToBaseline: input.pathToBaseline || ".ownership-todo.yml",
		pathToExclude: excludeToRegex(input.exclude || []),
		teams: input.teams || [],
		features: input.features || {},
		pathToConfig: input.pathToConfig || "ownership.yaml",
	};
}

export function config(options: ConfigurationOptions): Readonly<Configuration> {
	log.setLevel(options.logLevel);

	const fromFile = readConfigFile(options.pathToConfig);
	const c = combineConfig({ ...fromFile, ...options });

	log.setLevel(c.logLevel);

	if (c.pathsToScan.length === 0) {
		throw new OErrorNoPaths();
	}

	return c;
}

function readConfigFile(pathToConfigFile?: string): StoredConfig {
	if (!pathToConfigFile) {
		return {};
	}
	if (!fs.existsSync(pathToConfigFile)) {
		throw new Error("Configuration file not found: " + pathToConfigFile);
	}
	let configFileContent = null;
	try {
		configFileContent = fs.readFileSync(pathToConfigFile, "utf8");
	} catch (e: any) {
		throw new Error("Error reading configuration file: " + e.message);
	}

	if (configFileContent === null || configFileContent === undefined || configFileContent.trim() === "") {
		throw new Error("Configuration file is empty: " + pathToConfigFile);
	}

	let parsedConfig;
	try {
		parsedConfig = YamlLoad(configFileContent) as any;
	} catch (e: any) {
		throw new Error("Error parsing configuration file: " + e.message);
	}

	if (typeof parsedConfig !== "object" || parsedConfig === null) {
		throw new Error("Configuration file is not a valid object: " + pathToConfigFile);
	}

	const validatedConfig: StoredConfig = {};
	for (const key of Object.keys(parsedConfig)) {
		switch (key) {
			case "exclude":
			case "features":
			case "teams":
			case "version":
			case "logLevel":
				validatedConfig[key] = parsedConfig[key];
				break;
			default:
				log.warn(`Unknown configuration key: ${key}`);
				break;
		}
	}

	return validatedConfig;
}

export function initDefault(): StoredConfig {
	return {
		version: 1,
		logLevel: "info",
		pathToBaseline: ".ownership-todo.yml",
		exclude: [],
		teams: [],
		features: {},
	};
}

function excludeToRegex(excludes: string[] | null = []): RegExp[] {
	if (!excludes) {
		return [];
	}
	// @ts-expect-error
	return excludes.map((exclude) => {
		// @TODO detect if not array and log error is it is the case
		// eslint-disable-next-line no-control-regex
		const regex = /^(?!^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\..*)?$)[^<>:"/\\|?*\x00-\x1F]{1,255}[\\/]{0,1}$/i;
		if (regex.test(exclude)) {
			return new RegExp(exclude);
		}
		return minimatch.makeRe(exclude);
	});
}
