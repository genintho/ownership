// @ts-expect-error
import yargs from "yargs";
// @ts-expect-error
import { hideBin } from "yargs/helpers";
import * as generateCmd from "./cmd/generate.ts";
import * as checkCmd from "./cmd/check.ts";
import * as initCmd from "./cmd/init.ts";

yargs(hideBin(process.argv))
	.command(initCmd)
	.command(checkCmd)
	.command(generateCmd)
	.demandCommand(1, "You need at least one command before moving on")
	.help().argv;
