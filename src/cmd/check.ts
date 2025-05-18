import * as fs from "node:fs";
import chalk from "chalk";
// @ts-expect-error
import type { Arguments, Argv } from "yargs";
import { parseConfig } from "../lib/configuration.ts";
import type { Config } from "../lib/configuration.ts";
import { initialize as initializeBaseline, type Baseline } from "../lib/baseline.ts";
import { log } from "../lib/log.ts";
import * as path from "path";

export interface CheckOptions {
	config: string;
	path: string;
	pathBaseline: string;
	updateBaseline: boolean;
	debug: boolean;
	verbose: boolean;
}

export const command = "check <path>";
export const describe = "Check that files are owned";

export const builder = (yargs: Argv) => {
	return yargs
		.positional("path", {
			describe: "Path to the folders/files to process",
			type: "string",
		})
		.option("config", {
			describe: "Path to the config file",
			type: "string",
			demandOption: false,
		})
		.option("path-baseline", {
			describe: "Path to the todo file",
			type: "string",
			demandOption: false,
			default: "./.owner-todo.yaml",
		})
		.option("update-baseline", {
			describe: "Update the baseline file",
			type: "boolean",
		})
		.option("debug", {
			describe: "Debug mode",
			type: "boolean",
		})
		.option("quiet", {
			describe: "Quiet mode",
			type: "boolean",
		});
};

export const handler = (argv: Arguments<CheckOptions>) => {
	const config = parseConfig(argv);
	const baseline = initializeBaseline(config);

	const filesPathToTest = computePathToTest(config);

	const errors = runTest(config, baseline, filesPathToTest);

	if (errors.length > 0) {
		log.error(chalk.red("[X]"), "Found errors");
		process.exit(1);
	}
	log.info(chalk.green("[✓]"), "No errors found");
};

export function runTest(config: Config, baseline: Baseline, filesPathToTest: string[]): OErrors[] {
	const errors: OErrors[] = [];
	const regexps = assembleAllRegExp(config);
	for (const fullFilePath of filesPathToTest) {
		const owner = findOwner(regexps, fullFilePath);

		if (owner === null) {
			log.error(chalk.red("[X]"), fullFilePath, "has no owner");
			errors.push(new OErrorFileNoOwner(fullFilePath));
		} else {
			log.info(chalk.green("[✓]"), fullFilePath, "owner:", chalk.blue(owner));
		}

		// If config ask to stop as soon as an error is found
		if (errors.length && config.stopFirstError) {
			break;
		}
	}

	return errors;
}

class OErrors {
	message(): string {
		throw new Error("Must be implemented");
	}
}
class OErrorFileNoOwner extends OErrors {
	constructor(public readonly filePath: string) {
		super();
	}
	message(): string {
		return this.filePath + " has no owner";
	}
}

class OErrorNothingToTest extends OErrors {
	message(): string {
		return "Nothing to test";
	}
}

type RegExpMap = { [team: string]: RegExp };

export function assembleAllRegExp(config: Config): RegExpMap {
	const allRegExp: RegExpMap = {};
	for (const feature of Object.values(config.features)) {
		const pattern = feature.files.join("|");
		const featureRegExp = new RegExp(pattern);
		allRegExp[feature.owner] = featureRegExp;
	}
	return allRegExp;
}

export function computePathToTest(config: Config): string[] {
	if (fs.statSync(config.path).isDirectory()) {
		let files = fs
			.readdirSync(config.pathAbs, { recursive: true, withFileTypes: true })
			.filter((file) => file.isFile())
			.map((file) => path.join(file.path, file.name));
		return files;
	}
	return [config.pathAbs];
}

export function findOwner(regexps: RegExpMap, file: string): string | null {
	for (const [team, regexp] of Object.entries(regexps)) {
		if (regexp.test(file)) {
			return team;
		}
	}
	return null;
}
