#!/usr/bin/env node

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import * as checkCmd from "./cmd/check.ts";
import * as initCmd from "./cmd/init.ts";
import * as auditCmd from "./cmd/audit.ts";

yargs(hideBin(process.argv))
	.command(initCmd)
	.command(checkCmd)
	.command(auditCmd)
	.demandCommand(1, "You need at least one command before moving on")
	.fail((msg, err, _yargs) => {
		if (err) throw err; // preserve stack
		console.error("Error:", msg);
		console.error("Use --help to see available commands");
		process.exit(1);
	})
	.help().argv;
