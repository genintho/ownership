import * as fs from "node:fs";
import * as path from "path";
import type { Config } from "./configuration.ts";
import { log } from "./log.ts";
import chalk from "chalk";

/**
 * Recursively computes the list of file paths to test based on the provided config.
 * Returns an array of absolute file paths.
 */
export function computePathToTest(config: Config): string[] {
	log.debug("Compute the list of file paths to test");
	log.debug("config.path", config.path);
	log.debug("config.pathAbs", config.pathAbs);

	if (fs.statSync(config.path).isDirectory()) {
		log.debug("config.path is a directory, recursively crawl");
		let files = fs
			.readdirSync(config.pathAbs, { recursive: true, withFileTypes: true })
			.filter((file) => file.isFile())
			.map((file) => path.join(file.path, file.name))
			.filter((filePath) => {
				for (const exclude of config.exclude) {
					if (exclude.test(filePath)) {
						log.debug(chalk.grey("[✓]"), filePath, "is excluded");
						return false;
					}
				}
				return true;
			});
		return files;
	}

	log.debug("config.path is a file, return the path to test");
	return [config.pathAbs];
}
