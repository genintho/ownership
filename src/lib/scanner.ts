import chalk from "chalk";
import * as fs from "node:fs";
import * as path from "node:path";
import type { Config } from "./configuration.ts";
import { Rules } from "./rules.ts";
import type { Baseline } from "./baseline.ts";
import { log } from "./log.ts";
import { type OError, OErrorFileNoOwner } from "./errors.ts";
import { initialize as initializeBaseline } from "./baseline.ts";
export const MATCH_BASELINE = Symbol("MATCH_BASELINE");

export type ScanResult = {
	errors: OError[];
	nbFileTested: number;
	nbDir: number;
	rules: Rules;
	baseline: Baseline;
};

const COMMON_IGNORED_FILES = new Set<string>([".env", ".DS_Store"]);

export async function scan(config: Config): Promise<ScanResult> {
	return new Promise((resolve) => {
		log.time("scan");
		const baseline = initializeBaseline(config);
		const rules = new Rules(config.features);
		const queue = new Queue({
			concurrency: 10,
			exclude: config.exclude,
			ownerRules: rules,
			baseline,
			onFinish: (errors: OError[], nbFiles, nbDir) => {
				log.timeEnd("scan");
				resolve({ errors, nbFileTested: nbFiles, nbDir, rules, baseline });
			},
		});
		for (const pathInfo of config.paths) {
			log.debug("Processing provided path:", pathInfo);
			queue.add(pathInfo);
		}
	});
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
	private ownerRules: Rules;
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
		ownerRules: Rules;
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
		this.ping(null);
	}

	ping(runningPathToDelete: string | null = null) {
		if (runningPathToDelete !== null) {
			this.running.delete(runningPathToDelete);
		}

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
		if (isCommonIgnoredFile(pathToScan)) {
			this.ping(pathToScan);
			return;
		}

		this.nbFileTested++;

		const owner = findOwner(this.ownerRules, this.baseline, pathToScan);

		if (owner === null) {
			log.debug(chalk.red("[X]"), pathToScan, "has no owner");
			// Use the first path's absolute path for backward compatibility
			this.results.push(new OErrorFileNoOwner(pathToScan));
		} else if (owner === MATCH_BASELINE) {
			log.debug(chalk.grey("[✓]"), "File:", pathToScan, "is in the baseline");
		} else {
			log.debug(chalk.green("[✓]"), "File:", pathToScan, "owner:", chalk.blue(owner));
		}

		this.ping(pathToScan);
	}

	async processDir(pathToScan: string) {
		this.nbDir++;
		log.debug("Dir tested:", pathToScan);

		const owner = this.ownerRules.testDir(pathToScan);
		if (owner !== null) {
			log.debug(chalk.green("[✓]"), "Dir:", pathToScan, "owner:", chalk.blue(owner));
			this.ping(pathToScan);
			return;
		}
		try {
			const dirEntries = await fs.promises.readdir(pathToScan);

			for (const dirEntry of dirEntries) {
				const fullPath = path.join(pathToScan, dirEntry);
				this.add(fullPath);
			}
		} catch (err) {
			log.error("Error reading directory:", pathToScan, err);
		} finally {
			this.ping(pathToScan);
		}
	}
}

export function isCommonIgnoredFile(file: string): boolean {
	const basename = path.basename(file);
	return COMMON_IGNORED_FILES.has(basename);
}

export function findOwner(regexps: Rules, baseline: Baseline, file: string): string | null | typeof MATCH_BASELINE {
	if (baseline.check(file)) {
		return MATCH_BASELINE;
	}

	const owner = regexps.testPath(file);
	if (owner) {
		return owner;
	}

	return null;
}
