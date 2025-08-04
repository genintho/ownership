import { findOwner as fo, type OwnerResult } from "./lib/scanner.ts";
import { config, type ConfigurationOptions } from "./lib/configuration.js";
import { initialize as initializeBaseline } from "./lib/baseline.js";
import { Rules } from "./lib/rules.js";

export type { OwnerResult, ConfigurationOptions };

export function findOwners(
	pathToScan: string[],
	options: ConfigurationOptions & Omit<ConfigurationOptions, "pathsToScan">,
): Record<string, OwnerResult> {
	const c = config(options);
	const baseline = initializeBaseline(c);
	const rules = new Rules(c.features);

	const results: Record<string, OwnerResult> = {};
	for (const p of pathToScan) {
		results[p] = fo(rules, baseline, p);
	}

	return results;
}
