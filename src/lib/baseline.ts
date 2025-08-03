import type { Configuration } from "./configuration.ts";
import { dump as YamlDump, load as YamlLoad } from "js-yaml";
import * as fs from "node:fs";

export function initialize(config: Configuration) {
	const todoFile = config.pathToBaseline;
	if (!fs.existsSync(todoFile)) {
		return new Baseline({});
	}
	const todoFileContent = fs.readFileSync(todoFile, "utf8");
	const todos = YamlLoad(todoFileContent);
	// @ts-expect-error
	return new Baseline(todos);
}

export function saveBaseline(config: Configuration, baseline: Baseline) {
	const todoFile = config.pathToBaseline;
	fs.writeFileSync(todoFile, YamlDump(baseline.toJSON(), { sortKeys: true, lineWidth: -1 }));
}

export class Baseline {
	readonly version: number;
	private readonly existingFileRecords: Set<string>;
	public readonly filesToAdd: Set<string> = new Set();
	private readonly filesToKeep: Set<string> = new Set();
	constructor(json: { version?: number; files?: string[] } = {}) {
		this.version = json.version || 1;
		this.existingFileRecords = new Set(json.files || []);
	}

	check(file: string) {
		const relativeFile = file;
		if (this.existingFileRecords.has(relativeFile)) {
			this.filesToKeep.add(relativeFile);
			return true;
		}
		this.filesToAdd.add(relativeFile);
		return false;
	}

	get unneededFileRecord(): string[] {
		return [...this.existingFileRecords.difference(this.filesToKeep)];
	}

	toJSON(): object {
		const files = [...this.filesToKeep, ...this.filesToAdd];
		files.sort();
		return {
			version: this.version,
			files,
		};
	}
}
