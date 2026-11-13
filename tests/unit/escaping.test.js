import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createLocalApi } from '../../src/api/local/index.js';
import { createCatalog } from '../../src/domain/catalog.js';
import { eligibleStamps } from '../../src/domain/claims.js';
import { hashIdentity, isValidDay, visitKey } from '../../src/domain/visits.js';
import { createUiState, createRuntimeState } from '../../src/state/state.js';
import { createSelectors } from '../../src/state/selectors.js';
import { createCommunitySelectors } from '../../src/state/community.js';
import { createScreens } from '../../src/app/screens.js';
import { safe } from '../../src/lib/format.js';
import { APP_CONFIG } from '../../src/config.js';

// The pages are written as HTML, so a text has to go through `safe()` on its way into one:
// whatever a person wrote, be it the catalogue's names and lines, another collector's or the
// holder's own, and the addresses of photographs. Here every such text begins with a tag and a
// quote, every page is drawn, and none of them may come out as it was written.
const RAW = `<raw-text>"'&`,
  PHOTO = `data:image/jpeg;base64,${RAW}`,
  today = APP_CONFIG.demoDate;

// Marks the texts of a thing, by name; a list of lines is marked line by line.
function mark(thing, ...names) {
  for (const name of names) {
    const text = thing[name];
    if (Array.isArray(text)) thing[name] = text.map((line) => RAW + line);
    else if (text && !text.startsWith(RAW)) thing[name] = RAW + text;
  }
}

globalThis.localStorage = { getItem: () => null, setItem() {} };
globalThis.matchMedia = () => ({ matches: false });
globalThis.document = { getElementById: () => null };

const api = createLocalApi({
  config: APP_CONFIG,
  clock: { today: () => today },
  media: { load: async () => {}, put: async () => {}, remove: async () => {}, clearTemporary() {} },
  pace: 0,
});

const { venues, stamps } = await api.loadCatalog();
for (const v of venues) {
  mark(v, 'name', 'city', 'type', 'exhibit', 'headline', 'intro', 'location', 'word');
  // All but one have a photograph.
  if (v.id !== 'modern') v.photo = v.thumb = `https://photos.test/${v.id}.webp?${RAW}`;
}
for (const s of stamps) mark(s, 'title', 'english', 'description', 'serial', 'kind', 'edition');

const community = await api.loadCommunity();
for (const p of community.collectors) {
  mark(p, 'name', 'city');
  for (const v of p.visits) mark(v, 'name', 'city', 'exhibit', 'note');
}
for (const p of community.posts) mark(p, 'name', 'city', 'exhibit', 'note');
community.posts[0].photo = PHOTO;

// The holder's passport, with one of everything a page can show: a visit with a ticket, a line
// and a photograph, one to a venue the catalogue does not know, a ticket just redeemed, a venue
// to go to, a post, a like, and all of it shown to others.
let data = await api.load();
async function send(command, ...args) {
  const { data: changed, ...result } = await api[command](...args);
  data = { ...data, ...changed };
  return result;
}
const kept = 'artmuseum/2026-10-24';
await send('setVisibility', { album: true, footprints: true, memories: true });
await send('setWanted', 'porcelain', true);
await send('saveMemory', kept, { note: `${RAW}一句话`, photo: PHOTO });
await send('publishPost', {
  visitKey: kept,
  stampIds: ['artmuseum'],
  note: `${RAW}一句话`,
  photo: PHOTO,
});
await send('setLiked', community.posts[1].id, true);
const { claim: elsewhere } = await send('redeemTicket', {
  id: 'ticket-0',
  venueId: 'other',
  name: `${RAW}馆`,
  city: `${RAW}城`,
  exhibit: `${RAW}展`,
  visitedAt: '2026-01-05',
  saveTicket: true,
});
const { claim: redeemed } = await send('redeemTicket', {
  id: 'demo-museum-2025-10-18',
  venueId: 'museum',
  visitedAt: '2025-10-18',
  stampIds: ['museum', 'museum-exhibition'],
  saveTicket: true,
});
for (const v of Object.values(data.visits)) mark(v, 'name', 'city', 'exhibit');
for (const t of Object.values(data.tickets)) mark(t, 'name', 'city', 'exhibit');

// The application as far as its pages need it: what create-app.js puts together, without the
// document.
const context = {
  config: APP_CONFIG,
  clock: { today: () => today },
  domain: {
    key: visitKey,
    hash: hashIdentity,
    validDay: (value) => isValidDay(value, today),
    eligible: eligibleStamps,
  },
  catalog: createCatalog({ venues, stamps }),
  community,
  data,
  ui: createUiState(APP_CONFIG),
  runtime: createRuntimeState(),
  media: { url: () => '' },
  dom: { header: {}, footer: {} },
  selectors: {},
  screens: {},
  views: {},
};
Object.assign(context.selectors, createSelectors(context), createCommunitySelectors(context));
Object.assign(context.screens, createScreens(context));
const directory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../src/views');
for (const file of fs.readdirSync(directory)) {
  const module = await import(pathToFileURL(path.join(directory, file)));
  for (const create of Object.values(module)) Object.assign(context.views, create(context));
}
// Which of the views have been drawn, by name.
const drawn = new Set();
for (const [name, view] of Object.entries(context.views))
  context.views[name] = (...args) => {
    drawn.add(name);
    return view(...args);
  };

