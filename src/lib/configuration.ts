import * as fs from "node:fs";
import { load as YamlLoad } from "js-yaml";
import { fileURLToPath } from "node:url";
import * as path from "node:path";
import { log } from "./log.ts";
import { OErrorDebugAndQuiet, OErrorNoConfig } from "./errors.ts";
import { minimatch } from "minimatch";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type argvType = {
	config: string;
	paths: string[];
	pathBaseline?: string;
	debug?: boolean;
	quiet?: boolean;
};

export function parseConfig(argv: argvType): Config {
	// @ts-expect-error
	let configFileContent: Config = {};

	const configPath = argv.config || path.resolve(__dirname, "config.yaml");

	if (!fs.existsSync(configPath)) {
		throw new OErrorNoConfig();
	}

	try {
		const configFile = fs.readFileSync(configPath, "utf8");
		configFileContent = YamlLoad(configFile) as any;
	} catch (e: any) {
		throw new Error("\nError loading or parsing config file: " + e.message);
	}

	const config = new Config(argv, configFileContent);

	// @TODO "logLevel" option?
	if (config.quiet) log.setLevel("quiet");
	if (config.debug) log.setLevel("debug");

	if (configFileContent.debug) {
		log.debug("\nConfiguration from argv", JSON.stringify(argv));
		log.debug("\nConfiguration from config file", JSON.stringify(configFileContent));
		log.debug("\nFinal Configuration ", config.toJSON());
	}

	return config;
}

function excludeToRegex(excludes: string[] = []): RegExp[] {
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

export class Config {
	public readonly debug;
	public readonly quiet;
	public readonly paths: ReadonlyArray<{
		readonly relative: string;
		readonly absolute: string;
		readonly basename: string;
	}>;
	public readonly pathBaseline: string;
	public readonly pathBaselineAbs: string;
	public readonly stopFirstError: boolean;

	public readonly exclude: RegExp[];
	public readonly teams: { name: string }[];
	public readonly features: {
		[key: string]: {
			description: string;
			files: string[];
			owner: string;
		};
	};

	constructor(argv: argvType, fileData: any) {
		this.debug = argv.debug || fileData.configuration?.debug || false;
		this.quiet = argv.quiet || fileData.configuration?.quiet || false;

		if (this.debug && this.quiet) {
			throw new OErrorDebugAndQuiet();
		}

		// Handle multiple paths or default to current directory
		const inputPaths = (Array.isArray(argv.paths) && argv.paths.length && argv.paths) ||
			fileData.configuration?.paths || ["./"];

		this.paths = inputPaths.map((pathToAnalyze: string) => {
			// Remove trailing slash if present
			const cleanPath = pathToAnalyze.endsWith("/") ? pathToAnalyze.slice(0, -1) : pathToAnalyze;
			const absolutePath = path.resolve(cleanPath);

			return {
				relative: cleanPath,
				absolute: absolutePath,
				basename: path.basename(absolutePath),
			};
		});

		this.pathBaseline = argv.pathBaseline || fileData.configuration?.basepathBaselineline || "./.owner-todo.yml";
		this.pathBaselineAbs = path.resolve(this.pathBaseline);
		this.stopFirstError = fileData.configuration?.stopFirstError || false;
		this.exclude = excludeToRegex(fileData.exclude);
		this.teams = fileData.teams || {};
		this.features = fileData.features || {};
	}

	toJSON() {
		return {
			configuration: {
				paths: this.paths,
				pathBaseline: this.pathBaseline,
				stopFirstError: this.stopFirstError,
				debug: this.debug,
				quiet: this.quiet,
			},
			exclude: this.exclude,
			teams: this.teams,
			features: this.features,
		};
	}
}
