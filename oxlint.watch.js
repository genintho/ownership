import { readdirSync, watch } from 'fs';
import { join } from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const watchDir = './';
const debounceDelay = 100;
const watchedFiles = new Set();

function runLinter() {
  const lintProcess = spawn('yarn', ["oxlint", "."], {
    stdio: 'inherit',
    env: { ...process.env, FORCE_COLOR: '1' }, // ensures color output
  });

  lintProcess.on('error', (err) => {
    console.error(`Failed to start oxlint: ${err}`);
  });
}

function watchRecursive(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules') continue;
      watchRecursive(fullPath);
    } else if (entry.name.endsWith('.ts')) {
      if (watchedFiles.has(fullPath)) continue;

      watchedFiles.add(fullPath);
      let timeout;
      watch(fullPath, () => {
        clearTimeout(timeout);
        timeout = setTimeout(() => runLinter(fullPath), debounceDelay);
      });
    }
  }
}

watchRecursive(join(__dirname, watchDir));
console.log('Watching for JS file changes...');