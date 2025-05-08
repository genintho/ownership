import * as fs from "node:fs";
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import yaml from 'js-yaml';

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
  default: '.'
})
.help().argv;

console.log("Script arguments (parsed by yargs):");
console.log(argv);

if (argv.myOption) {
  console.log("myOption was provided:", argv.myOption);
}

type Config = {
  configuration?: {
    path: string;
    stopFirstError: boolean;
  };
  teams?: {
    name: string;
    features: string[];
  }[];
  features?: {
    [key: string]: {
      description: string;
      files: string[];
    };
  };
}

let configData: Config = {};
try {
  const configFile = fs.readFileSync(argv.config, 'utf8');
  configData = yaml.load(configFile);
  console.log("\nConfiguration data from", argv.config + ":");
  console.log(configData);
} catch (e) {
  console.error("\nError loading or parsing config file:", argv.config);
  console.error(e.message);
}

const regexps = assembleAllRegExp(configData);
const files = fs.readdirSync(argv.path, { recursive: true });

files.forEach(file => {
  const regexp = regexps.find(regexp => regexp.test(file));
  if (!regexp) {
    console.error(file, "has no owner");
    if (configData.configuration?.stopFirstError) {
      process.exit(1);
    }
  }
  else {
    console.log(file, "has owner");
  }
});


function assembleAllRegExp(config: Config): RegExp[] {
  const allRegExp: RegExp[] = [];
  for (const feature of Object.values(config.features)) {
    const featureRegExp = new RegExp(feature.files.join("|") );
    allRegExp.push(featureRegExp);
  }
  return allRegExp;
}