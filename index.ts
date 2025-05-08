import * as fs from "node:fs";
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import chalk from 'chalk';
import { parseConfig} from "./configuration.ts";
import type { Config} from "./configuration.ts";

const argv = yargs(hideBin(process.argv))
.option('config', {
  alias: 'c',
  describe: 'Path to the config file',
  type: 'string',
  demandOption: false,
  default: './config.yaml'
})
.option('path', {
  alias: 'p',
  describe: 'Path to the folders/files to process',
  type: 'string',
  demandOption: false,
})
.option('debug', {
  alias: 'd',
  describe: 'Debug mode',
  type: 'boolean',
  demandOption: false,
  default: false
})
.option('verbose', {
  alias: 'v',
  describe: 'Verbose mode (alias for debug)',
  type: 'boolean',
  demandOption: false,
  default: false
})

.help().argv;

console.log("Script arguments (parsed by yargs):");
console.log(argv);


const config = parseConfig(argv);
const regexps = assembleAllRegExp(config);

// if pathToAnalyze is a directory, check all files in it
if (fs.statSync(config.configuration.path).isDirectory()) {
  checkAllFiles(config, regexps);
}
else {
  checkFile(config, regexps);
}

type RegExpMap = {[team:string]: RegExp};
function assembleAllRegExp(config: Config): RegExpMap {
  const allRegExp: RegExpMap = {};
  for (const feature of Object.values(config.features)) {
    const featureRegExp = new RegExp(feature.files.join("|") );
    allRegExp[feature.owner] = featureRegExp;
  }
  return allRegExp;
}


function checkAllFiles(config:Config, regexps: RegExpMap) {
  const pathToAnalyze = config.configuration.path + '/';
  const files = fs.readdirSync(pathToAnalyze, { recursive: true });

  files.forEach(file => {
    const owner = findOwner(regexps, file);

    if (owner === null) {
      console.error( chalk.red("[X]"), pathToAnalyze+file, "has no owner");
      if (config.configuration.stopFirstError) {
        process.exit(1);
      }
    }
    else {
      console.log(chalk.green("[✓]") , pathToAnalyze+file, "owner:", chalk.blue(owner));
    }
  });
}

function checkFile(config:Config, regexps: RegExpMap) {
  const owner = findOwner(regexps, config.configuration.path);
  if (owner === null) {
    console.error( chalk.red("[X]"), config.configuration.path, "has no owner");
    process.exit(1);
  } else {
    console.log(chalk.green("[✓]") , config.configuration.path, "owner:", chalk.blue(owner));
  }
}

function findOwner(regexps: RegExpMap, file: string): string | null {
  for (const [team, regexp] of Object.entries(regexps)) {
    if (regexp.test(file)) {
      return team;
    }
  }
  return null;
}
