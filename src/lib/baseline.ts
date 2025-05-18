import type { Config } from "./configuration.ts";
import { dump as YamlDump, load as YamlLoad } from "js-yaml";
import * as fs from "node:fs";

export function initialize(config: Config) {
	const todoFile = config.pathBaseline;
	if (!fs.existsSync(todoFile)) {
		return new Baseline({});
	}
	const todoFileContent = fs.readFileSync(todoFile, "utf8");
	const todos = YamlLoad(todoFileContent);
	// @ts-expect-error
	return new Baseline(todos);
}

export function write(config: Config, baseline: Baseline) {
	if (!baseline.hasChanged) {
		return;
	}
	const todoFile = config.pathBaseline;
	fs.writeFileSync(todoFile, YamlDump(baseline.toJSON()));
}

export class Baseline {
	readonly version: number;
	private readonly files: Set<string>;
	private changed: boolean;

	constructor(json: { version?: number; files?: string[] } = {}) {
		this.version = json.version || 1;
		this.files = new Set([]);
		for (const file of json.files || []) {
			this.add(file);
		}
		this.changed = false;
	}

	add(file: string) {
		if (!file.startsWith("./")) {
			file = "./" + file;
		}
		this.files.add(file);
		this.changed = true;
	}

	remove(file: string) {
		this.files.delete(file);
		this.changed = true;
	}

	check(file: string) {
		return this.files.has(file);
	}

	get hasChanged(): boolean {
		return this.changed;
	}

	toJSON(): string {
		return JSON.stringify(this, null, 2);
	}
}
