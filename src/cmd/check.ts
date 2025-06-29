import chalk from "chalk";
import type { Arguments, Argv } from "yargs";
import { parseConfig } from "../lib/configuration.ts";
import type { Config } from "../lib/configuration.ts";
import { initialize as initializeBaseline, type Baseline, saveBaseline } from "../lib/baseline.ts";
import { log } from "../lib/log.ts";
import { configOptions, defaultHandler } from "../lib/cmdHelpers.ts";
import { scan } from "../lib/scanner.ts";

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

	const { errors, nbDir, nbFileTested } = await scan(config, baseline);

	if (argv.updateBaseline) {
		updateBaseline(config, baseline);
		return 0;
	}

	if (errors.length > 0) {
		log.error(chalk.red("\n[X]"), "Found errors");
		for (const error of errors) {
			log.error("  ", chalk.red("[X]"), error.message());
		}
		log.error(errors.length, "errors", nbDir, "directories", nbFileTested, "files tested");
	} else {
		log.info(chalk.green("[✓]"), "No errors found", nbDir, "directories", nbFileTested, "files tested");
	}

	// const unneededFileRecord = baseline.unneededFileRecord;
	// if (unneededFileRecord.length > 0) {
	// 	log.info(chalk.blue("\nBaseline:"), " contains outdated file references:");
	// 	for (const file of unneededFileRecord) {
	// 		log.info("  ", file);
	// 	}
	// 	log.info(chalk.grey("You can remove them by hand, or run `check --update-baseline` to update the baseline file"));
	// }

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
