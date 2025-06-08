import chalk from "chalk";
import * as fs from "node:fs";
import * as path from "node:path";
// @ts-expect-error
import type { Arguments, Argv } from "yargs";
import { minimatch } from "minimatch";
import { parseConfig } from "../lib/configuration.ts";
import type { Config } from "../lib/configuration.ts";
import { initialize as initializeBaseline, type Baseline, saveBaseline } from "../lib/baseline.ts";
import { log } from "../lib/log.ts";
import { type OError, OErrorFileNoOwner } from "../lib/errors.ts";
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

	const { errors, nbFileTested } = await runTest(config, baseline);

	if (argv.updateBaseline) {
		updateBaseline(config, baseline);
		return 0;
	}

	if (errors.length > 0) {
		log.error(chalk.red("\n[X]"), "Found errors");
		for (const error of errors) {
			log.error("  ", chalk.red("[X]"), error.message());
		}
		log.error(nbFileTested, "file tested", errors.length, "errors");
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

export async function runTest(
	config: Config,
	baseline: Baseline,
): Promise<{ errors: OError[]; nbFileTested: number; nbDir: number }> {
	return new Promise((resolve) => {
		log.time("new_thing");
		const queue = new Queue({
			concurrency: 10,
			exclude: config.exclude,
			ownerRules: assembleAllRegExp(config),
			baseline,
			onFinish: (errors: OError[], nbFiles, nbDir) => {
				log.timeEnd("new_thing");
				resolve({ errors, nbFileTested: nbFiles, nbDir });
			},
		});
		for (const pathInfo of config.paths) {
			log.debug("Processing provided path:", pathInfo);
			queue.add(pathInfo);
		}
	});
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

class Queue {
	private next: Set<string> = new Set();
	private running: Set<string> = new Set();
	private concurrency: number = 2;
	private onFinish: (results: OError[], nbFileTested: number, nbDir: number) => void;
	private exclude: RegExp[] = [];
	private nbFileTested = 0;
	private nbDir = 0;
	private results: OError[] = [];
	private ownerRules: RegExpMap;
	private baseline: Baseline;

	constructor({
		concurrency = 4,
		exclude = [],
		onFinish,
		ownerRules,
		baseline,
	}: {
		concurrency: number;
		exclude: RegExp[];
		onFinish: (results: OError[], nbFileTested: number, nbDir: number) => void;
		ownerRules: RegExpMap;
		baseline: Baseline;
	}) {
		this.concurrency = concurrency;
		this.exclude = exclude;
		this.onFinish = onFinish;
		this.ownerRules = ownerRules;
		this.baseline = baseline;
	}

	add(pathToScan: string) {
		const shouldSkip = this.exclude.some((exclude) => {
			return exclude.test(pathToScan);
		});

		if (shouldSkip) {
			log.debug("Skipping: exclude list match", pathToScan);
			return;
		}

		this.next.add(pathToScan);
		this.ping();
	}

	ping() {
		if (this.running.size >= this.concurrency) {
			return;
		}

		if (this.next.size === 0 && this.running.size === 0) {
			this.onFinish(this.results, this.nbFileTested, this.nbDir);
			return;
		}

		const path = this.next.values().next().value;
		if (path) {
			this.process(path);
		}
	}

	process(pathToScan: string) {
		this.running.add(pathToScan);
		this.next.delete(pathToScan);

		if (fs.statSync(pathToScan).isDirectory()) {
			this.processDir(pathToScan);
		} else {
			this.processFile(pathToScan);
		}
	}

	processFile(pathToScan: string) {
		this.nbFileTested++;

		const owner = findOwner(this.ownerRules, this.baseline, pathToScan);

		if (owner === null) {
			log.debug(chalk.red("[X]"), pathToScan, "has no owner");
			// Use the first path's absolute path for backward compatibility
			this.results.push(new OErrorFileNoOwner(pathToScan));
		} else if (owner === MATCH_BASELINE) {
			log.debug(chalk.grey("[✓]"), pathToScan, "is in the baseline");
		} else {
			log.debug(chalk.green("[✓]"), pathToScan, "owner:", chalk.blue(owner));
		}

		// @TODO
		// If config ask to stop as soon as an error is found
		// if (errors.length && config.stopFirstError) {
		// 	break;
		// }

		this.running.delete(pathToScan);
		this.ping();
	}

	async processDir(pathToScan: string) {
		this.nbDir++;
		log.debug("Dir tested:", pathToScan);
		try {
			const dirEntries = await fs.promises.readdir(pathToScan);

			for (const dirEntry of dirEntries) {
				const fullPath = path.join(pathToScan, dirEntry);
				this.add(fullPath);
			}
		} catch (err) {
			log.error("Error reading directory:", pathToScan, err);
		} finally {
			this.running.delete(pathToScan);
			this.ping();
		}
	}
}
