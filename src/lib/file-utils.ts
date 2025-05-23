import * as fs from "node:fs";
import type { Config } from "./configuration.ts";
import { log } from "./log.ts";
import * as path from "node:path";

class Queue {
	private next: Set<string> = new Set();
	private running: Set<string> = new Set();
	private concurrency: number = 2;
	private onFinish: (files: string[]) => void;
	private exclude: RegExp[] = [];

	private results: string[] = [];

	constructor({
		concurrency = 2,
		exclude = [],
		onFinish,
	}: {
		concurrency: number;
		exclude: RegExp[];
		onFinish: (files: string[]) => void;
	}) {
		this.concurrency = concurrency;
		this.exclude = exclude;
		this.onFinish = onFinish;
	}

	add(path: string) {
		this.next.add(path);
		this.ping();
	}

	ping() {
		if (this.running.size >= this.concurrency) {
			return;
		}

		if (this.next.size === 0 && this.running.size === 0) {
			this.onFinish(this.results);
			return;
		}

		const path = this.next.values().next().value;
		if (path) {
			this.readdir(path);
		}
	}

	readdir(dirToScan: string) {
		this.running.add(dirToScan);
		this.next.delete(dirToScan);
		fs.readdir(dirToScan, { withFileTypes: true }, (err, dirEntries) => {
			if (err) {
				throw err;
			} else if (dirEntries === null) {
				log.error("readdir null", dirToScan);
			} else {
				for (const dirEntry of dirEntries) {
					const fullPath = path.join(dirToScan, dirEntry.name);
					if (
						this.exclude.some((exclude) => {
							return exclude.test(fullPath);
						})
					) {
						log.debug("exclude", fullPath);
						continue;
					} else if (dirEntry.isDirectory()) {
						this.add(fullPath);
					} else {
						this.results.push(fullPath);
					}
				}
			}
			this.running.delete(dirToScan);
			this.ping();
		});
	}
}

/**
 * Recursively computes the list of file paths to test based on the provided config.
 * Returns an array of absolute file paths.
 */
export async function computePathToTest(config: Config): Promise<string[]> {
	return new Promise((resolve) => {
		log.time("computePathToTest");
		log.debug("Compute the list of file paths to test");
		log.debug("config.path", config.path);
		log.debug("config.pathAbs", config.pathAbs);

		if (fs.statSync(config.pathAbs).isDirectory()) {
			log.debug("config.path is a directory, recursively crawl");
			const queue = new Queue({
				concurrency: 2,
				exclude: config.exclude,
				onFinish: (files: string[]) => {
					resolve(files);
					log.timeEnd("computePathToTest");
				},
			});
			queue.add(config.pathAbs);
			return;
		}

		log.debug("config.path is a file, return the path to test");
		log.timeEnd("computePathToTest");
		resolve([config.pathAbs]);
	});
}
