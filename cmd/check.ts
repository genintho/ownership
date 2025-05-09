import * as fs from "node:fs";
import chalk from "chalk";
import type { Arguments, Argv } from "yargs";
import { parseConfig } from "../lib/configuration.ts";
import type { Config } from "../lib/configuration.ts";
import { fileURLToPath } from "node:url";
import * as path from "node:path";
import * as Todos from "../lib/todos.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface CheckOptions {
  config: string;
  path?: string;
  debug: boolean;
  verbose: boolean;
}

export const command = "check";
export const describe = "Check files for ownership";

export const builder = (yargs: Argv) => {
  return yargs
    .option("config", {
      alias: "c",
      describe: "Path to the config file",
      type: "string",
      demandOption: false, // Assuming default is handled by parseConfig or main logic
      default: "./config.yaml",
    })
    .option("path", {
      alias: "p",
      describe: "Path to the folders/files to process",
      type: "string",
      demandOption: true,
    })
    .option("path-todo", {
      alias: "t",
      describe: "Path to the todo file",
      type: "string",
      demandOption: false,
      default: "./.owner-todo.yaml",
    })
    .option("update-todo", {
      alias: "u",
      describe: "Update the todo file",
      type: "boolean",
      default: false,
    })
    .option("debug", {
      alias: "d",
      describe: "Debug mode",
      type: "boolean",
      default: false,
    })
    .option("quiet", {
      alias: "q",
      describe: "Quiet mode",
      type: "boolean",
      default: false,
    });
};

export const handler = (argv: Arguments<CheckOptions>) => {
  // parseConfig will use argv.config and potentially argv.path if provided
  const config = parseConfig(argv);
  const regexps = assembleAllRegExp(config);
  const todos = Todos.read(config);

  // Ensure path is available, either from argv or config
  const analysisPath = argv.path || config.configuration.path;
  if (!analysisPath) {
    console.error(
      chalk.red(
        "Error: Path to analyze is not specified either via --path or in the config file.",
      ),
    );
    process.exit(1);
  }

  config.configuration.path = analysisPath; // Ensure config object has the definitive path

  if (fs.statSync(analysisPath).isDirectory()) {
    checkAllFiles(config, regexps);
  } else {
    checkFile(config, regexps);
  }

  // if (config.configuration.updateTodo) {
    // Todos.write(config, todos);
  // }
};

type RegExpMap = { [team: string]: RegExp };

function assembleAllRegExp(config: Config): RegExpMap {
  const allRegExp: RegExpMap = {};
  for (const feature of Object.values(config.features)) {
    // Ensure feature.files is an array and join it
    const pattern = Array.isArray(feature.files)
      ? feature.files.join("|")
      : feature.files;
    if (pattern) {
      // Only create RegExp if pattern is not empty
      const featureRegExp = new RegExp(pattern);
      allRegExp[feature.owner] = featureRegExp;
    } else {
      console.warn(
        chalk.yellow(
          `Warning: No file patterns defined for feature owned by ${feature.owner}`,
        ),
      );
    }
  }
  return allRegExp;
}

function findOwner(regexps: RegExpMap, file: string): string | null {
  for (const [team, regexp] of Object.entries(regexps)) {
    if (regexp.test(file)) {
      return team;
    }
  }
  return null;
}

function checkAllFiles(config: Config, regexps: RegExpMap) {
  const pathToAnalyze = config.configuration.path; // No need to add '/' if path is already correct
  // Ensure trailing slash for directory path when reading
  const dirPath = pathToAnalyze.endsWith("/")
    ? pathToAnalyze
    : pathToAnalyze + "/";

  let files = fs.readdirSync(dirPath, { recursive: true }) as string[];

  files.forEach((file) => {
    const fullFilePath = dirPath + file;
    const owner = findOwner(regexps, file);

    if (owner === null) {
      console.error(chalk.red("[X]"), fullFilePath, "has no owner");
      if (config.configuration.stopFirstError) {
        process.exit(1);
      }
    } else {
      console.log(
        chalk.green("[✓]"),
        fullFilePath,
        "owner:",
        chalk.blue(owner),
      );
    }
  });
}

function checkFile(config: Config, regexps: RegExpMap) {
  const filePath = config.configuration.path;
  const owner = findOwner(regexps, filePath);
  if (owner === null) {
    console.error(chalk.red("[X]"), filePath, "has no owner");
    if (config.configuration.stopFirstError !== false) {
      process.exit(1);
    }
  } else {
    console.log(chalk.green("[✓]"), filePath, "owner:", chalk.blue(owner));
  }
}
