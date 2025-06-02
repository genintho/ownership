import chalk from "chalk";
// @ts-expect-error
import type { Arguments, Argv } from "yargs";
import { minimatch } from "minimatch";
import { parseConfig } from "../lib/configuration.ts";
import type { Config } from "../lib/configuration.ts";
import { initialize as initializeBaseline, type Baseline, saveBaseline } from "../lib/baseline.ts";
import { log } from "../lib/log.ts";
import { computePathToTest } from "../lib/file-utils.ts";
import { type OError, OErrorFileNoOwner, OErrorNothingToTest } from "../lib/errors.ts";
import { configOptions, defaultHandler } from "../lib/cmdHelpers.ts";

export interface CheckOptions {
	config: string;
	paths: string[];
	pathBaseline: string;
	updateBaseline: boolean;
	debug: boolean;
	verbose: boolean;
}

export const command = "check <paths..>";
export const describe = "Check that files are owned";

export const builder = (yargs: Argv) => {
	return configOptions(yargs).option("update-baseline", {
		describe: "Update the baseline file",
		type: "boolean",
	});
};

export const handler = defaultHandler(async (argv: Arguments<CheckOptions>) => {
	const config = parseConfig(argv);
	const baseline = initializeBaseline(config);

	const filesPathToTest = await computePathToTest(config);

	const errors = runTest(config, baseline, filesPathToTest);

	if (argv.updateBaseline) {
		updateBaseline(config, baseline);
		return 0;
	}

	if (errors.length > 0) {
		log.error(chalk.red("\n[X]"), "Found errors");
		for (const error of errors) {
			log.error("  ", chalk.red("[X]"), error.message());
		}
		log.error(filesPathToTest.length, "files", errors.length, "errors");
	} else {
		log.info(chalk.green("[✓]"), "No errors found");
	}

	const unneededFileRecord = baseline.unneededFileRecord;
	if (unneededFileRecord.length > 0) {
		log.info(chalk.blue("\nBaseline:"), " contains outdated file references:");
		for (const file of unneededFileRecord) {
			log.info("  ", file);
		}
		log.info(chalk.grey("You can remove them by hand, or run `check --update-baseline` to update the baseline file"));
	}

	return errors.length > 0 ? 1 : 0;
});

function updateBaseline(config: Config, baseline: Baseline) {
	const unneededFileRecord = baseline.unneededFileRecord;
	if (baseline.filesToAdd.size > 0) {
		log.info(chalk.blue("\nBaseline will be updated to include the following files:"));
		for (const file of baseline.filesToAdd) {
			log.info("  ", chalk.grey("[X] " + file));
		}
	}

	if (unneededFileRecord.length > 0) {
		log.info(chalk.blue("Baseline: outdated file references will be removed::"));
		for (const file of unneededFileRecord) {
			log.info("  ", file);
		}
	}

	if (unneededFileRecord.length === 0 && baseline.filesToAdd.size === 0) {
		log.info(chalk.dim.green("No changes to the baseline file"));
		return;
	}

	log.info("\nSaving new baseline file...");
	saveBaseline(config, baseline);
	log.info(chalk.green("Baseline file updated"));
}

export const MATCH_BASELINE = Symbol("MATCH_BASELINE");

export function runTest(config: Config, baseline: Baseline, filesPathToTest: string[]): OError[] {
	if (filesPathToTest.length === 0) {
		return [new OErrorNothingToTest()];
	}

	const errors: OError[] = [];
	const regexps = assembleAllRegExp(config);
	for (const fullFilePath of filesPathToTest) {
		const owner = findOwner(regexps, baseline, fullFilePath);

		if (owner === null) {
			log.debug(chalk.red("[X]"), fullFilePath, "has no owner");
			// Use the first path's absolute path for backward compatibility
			errors.push(new OErrorFileNoOwner(config.paths[0].relative, fullFilePath));
		} else if (owner === MATCH_BASELINE) {
			log.debug(chalk.grey("[✓]"), fullFilePath, "is in the baseline");
		} else {
			log.debug(chalk.green("[✓]"), fullFilePath, "owner:", chalk.blue(owner));
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
		// Convert each glob pattern to regex and combine them
		const regexPatterns = feature.files
			.map((filePattern) => {
				const regex = minimatch.makeRe(filePattern);
				return regex ? regex.source : null;
			})
			.filter((source): source is string => source !== null);

		if (regexPatterns.length > 0) {
			const combinedPattern = regexPatterns.join("|");
			allRegExp[feature.owner] = new RegExp(combinedPattern);
		}
	}
	return allRegExp;
}

export function findOwner(regexps: RegExpMap, baseline: Baseline, file: string): string | null | typeof MATCH_BASELINE {
	if (baseline.check(file)) {
		return MATCH_BASELINE;
	}

	for (const [team, regexp] of Object.entries(regexps)) {
		if (regexp.test(file)) {
			return team;
		}
	}
	return null;
}
