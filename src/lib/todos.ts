import type { Config } from "./configuration.ts";
import { dump as YamlDump, load as YamlLoad } from "js-yaml";
import * as fs from "node:fs";

export function read(config: Config) {
  const todoFile = config.configuration.pathTodo;
  if (!fs.existsSync(todoFile)) {
    return new Todos({});
  }
  const todoFileContent = fs.readFileSync(todoFile, "utf8");
  const todos = YamlLoad(todoFileContent);
  return new Todos(todos);
}

export function write(config: Config, todos: Todos) {
  if (!todos.hasChanged) {
    return;
  }
  const todoFile = config.configuration.pathTodo;
  fs.writeFileSync(todoFile, YamlDump(todos.toJSON()));
}

export class Todos {
  readonly version: number;
  private readonly files: Set<string>;
  private changed: boolean;

  constructor(json: any) {
    this.version = json.version || 1;
    this.files = new Set(json.files || []);

    this.changed = false;
  }

  add(file: string) {
    this.files.add(file);
    this.changed = true;
  }

  remove(file: string) {
    this.files.delete(file);
    this.changed = true;
  }

  check(file: string) {
    return this.files.has(file);
  }

  get hasChanged(): boolean {
    return this.changed;
  }

  toJSON(): string {
    return JSON.stringify(this, null, 2);
  }
}
