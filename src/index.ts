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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

yargs(hideBin(process.argv))
  .command(checkCmd)
  .command(generateCmd)
  .command("version", "Show version information", () => {
    const packageJsonPath = path.resolve(__dirname, "./package.json");
    try {
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
      console.log(pkg.version);
    } catch (error) {
      console.error(
        chalk.red(`Error reading package.json from ${packageJsonPath}:`),
        error,
      );
      console.error(
        chalk.yellow(
          "Please ensure package.json exists at the project root and the script is run correctly.",
        ),
      );
      process.exit(1);
    }
  })
  .demandCommand(1, "You need at least one command before moving on")
  .help().argv;
