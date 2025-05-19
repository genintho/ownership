import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
// @ts-expect-error
import yargs from "yargs";
// @ts-expect-error
import { hideBin } from "yargs/helpers";
import chalk from "chalk";
import * as generateCmd from "./cmd/generate.ts";
import * as checkCmd from "./cmd/check.ts";
import * as initCmd from "./cmd/init.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

yargs(hideBin(process.argv))
	.command(initCmd)
	.command(checkCmd)
	.command(generateCmd)
	.demandCommand(1, "You need at least one command before moving on")
	.help().argv;
