import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { chromium } from '@playwright/test';
import { createServer } from 'vite';

// Takes pictures of pages as a phone shows them, to look at after changing how they are drawn:
//
//   npm run shot                                   the four pages of the navigation
//   npm run shot -- discover venue/museum          the pages named, as their addresses are
//   npm run shot -- passport --width 320 --full    a narrow phone, the page to its end
//   npm run shot -- visit/artmuseum/2026-10-24 --click "[data-action=edit-memory]"
//
// Every page is opened in a browser of its own, so it shows the demonstration's passport and
// nothing a developer's browser keeps. Motion is reduced, as in the browser tests, so a picture
// is of the page at rest. The pictures go to .work/shots/, which is not committed.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { values: options, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    width: { type: 'string', default: '390' },
    height: { type: 'string', default: '844' },
    // Pixels to a CSS pixel: at 2 the small print can be read in the picture.
    scale: { type: 'string', default: '2' },
    // The whole page, however far it scrolls, instead of what the screen holds of it.
    full: { type: 'boolean', default: false },
    // What to click before the picture is taken, in order: a tab, or the button of a dialog.
    click: { type: 'string', multiple: true, default: [] },
    // How long to let the page settle before the picture, in milliseconds.
    wait: { type: 'string', default: '400' },
    out: { type: 'string', default: '.work/shots' },
  },
});
const width = Number(options.width),
  height = Number(options.height),
  routes = (
    positionals.length ? positionals : ['passport', 'discover', 'square', 'collectors']
  ).map((route) => route.replace(/^[#/]+/, '') || 'passport'),
  out = path.resolve(root, options.out);

// The browser the tests are told to use, or else the first there is: Playwright's own, then the
// ones a machine usually has.
async function launch() {
  const executablePath = process.env.PLAYWRIGHT_EXECUTABLE_PATH,
    channels = executablePath
      ? [undefined]
      : process.env.PLAYWRIGHT_BROWSER_CHANNEL
        ? [process.env.PLAYWRIGHT_BROWSER_CHANNEL]
        : [undefined, 'msedge', 'chrome'];
  let failure;
  for (const channel of channels)
    try {
      return await chromium.launch({ channel, executablePath });
    } catch (error) {
      failure = error;
    }
  throw failure;
}

// An in-process server, as for the browser tests, on a port of its own or the next one free.
const server = await createServer({
  root,
  configFile: path.join(root, 'vite.config.js'),
  logLevel: 'warn',
  server: { host: '127.0.0.1', port: 4178, strictPort: false, hmr: false },
});
let browser,
  failed = false;
try {
  await server.listen();
  const base = `http://127.0.0.1:${server.httpServer.address().port}`;
  browser = await launch();
  fs.mkdirSync(out, { recursive: true });
  for (const route of routes) {
    const context = await browser.newContext({
        viewport: { width, height },
        deviceScaleFactor: Number(options.scale),
        isMobile: true,
        hasTouch: true,
        reducedMotion: 'reduce',
      }),
      page = await context.newPage(),
      errors = [],
      settle = async () => {
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(Number(options.wait));
      };
    // What goes wrong on the page is told with its picture. A request that fails is named by
    // its address, which the console leaves out; the browser's own, for an icon, is no fault.
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error' && !message.text().startsWith('Failed to load resource'))
        errors.push(message.text());
    });
    page.on('response', (response) => {
      if (response.status() >= 400 && !response.url().endsWith('/favicon.ico'))
        errors.push(`${response.status()} ${response.url()}`);
    });
    // A page or a button that is not there is not waited for long.
    page.setDefaultTimeout(8000);
    try {
      await page.goto(`${base}/#/${route}`);
      await page.locator('#app-main .page').first().waitFor();
      await settle();
      for (const selector of options.click) {
        await page.locator(selector).first().click();
        await settle();
      }
      if (options.full)
        // The page scrolls inside the app, not the document: the screen is made as tall as the
        // page is long. A page that fills the screen may grow with it, so it is measured again.
        for (let n = 0; n < 3; n++) {
          const more = await page
            .locator('#app-main')
            .evaluate((el) => el.scrollHeight - el.clientHeight);
          if (more <= 0) break;
          await page.setViewportSize({ width, height: page.viewportSize().height + more });
          await settle();
        }
      const name =
          [route.replaceAll('/', '-'), width !== 390 && width, options.full && 'full']
            .filter(Boolean)
            .join('.') + '.png',
        file = path.join(out, name),
        shown = await page.locator('#app').getAttribute('data-screen');
      await page.screenshot({ path: file });
      console.log(path.relative(root, file));
      // An address that names what is not there is answered with another page.
      if (shown !== route.split('/')[0])
        console.log(`  the address was answered with the page "${shown}"`);
    } catch (error) {
      failed = true;
      console.error(`${route}: ${error.message.split('\n')[0]}`);
    }
    for (const message of errors) console.log(`  error on the page: ${message}`);
    failed ||= errors.length > 0;
    await context.close();
  }
} finally {
  await browser?.close();
  await server.close();
}
process.exitCode = failed ? 1 : 0;
