import * as fs from "node:fs";
import { fileURLToPath } from "node:url";
import * as path from "node:path";
import { dump as YamlDump } from "js-yaml";
import { log } from "../lib/log.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import type { Arguments, Argv } from "yargs";
import chalk from "chalk";
import { parseConfig } from "../lib/configuration.ts";

// Define the type for the arguments of the generate command if it has specific options
// export interface GenerateOptions {
//   // exampleOption: string;
// }

export const command = "init";
export const describe = "Create a basic default configuration";

// Builder function for yargs, to define command-specific options
/* v8 ignore start */
export const builder = (yargs: Argv) => {
	return (
		yargs
			.option("config", {
				describe: "Path the location we want to create the config file",
				type: "string",
				demandOption: false,
				default: "./config.yaml",
			})
			// @ts-expect-error
			.option("update", {
				describe: "Update the configuration by adding all missing options, using the default values",
				demandOption: false,
				type: "bool",
			})
	);
};
/* v8 ignore stop */

// Handler function for the command
export const handler = (argv: Arguments /* <GenerateOptions> */) => {
	log.info(chalk.greenBright("Create a default configuration!"));

	// @ts-expect-error
	if (fs.existsSync(argv.config) && !argv.update) {
		log.info(chalk.yellowBright("A configuration already exists"));
		return;
	}

	// @ts-expect-error
	fs.writeFileSync(argv.config, "{}");

	// @ts-expect-error
	const config = parseConfig(argv);
	// @ts-expect-error
	fs.writeFileSync(argv.config, YamlDump(config));
	log.info(chalk.green("Done"));
};
