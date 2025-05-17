import * as fs from "node:fs";
import { fileURLToPath } from "node:url";
import * as path from "node:path";
import { dump as YamlDump } from "js-yaml";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// @ts-expect-error
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
export const builder = (yargs: Argv) => {
	return yargs
		.option("config", {
			describe: "Path the location we want to create the config file",
			type: "string",
			demandOption: false,
			default: "./config.yaml",
		})
		.option("update", {
			describe: "Update the configuration by adding all missing options, using the default values",
			demandOption: false,
			type: "bool",
		});
};

// Handler function for the command
export const handler = (argv: Arguments /* <GenerateOptions> */) => {
	console.log(chalk.greenBright("Create a default configuration!"));

	if (fs.existsSync(argv.config) && !argv.update) {
		console.log(chalk.yellowBright("A configuration already exists"));
		return;
	}

	fs.writeFileSync(argv.config, "{}");

	const config = parseConfig(argv);
	fs.writeFileSync(argv.config, YamlDump(config));
	console.log(chalk.green("Done"));
};
