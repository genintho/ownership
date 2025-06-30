import type { Arguments, Argv } from "yargs";
import chalk from "chalk";
import { OError } from "./errors.ts";
import { log } from "./log.ts";
export function defaultHandler<T>(cb: (argv: Arguments<T>) => Promise<number>) {
	return async (argv: Arguments<any>) => {
		let returnCode = 1;
		log.time("Total");
		try {
			returnCode = await cb(argv);
		} catch (e) {
			if (e instanceof OError) {
				console.error(chalk.red(e.message()));
				process.exit(1);
			}
			console.error(chalk.red(e));
			console.log(e);
			process.exit(1);
		}
		const duration = log.timeEnd("Total", false);
		log.info("Done", chalk.grey(`in ${duration}ms`));
		process.exit(returnCode);
	};
}

export function defaultOptions(yargs: Argv) {
	return yargs
		.option("debug", {
			describe: "Debug mode",
		})
		.option("quiet", {
			describe: "Quiet mode",
		});
}

export function configOptions(yargs: Argv) {
	let ret = yargs
		.positional("paths", {
			describe: "Path to the folders/files to process (supports multiple paths)",
			type: "string",
			array: true,
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
