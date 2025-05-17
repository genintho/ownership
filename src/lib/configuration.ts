import * as fs from "node:fs";
import { load as YamlLoad } from "js-yaml";
import { fileURLToPath } from "node:url";
import * as path from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface Config {
	configuration: {
		debug: boolean;
		path: string;
		pathTodo: string;
		stopFirstError: boolean;
		updateTodo: boolean;
	};
	teams: {
		name: string;
	}[];
	features: {
		[key: string]: {
			description: string;
			files: string[];
			owner: string;
		};
	};
}

export function parseConfig(argv: {
	config: string;
	path: string;
	pathTodo?: string;
	updateTodo?: boolean;
	debug?: boolean;
}): Config {
	// @ts-expect-error
	let configData: Config = {};

	const configPath = argv.config || path.resolve(__dirname, "config.yaml");

	try {
		const configFile = fs.readFileSync(configPath, "utf8");
		configData = YamlLoad(configFile) as any;
	} catch (e: any) {
		console.error("\nError loading or parsing config file:", argv.config);
		console.error(e.message);
		process.exit(1);
	}

	configData = configData || {};
	configData.configuration = configData.configuration || {};

	// DEBUG
	configData.configuration.debug = argv.debug || configData.configuration.debug || false;

	if (configData.configuration.debug) {
		console.debug("\nConfiguration data from", argv.config + ":");
		console.debug(configData);
	}

	let pathToAnalyze = argv.path || configData.configuration?.path || "./";
	if (pathToAnalyze.endsWith("/")) {
		pathToAnalyze = pathToAnalyze.slice(0, -1);
	}

	let pathTodo = argv.pathTodo || configData.configuration?.pathTodo || "./.owner-todo.yml";
	configData.configuration.pathTodo = pathTodo;

	configData.configuration.path = pathToAnalyze;

	configData.configuration.stopFirstError = configData.configuration.stopFirstError || false;

	configData.configuration.updateTodo = argv.updateTodo || false;

	if (configData.configuration.debug) {
		console.debug("\nFinal Configuration:");
		console.debug(configData);
	}

	return configData;
}