const draft = {
  id: 'demo-maritime-2025-10-18',
  venueId: 'maritime',
  customName: '',
  customCity: '',
  customExhibit: '',
  visitedAt: '2025-10-18',
  selected: ['maritime'],
  saveTicket: true,
};
// What is drawn: a page as the interface's state has it in view and, after it, the dialogs it
// opens and the parts of it that are drawn on their own, each by the name of its view, with what
// the view is given where it is given something.
const scenes = [
  [{ screen: 'passport' }, ['renderBook', ['artmuseum']]],
  [{ screen: 'passport', collection: 'tickets', viewingTicket: 'ticket-0' }, 'ticketDialog'],
  [{ screen: 'passport', collection: 'footprints' }],
  [{ screen: 'passport', collection: 'wanted' }],
  [{ screen: 'discover' }, 'cityDialog'],
  [{ screen: 'discover', discoverView: 'map', mapVenue: 'museum' }, 'mapPanel'],
  [{ screen: 'venue', selected: 'maritime' }, 'guideDialog'],
  [{ screen: 'venue', selected: 'modern' }],
  [{ screen: 'stamp', selected: 'artmuseum' }, ['zoomDialog', 'artmuseum'], 'memoryDialog'],
  [{ screen: 'stamp', selected: 'porcelain' }],
  [{ screen: 'scan', selected: 'porcelain' }],
  [{ screen: 'success', selected: 'artmuseum' }],
  [{ screen: 'share', selected: 'artmuseum' }],
  [{ screen: 'ticket', selected: 'maritime' }, 'ticketLeaveDialog'],
  [{ screen: 'ticket-confirm', ticketDraft: draft }],
  [
    {
      screen: 'ticket-confirm',
      ticketDraft: {
        ...draft,
        venueId: 'other',
        customName: `${RAW}馆`,
        customCity: `${RAW}城`,
        customExhibit: `${RAW}展`,
      },
    },
  ],
  [{ screen: 'ticket-success', visitKey: redeemed.visitKey, ticketResult: redeemed }],
  [{ screen: 'visit', visitKey: kept }, 'memoryDialog', 'ticketRemoveDialog'],
  [{ screen: 'visit', visitKey: elsewhere.visitKey }],
  [
    { screen: 'visit-share', visitKey: kept, includeNote: true, includePhoto: true },
    'ticketEditorDialog',
  ],
  [{ screen: 'share-footprints' }],
  [{ screen: 'share-album' }],
  [{ screen: 'collectors' }, 'visibilityDialog'],
  [{ screen: 'collectors', board: 'year' }],
  [{ screen: 'collector', person: 'ali' }],
  [{ screen: 'collector', person: 'ali', collectorTab: 'footprints' }],
  [{ screen: 'collector', person: 'me', collectorTab: 'footprints' }],
  [{ screen: 'square' }, 'publishDialog', 'withdrawDialog'],
  [{ screen: 'post', post: community.posts[0].id }],
  [{ screen: 'post', post: community.posts[1].id }],
  [{ screen: 'post', post: `me/${kept}` }],
];
// A scene as HTML: the page with its own buttons, the header and the navigation, and then the
// rest. A dialog's title is made safe where the dialog is opened, so only its body counts.
function draw([state, ...parts]) {
  Object.assign(context.ui, createUiState(APP_CONFIG), state);
  context.screens.settle();
  assert.equal(context.ui.screen, state.screen, `${state.screen} has nothing to show`);
  context.views.renderHeader();
  context.views.renderFooter();
  return [
    context.screens.draw(),
    context.screens.actions(),
    context.dom.header.innerHTML,
    context.dom.footer.innerHTML,
    ...parts.map((part) => {
      const [name, ...given] = [part].flat(),
        made = context.views[name](...given);
      return typeof made === 'string' ? made : made.body;
    }),
  ].join('\n');
}
const pages = scenes.map((scene) => [scene[0].screen, draw(scene)]);

test('no page writes a text into its HTML as it was written', () => {
  // Each place a text came through, by the page and what stands before it there.
  const through = pages.flatMap(([screen, html]) =>
    [...html.matchAll(/<raw-text>/g)].map(
      (found) =>
        `${screen}: ${html.slice(Math.max(0, found.index - 60), found.index).replace(/\s+/g, ' ')}`,
    ),
  );
  assert.deepEqual([...new Set(through)], []);
  // And the texts are there to be seen, made safe.
  for (const [screen, html] of pages)
    assert.ok(html.includes(safe(RAW)), `${screen} shows none of the texts`);
});

test('every view is drawn here, so that what it writes is looked at', () => {
  // A turned page is followed, not drawn.
  assert.deepEqual(
    Object.keys(context.views).filter((name) => !drawn.has(name)),
    ['bookTurned'],
  );
});
