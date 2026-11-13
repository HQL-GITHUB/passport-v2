import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createScreens } from '../../src/app/screens.js';
import { createSubjects } from '../../src/app/subjects.js';

// The pages name what they run by strings: a button its action, a field what follows a change,
// a page of the table its views. A name that is misspelt does nothing and says nothing, so the
// names are checked here against what is there to answer them.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const walk = (dir) =>
  fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) =>
      entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)],
    );
const files = walk(path.join(root, 'src')).filter((file) => file.endsWith('.js'));
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), 'utf8');
const sources = [...files.map((file) => fs.readFileSync(file, 'utf8')), read('index.html')];

// Everything the factories of a directory make, by the name it is made under. The factories are
// the exports whose names end as `suffix` does; each has to be registered in `registry`.
async function made(directory, suffix, registry) {
  const names = new Map();
  for (const file of files.filter((item) => path.dirname(item).endsWith(directory))) {
    const module = await import(pathToFileURL(file));
    for (const [factory, create] of Object.entries(module)) {
      if (!factory.endsWith(suffix)) continue;
      assert.ok(read(registry).includes(`${factory}(appContext)`), `${factory} is not registered`);
      for (const name of Object.keys(create({}))) {
        assert.ok(!names.has(name), `${name} is made by ${names.get(name)} and by ${factory}`);
        names.set(name, factory);
      }
    }
  }
  return [...names.keys()];
}
// The names an attribute is given in the pages. Where the name is worked out on the page, every
// name it can come to.
function named(attribute) {
  const names = new Set();
  for (const source of sources)
    for (const [, value] of source.matchAll(new RegExp(`${attribute}="([^"]+)"`, 'g')))
      for (const [name] of value.startsWith('${')
        ? value.matchAll(/(?<=')[a-z0-9-]+(?=')/g)
        : [[value]])
        names.add(name);
  return [...names];
}
// The names that follow `pattern` in the sources.
function called(pattern) {
  return [...new Set(sources.flatMap((source) => [...source.matchAll(pattern)].map((m) => m[1])))];
}
const missing = (asked, there) => asked.filter((name) => !there.includes(name));

test('every action a button names is there, and every action has a button', async () => {
  const actions = await made('actions', 'Actions', 'src/app/events.js'),
    buttons = named('data-action');
  assert.deepEqual(missing(buttons, actions), []);
  assert.deepEqual(missing(actions, buttons), []);
});

test('every field that is followed is there, and every one has its field', async () => {
  const fields = await made('actions', 'Fields', 'src/app/events.js'),
    inputs = [...named('data-input'), ...named('data-change')];
  assert.deepEqual(missing(inputs, fields), []);
  assert.deepEqual(missing(fields, inputs), []);
});

test('every view that is drawn is there, and every view is drawn somewhere', async () => {
  const views = await made('views', 'Views', 'src/app/create-app.js'),
    // By the tables of the pages and of the dialogs, or by name.
    tabled = [read('src/app/screens.js'), read('src/controllers/dialogs.js')].flatMap((source) =>
      [...source.matchAll(/\b(?:view|actions|tools): '(\w+)'/g)].map((m) => m[1]),
    ),
    drawn = [...tabled, ...called(/appContext\.views\.(\w+)/g)];
  assert.deepEqual(missing(drawn, views), []);
  assert.deepEqual(missing(views, drawn), []);
});

test('every page that is gone to and every dialog that is opened is in its table', () => {
  const screens = createScreens({}),
    dialogs = [
      ...read('src/controllers/dialogs.js').matchAll(/^ {4}(?:'([a-z-]+)'|(\w+)): \{/gm),
    ].map((m) => m[1] || m[2]);
  assert.deepEqual(
    called(/\b(?:navigate|to|tab|openCard)\('([a-z-]+)'/g).filter((name) => !screens.known(name)),
    [],
  );
  assert.deepEqual(missing(called(/\bopenModal\('([a-z-]+)'/g), dialogs), []);
  assert.deepEqual(missing(dialogs, called(/\bopenModal\('([a-z-]+)'/g)), []);
});

test('what a page is said to be about is a kind of thing the table of subjects knows', () => {
  const kinds = [...read('src/app/screens.js').matchAll(/\babout: '(\w+)'/g)].map((m) => m[1]);
  assert.deepEqual(missing([...new Set(kinds)], Object.keys(createSubjects({}))), []);
});
