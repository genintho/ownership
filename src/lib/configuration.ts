import * as fs from "node:fs";
import { load as YamlLoad } from "js-yaml";
import { fileURLToPath } from "node:url";
import * as path from "node:path";
import { log } from "./log.ts";
import { OErrorDebugAndQuiet, OErrorNoConfig, OErrorNoPaths } from "./errors.ts";
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
	if (argv.debug) {
		log.setLevel("debug");
	}

	log.debug("Configuration from argv", JSON.stringify(argv));

	// @ts-expect-error
	let configFileContent: Config = {};

	const configPath = path.resolve(argv.config || path.resolve(__dirname, "ownership.yaml"));
	log.debug("Configuration file path", configPath);

	if (!fs.existsSync(configPath)) {
		throw new OErrorNoConfig();
	}

	try {
		const configFile = fs.readFileSync(configPath, "utf8");
		log.debug("Configuration file read", configFile.length, "bytes");
		configFileContent = YamlLoad(configFile) as any;
	} catch (e: any) {
		throw new Error("\nError loading or parsing config file: " + e.message);
	}

	const config = new Config(argv, configFileContent);

	// @TODO "logLevel" option?
	if (config.quiet) log.setLevel("quiet");
	if (config.debug) log.setLevel("debug");

	log.debug(JSON.stringify(config.toJSON(), null, 2));

	return config;
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

export class Config {
	public readonly debug;
	public readonly quiet;
	/**
	 * The root of the project, aka the folder in which the command is being called
	 * Used to compute the relative path of the files
	 */
	public readonly root: string;
	public readonly paths: ReadonlyArray<string>;
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
		this.root = process.cwd();

		log.debug("Root", this.root);

		if (this.debug && this.quiet) {
			throw new OErrorDebugAndQuiet();
		}

		// Passing paths to the CLI command takes priority over the ones in the config file
		// If no path is provided, default to the current directory
		this.paths = (Array.isArray(argv.paths) && argv.paths.length && argv.paths) || fileData.configuration?.paths || [];

		if (this.paths.length === 0) {
			throw new OErrorNoPaths();
		}
		// Remove the leading ./ from the paths if found
		this.paths = this.paths.map((path) => {
			if (path === "./") {
				return this.root;
			}
			return path.replace(/^\.\//, "");
		});

		this.pathBaseline = argv.pathBaseline || fileData.configuration?.basepathBaselineline || ".owner-todo.yml";
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
