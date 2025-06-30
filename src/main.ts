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
	.help().argv;
