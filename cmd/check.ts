import * as fs from "node:fs";
import chalk from 'chalk';
import type { Arguments, Argv } from 'yargs';
import { parseConfig } from "../configuration.ts";
import type { Config } from "../configuration.ts";
import { fileURLToPath } from 'node:url';
import * as path from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface CheckOptions {
  config: string;
  path?: string;
  debug: boolean;
  verbose: boolean;
}

export const command = 'check';
export const describe = 'Check files for ownership';

export const builder = (yargs: Argv) => {
  return yargs
    .option('config', {
      alias: 'c',
      describe: 'Path to the config file',
      type: 'string',
      demandOption: false, // Assuming default is handled by parseConfig or main logic
      default: './config.yaml'
    })
    .option('path', {
      alias: 'p',
      describe: 'Path to the folders/files to process',
      type: 'string',
      demandOption: false, // Path might be optional if config provides a default
    })
    .option('debug', {
      alias: 'd',
      describe: 'Debug mode',
      type: 'boolean',
      default: false
    })
    .option('verbose', {
      alias: 'v',
      describe: 'Verbose mode (alias for debug)',
      type: 'boolean',
      default: false
    });
};

export const handler = (argv: Arguments<CheckOptions>) => {
  console.log("Script arguments (parsed by yargs for check command):");
  console.log(argv);

  // parseConfig will use argv.config and potentially argv.path if provided
  const config = parseConfig(argv);
  const regexps = assembleAllRegExp(config);

  // Ensure path is available, either from argv or config
  const analysisPath = argv.path || config.configuration.path;
  if (!analysisPath) {
    console.error(chalk.red("Error: Path to analyze is not specified either via --path or in the config file."));
    process.exit(1);
  }

  config.configuration.path = analysisPath; // Ensure config object has the definitive path

  if (fs.statSync(analysisPath).isDirectory()) {
    checkAllFiles(config, regexps);
  } else {
    checkFile(config, regexps);
  }
};

type RegExpMap = {[team:string]: RegExp};

function assembleAllRegExp(config: Config): RegExpMap {
  const allRegExp: RegExpMap = {};
  for (const feature of Object.values(config.features)) {
    // Ensure feature.files is an array and join it
    const pattern = Array.isArray(feature.files) ? feature.files.join("|") : feature.files;
    if (pattern) { // Only create RegExp if pattern is not empty
        const featureRegExp = new RegExp(pattern);
        allRegExp[feature.owner] = featureRegExp;
    } else {
        console.warn(chalk.yellow(`Warning: No file patterns defined for feature owned by ${feature.owner}`));
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

function checkAllFiles(config:Config, regexps: RegExpMap) {
  const pathToAnalyze = config.configuration.path; // No need to add '/' if path is already correct
  // Ensure trailing slash for directory path when reading
  const dirPath = pathToAnalyze.endsWith('/') ? pathToAnalyze : pathToAnalyze + '/';

  // readdirSync with recursive option might not be standard on all Node versions or fs-extra.
  // Sticking to a simple readdirSync for one level or consider a library like glob for deep traversal.
  // For simplicity, assuming fs.readdirSync can handle recursive or we adapt.
  // Let's assume for now it's a flat directory scan or a single file,
  // or that `config.configuration.path` is specific enough.
  // If recursive is needed and supported by your Node/fs setup:
  let files: string[] = [];
  try {
    files = fs.readdirSync(dirPath, { recursive: true }) as string[]; // Cast if necessary, ensure your Node version supports recursive
  } catch (err) {
      console.error(chalk.red(`Error reading directory ${dirPath}:`), err);
      if (config.configuration.stopFirstError) {
          process.exit(1);
      }
      return;
  }


  files.forEach(file => {
    // readdirSync with recursive: true returns paths relative to dirPath
    const fullFilePath = dirPath + file;
    const owner = findOwner(regexps, file); // Match against relative path `file`

    if (owner === null) {
      console.error( chalk.red("[X]"), fullFilePath, "has no owner");
      if (config.configuration.stopFirstError) {
        process.exit(1);
      }
    }
    else {
      console.log(chalk.green("[✓]") , fullFilePath, "owner:", chalk.blue(owner));
    }
  });
}

function checkFile(config:Config, regexps: RegExpMap) {
  const filePath = config.configuration.path;
  const owner = findOwner(regexps, filePath); // Match against the path itself
  if (owner === null) {
    console.error( chalk.red("[X]"), filePath, "has no owner");
    // Consider if process.exit(1) is always desired here, or configurable like in checkAllFiles
    if (config.configuration.stopFirstError !== false) { // Default to true if undefined
        process.exit(1);
    }
  } else {
    console.log(chalk.green("[✓]") , filePath, "owner:", chalk.blue(owner));
  }
}