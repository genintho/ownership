import * as fs from "node:fs";
import yaml from 'js-yaml';

export interface Config {
  configuration: {
    path: string;
    stopFirstError: boolean;
    debug: boolean;
  };
  teams: {
    name: string;
  }[];
  features: {
    [key: string]: {
      description: string;
      owner: string;
      files: string[];
    };
  };
}

export function parseConfig(argv:{config:string, path:string, debug:boolean}): Config {
  // @ts-expect-error
  let configData: Config = {};
  try {
    const configFile = fs.readFileSync(argv.config, 'utf8');
    configData = yaml.load(configFile);

  } catch (e) {
    console.error("\nError loading or parsing config file:", argv.config);
    console.error(e.message);
    process.exit(1);
  }
  configData = configData || {};
  configData.configuration = configData.configuration || {};

  // DEBUG
  configData.configuration.debug = argv.debug || configData.configuration.debug || false;

  if (configData.configuration.debug) {
    console.debug("\nConfiguration data from", argv.config + ":");
    console.debug(configData);
  }

  let pathToAnalyze = argv.path || configData.configuration?.path || "./";
  if (pathToAnalyze.endsWith("/")) {
    pathToAnalyze = pathToAnalyze.slice(0, -1);
  }

  configData.configuration.path = pathToAnalyze;
  configData.configuration.stopFirstError = configData.configuration.stopFirstError || false;

  if (configData.configuration.debug) {
    console.debug("\nFinal Configuration:");
    console.debug(configData);
  }
  return configData;
}