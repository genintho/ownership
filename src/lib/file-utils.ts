import * as fs from "node:fs";
import * as path from "path";
import type { Config } from "./configuration.ts";

/**
 * Recursively computes the list of file paths to test based on the provided config.
 * Returns an array of absolute file paths.
 */
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
