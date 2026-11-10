import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
let html = await fs.readFile(path.join(root, 'index.html'), 'utf8');
let css = await fs.readFile(path.join(root, 'styles.css'), 'utf8');
let js = await fs.readFile(path.join(root, 'app.js'), 'utf8');
for (const name of ['collectible-atlas.png', 'museum-courtyard.png']) {
  const bytes = await fs.readFile(path.join(root, 'assets', name));
  const dataUrl = `data:image/png;base64,${bytes.toString('base64')}`;
  css = css.replaceAll(`assets/${name}`, dataUrl);
  js = js.replaceAll(`assets/${name}`, dataUrl);
}
html = html.replace('<link rel="stylesheet" href="styles.css">', `<style>\n${css}\n</style>`);
html = html.replace('<script src="app.js" defer></script>', '');
html = html.replace('</body>', `<script>\n${js.replaceAll('</script', '<\\/script')}\n</script>\n</body>`);
const target = path.join(root, '旅行护照-v2.html');
await fs.writeFile(target, html, 'utf8');
console.log(target);
