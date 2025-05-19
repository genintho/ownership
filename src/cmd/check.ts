import chalk from "chalk";
// @ts-expect-error
import type { Arguments, Argv } from "yargs";
import { parseConfig } from "../lib/configuration.ts";
import type { Config } from "../lib/configuration.ts";
import { initialize as initializeBaseline, type Baseline } from "../lib/baseline.ts";
import { log } from "../lib/log.ts";
import { computePathToTest } from "../lib/file-utils.ts";
import { type OError, OErrorFileNoOwner, OErrorNothingToTest } from "../lib/errors.ts";
import { configOptions, defaultHandler } from "../lib/cmdHelpers.ts";

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
	return configOptions(yargs).option("update-baseline", {
		describe: "Update the baseline file",
		type: "boolean",
	});
};

export const handler = defaultHandler((argv: Arguments<CheckOptions>) => {
	const config = parseConfig(argv);
	const baseline = initializeBaseline(config);

	const filesPathToTest = computePathToTest(config);

	const errors = runTest(config, baseline, filesPathToTest);

	if (errors.length > 0) {
		log.error(chalk.red("[X]"), "Found errors");
		for (const error of errors) {
			log.error("  ", chalk.red("[X]"), error.message());
		}
		process.exit(1);
	}
	log.info(chalk.green("[✓]"), "No errors found");
});

export const MATCH_BASELINE = Symbol("MATCH_BASELINE");
export const MATCH_EXCLUDE = Symbol("MATCH_EXCLUDE");

export function runTest(config: Config, baseline: Baseline, filesPathToTest: string[]): OError[] {
	if (filesPathToTest.length === 0) {
		return [new OErrorNothingToTest()];
	}

	const errors: OError[] = [];
	const regexps = assembleAllRegExp(config);
	for (const fullFilePath of filesPathToTest) {
		const owner = findOwner(regexps, config.exclude, baseline, fullFilePath);

		if (owner === null) {
			log.info(chalk.red("[X]"), fullFilePath, "has no owner");
			errors.push(new OErrorFileNoOwner(config.pathAbs, fullFilePath));
		} else if (owner === MATCH_EXCLUDE) {
			log.info(chalk.grey("[✓]"), fullFilePath, "is excluded");
		} else if (owner === MATCH_BASELINE) {
			log.info(chalk.grey("[✓]"), fullFilePath, "is in the baseline");
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

export function findOwner(
	regexps: RegExpMap,
	excludeList: RegExp[],
	baseline: Baseline,
	file: string,
): string | null | typeof MATCH_BASELINE | typeof MATCH_EXCLUDE {
	if (baseline.check(file)) {
		return MATCH_BASELINE;
	}

	for (const exclude of excludeList) {
		if (exclude.test(file)) {
			return MATCH_EXCLUDE;
		}
	}

	for (const [team, regexp] of Object.entries(regexps)) {
		if (regexp.test(file)) {
			return team;
		}
	}
	return null;
}
