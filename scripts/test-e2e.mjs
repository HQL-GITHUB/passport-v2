import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);

// An in-process server avoids shell process-tree cleanup on Windows.
const server = await createServer({
  root,
  configFile: path.join(root, 'vite.config.js'),
  logLevel: 'warn',
  server: { host: '127.0.0.1', port: 4175, strictPort: true, hmr: false },
});

try {
  await server.listen();
  const runner = spawn(
    process.execPath,
    [require.resolve('@playwright/test/cli'), 'test', ...process.argv.slice(2)],
    {
      cwd: root,
      stdio: 'inherit',
      windowsHide: true,
      env: { ...process.env, PLAYWRIGHT_BASE_URL: 'http://127.0.0.1:4175' },
    },
  );
  const exitCode = await new Promise((resolve, reject) => {
    runner.once('error', reject);
    runner.once('exit', (code) => resolve(code ?? 1));
  });
  process.exitCode = exitCode;
} finally {
  await server.close();
}
