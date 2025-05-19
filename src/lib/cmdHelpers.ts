// @ts-expect-error
import type { Arguments, Argv } from "yargs";
import { parseConfig } from "./configuration.ts";
import chalk from "chalk";
import { OError } from "./errors.ts";

export function defaultHandler<T>(cb: (argv: Arguments<T>) => void) {
	return (argv: Arguments<any>) => {
		try {
			cb(argv);
		} catch (e) {
			if (e instanceof OError) {
				console.error(chalk.red(e.message()));
				process.exit(1);
			}
			throw e;
		}
	};
}

export function defaultOptions(yargs: Argv) {
	return yargs
		.option("debug", {
			describe: "Debug mode",
			type: "boolean",
		})
		.option("quiet", {
			describe: "Quiet mode",
			type: "boolean",
		});
}

export function configOptions(yargs: Argv) {
	let ret = yargs
		.positional("path", {
			describe: "Path to the folders/files to process",
			type: "string",
		})
		.option("config", {
			describe: "Path to the config file",
			type: "string",
			demandOption: false,
		})
		.option("path-baseline", {
			describe: "Path to the todo file",
			type: "string",
			demandOption: false,
			default: "./.owner-baseline.yaml",
		});
	return defaultOptions(ret);
}
