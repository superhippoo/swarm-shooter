import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const env = { ...process.env, PLAYWRIGHT_BROWSERS_PATH: '0' };
const localLibraries = resolve(root, 'artifacts/browser-libs/usr/lib/x86_64-linux-gnu');
const localFontConfig = resolve(root, 'artifacts/fontconfig.xml');

if (existsSync(localLibraries)) {
  env.LD_LIBRARY_PATH = [localLibraries, process.env.LD_LIBRARY_PATH].filter(Boolean).join(':');
}

if (existsSync(localFontConfig)) {
  env.FONTCONFIG_FILE = localFontConfig;
}

const cli = resolve(root, 'node_modules/playwright/cli.js');
const child = spawn(process.execPath, [cli, 'test', ...process.argv.slice(2)], {
  cwd: root,
  env,
  stdio: 'inherit',
});

child.on('error', (error) => {
  console.error(error);
  process.exitCode = 1;
});

child.on('exit', (code, signal) => {
  process.exitCode = code ?? (signal ? 1 : 0);
});
