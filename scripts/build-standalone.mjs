import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { build } from 'vite';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const entry = path.join(projectRoot, 'src/main.js');
const result = await build({
  configFile: false,
  root: projectRoot,
  base: './',
  publicDir: false,
  logLevel: 'warn',
  build: {
    write: false,
    target: 'es2022',
    cssCodeSplit: false,
    lib: { entry, name: 'CulturalPassport', formats: ['iife'] },
  },
});

const output = (Array.isArray(result) ? result : [result]).flatMap((item) => item.output);
const scripts = output.filter((item) => item.type === 'chunk');
const styles = output.filter((item) => item.type === 'asset' && item.fileName.endsWith('.css'));
assert.equal(scripts.length, 1, 'The offline build must contain one script.');
assert.equal(styles.length, 1, 'The offline build must contain one stylesheet.');
assert.equal(output.length, 2, 'Offline images must be inlined, not emitted as separate files.');

let html = await fs.readFile(path.join(projectRoot, 'index.html'), 'utf8');
const moduleEntry = /<script\b[^>]*\bsrc=["']\/src\/main\.js["'][^>]*>\s*<\/script>/g;
assert.equal([...html.matchAll(moduleEntry)].length, 1, 'Cannot locate the application entry.');
html = html.replace(moduleEntry, '');
html = html.replace(
  '</head>',
  `<style>${String(styles[0].source).replaceAll('</style', '<\\/style')}</style>\n</head>`,
);
html = html.replace(
  '</body>',
  `<script>${scripts[0].code.replaceAll('</script', '<\\/script')}</script>\n</body>`,
);

const directory = path.join(projectRoot, 'dist/standalone');
await fs.mkdir(directory, { recursive: true });
const destination = path.join(directory, '旅行护照.html');
await fs.writeFile(destination, html, 'utf8');
console.log(`Standalone HTML: ${destination}`);
