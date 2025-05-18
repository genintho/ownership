import * as fs from "node:fs";
import { load as YamlLoad } from "js-yaml";
import { fileURLToPath } from "node:url";
import * as path from "node:path";
import { log } from "./log.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type argvType = {
	config: string;
	path: string;
	pathBaseline?: string;
	debug?: boolean;
};

export function parseConfig(argv: argvType): Config {
	// @ts-expect-error
	let configFileContent: Config = {};

	const configPath = argv.config || path.resolve(__dirname, "config.yaml");

	if (!fs.existsSync(configPath)) {
		throw new Error(`Configuration file does not exists at '${configPath}'`);
	}

	try {
		const configFile = fs.readFileSync(configPath, "utf8");
		configFileContent = YamlLoad(configFile) as any;
	} catch (e: any) {
		throw new Error("\nError loading or parsing config file: " + e.message);
	}

	const config = new Config(argv, configFileContent);

	if (configFileContent.debug) {
		log.debug("\nConfiguration from argv", JSON.stringify(argv));
		log.debug("\nConfiguration from config file", JSON.stringify(configFileContent));
		log.debug("\nFinal Configuration ", config.toJSON());
	}

	return config;
}

export class Config {
	public readonly debug;
	public readonly path: string;
	public readonly pathBaseline: string;
	public readonly stopFirstError: boolean;

	public readonly exclude: string[];
	public readonly teams: { name: string }[];
	public readonly features: {
		[key: string]: {
			description: string;
			files: string[];
			owner: string;
		};
	};

	constructor(argv: argvType, fileData: any) {
		this.debug = argv.debug || fileData.configuration.debug || false;

		let pathToAnalyze = argv.path || fileData.configuration?.path || "./";
		if (pathToAnalyze.endsWith("/")) {
			pathToAnalyze = pathToAnalyze.slice(0, -1);
		}

		this.pathBaseline = argv.pathBaseline || fileData.configuration?.basepathBaselineline || "./.owner-todo.yml";

		this.path = pathToAnalyze;

		this.stopFirstError = fileData.configuration?.stopFirstError || false;

		this.exclude = fileData.exclude || [];
		this.teams = fileData.teams || {};
		this.features = fileData.features || {};
	}

	toJSON() {
		return {
			configuration: {
				path: this.path,
				pathBaseline: this.pathBaseline,
				stopFirstError: this.stopFirstError,
				debug: this.debug,
			},
			exclude: this.exclude,
			teams: this.teams,
			features: this.features,
		};
	}
}
