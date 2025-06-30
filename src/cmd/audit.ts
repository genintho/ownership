import chalk from "chalk";
import type { Arguments, Argv } from "yargs";
import { parseConfig } from "../lib/configuration.ts";
import { log } from "../lib/log.ts";
import { configOptions, defaultHandler } from "../lib/cmdHelpers.ts";
import { scan, type ScanResult } from "../lib/scanner.ts";

export interface CheckOptions {
	config: string;
	paths: string[];
	pathBaseline: string;
	updateBaseline: boolean;
	debug: boolean;
	verbose: boolean;
}

export const command = "audit <paths..>";
export const describe = "Strict check of files ownership and configuration health";

export const builder = (yargs: Argv) => {
	return configOptions(yargs);
};

export const handler = defaultHandler(async (argv: Arguments<CheckOptions>) => {
	const config = parseConfig(argv);

	const result = await scan(config);

	let summaries: string[] = [];
	let shouldExit0 = true;
	for (const check of [fileOwnershipErrors, unneededBaselineFiles, ownerlessFeatures]) {
		log.line();
		const summary = check(result);
		if (summary) {
			shouldExit0 = false;
			summaries.push(summary);
		}
	}

	log.info("\n");
	log.line();
	log.line();
	if (summaries.length > 0) {
		log.info(chalk.red("[X]"), "Audit failed");
		log.line();
		for (const summary of summaries) {
			log.error(" -", chalk.red("[X]"), summary);
		}
	} else {
		log.info(chalk.green("[✓]"), "Audit passed");
	}
	log.line();

	return shouldExit0 ? 0 : 1;
});

function fileOwnershipErrors(result: ScanResult): string | null {
	let summary = null;
	const { errors, nbDir, nbFileTested } = result;
	if (errors.length > 0) {
		log.error(chalk.red("[X]"), "Ownership errors");
		for (const error of errors) {
			log.error("  ", chalk.red("[X]"), error.message());
		}
		log.error(errors.length, "errors", nbDir, "directories", nbFileTested, "files tested");
		summary = `Ownership errors: ${errors.length} files without an owner`;
	} else {
		log.info(chalk.green("[✓]"), "No errors found", nbDir, "directories", nbFileTested, "files tested");
	}

	return summary;
}

function unneededBaselineFiles(result: ScanResult): string | null {
	let summary = null;
	if (result.baseline.unneededFileRecord.length > 0) {
		log.error(chalk.red("Baseline:"), " contains outdated file references:");
		for (const file of result.baseline.unneededFileRecord) {
			log.info("  ", file);
		}
		summary = `Baseline contains ${result.baseline.unneededFileRecord.length}outdated file references`;
	} else {
		log.info(chalk.green("[✓]"), "No outdated file references found in the baseline");
	}

	return summary;
}

function ownerlessFeatures(result: ScanResult): string | null {
	let summary = null;
	const { rules } = result;
	if (rules.ownerlessFeatures.length > 0) {
		log.error(chalk.red("[X]"), "Ownerless features");
		for (const feature of rules.ownerlessFeatures) {
			log.error("  ", chalk.red("[X]"), feature);
		}
		summary = rules.ownerlessFeatures.length + " ownerless features found in the configuration";
	} else {
		log.info(chalk.green("[✓]"), "All features are owned");
	}

	return summary;
}
