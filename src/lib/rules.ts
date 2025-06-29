import { minimatch } from "minimatch";
import { log } from "../lib/log.ts";

export class Rules {
	private readonly dirRules: { [team: string]: RegExp[] } = {};
	private readonly fileRules: { [team: string]: Set<string> } = {};
	private readonly otherRules: { [team: string]: RegExp[] } = {};

	public constructor(ruleFromConfig: {
		[key: string]: {
			files: string[];
			owner: string;
		};
	}) {
		const ownerlessFeatures = [];
		for (const [featureName, feature] of Object.entries(ruleFromConfig)) {
			if (!feature.owner) {
				ownerlessFeatures.push(featureName);
				continue;
			}

			for (const filePattern of feature.files) {
				const regex = minimatch.makeRe(filePattern);
				if (!regex) {
					log.warn("Invalid glob pattern", filePattern);
					continue;
				}

				if (isExactFilePattern(filePattern)) {
					if (!this.fileRules[feature.owner]) {
						this.fileRules[feature.owner] = new Set();
					}
					this.fileRules[feature.owner].add(filePattern);
					continue;
				}

				// test if this regex match a directory
				if (isGlobForFolders(filePattern)) {
					if (!this.dirRules[feature.owner]) {
						this.dirRules[feature.owner] = [];
					}
					this.dirRules[feature.owner].push(regex);
					continue;
				}

				if (!this.otherRules[feature.owner]) {
					this.otherRules[feature.owner] = [];
				}
				this.otherRules[feature.owner].push(regex);
			}
		}

		if (ownerlessFeatures.length > 0) {
			log.warn("Invalid configuration.");
			log.warn(`The following features in the configuration file have no owner:`, ownerlessFeatures.join(", "));
			log.warn("Please assign an owner to each feature.");
			// process.exit(1);
		}

		// const allRegExp: OptiRegExpMap = {
		// 	file: {},
		// 	dir: {},
		// 	other: {},
		// };

		// for (const [team, arrReg] of Object.entries(tmp.file)) {
		// 	allRegExp.file[team] = new Set(arrReg);
		// }
		// for (const [team, arrReg] of Object.entries(tmp.dir)) {
		// 	const combinedPattern = arrReg.join("|");
		// 	allRegExp.dir[team] = new RegExp(combinedPattern);
		// }
		// for (const [team, arrReg] of Object.entries(tmp.other)) {
		// 	const combinedPattern = arrReg.join("|");
		// 	allRegExp.other[team] = new RegExp(combinedPattern);
		// }

		// return allRegExp;
		// a
	}

	testDir(dirPath: string): string | null {
		for (const [team, regexps] of Object.entries(this.dirRules)) {
			for (const regexp of regexps) {
				if (regexp.test(dirPath)) {
					return team;
				}
			}
		}
		return null;
	}

	testPath(pathToTest: string): string | null {
		for (const [team, fileSet] of Object.entries(this.fileRules)) {
			if (fileSet.has(pathToTest)) {
				return team;
			}
		}

		for (const [team, regexps] of Object.entries(this.otherRules)) {
			for (const regexp of regexps) {
				if (regexp.test(pathToTest)) {
					return team;
				}
			}
		}
		return null;
	}
}

export function isExactFilePattern(pattern: string): boolean {
	const hasWildcards = /[*?[\]{}]/.test(pattern);

	if (hasWildcards) {
		return false;
	}
	return true;
}

export function isGlobForFolders(globPattern: string): boolean {
	// Remove trailing wildcards and slashes
	let cleanPattern = globPattern.replace(/\/\*+$/, "").replace(/\/$/, "");

	// Split by path separator
	const parts = cleanPattern.split("/");

	// Check file, aka extensions
	// @todo, handle file starting with dot, like .git
	if (parts[parts.length - 1].includes(".")) {
		return false;
	}

	for (const part of parts) {
		//
		const hasSpecialChar = /[?[\]{}]/.test(part);
		if (hasSpecialChar) {
			return false;
		}
	}
	return true;
}
