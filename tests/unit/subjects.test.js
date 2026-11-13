import test from 'node:test';
import assert from 'node:assert/strict';
import { createCatalog } from '../../src/domain/catalog.js';
import { visitKey } from '../../src/domain/visits.js';
import { createSelectors } from '../../src/state/selectors.js';
import { createSubjects } from '../../src/app/subjects.js';

const catalog = createCatalog({
  venues: [
    { id: 'hall', stampId: 'hall-stamp' },
    { id: 'pier', stampId: 'pier-stamp' },
  ],
  stamps: [
    { id: 'hall-stamp', venueId: 'hall' },
    { id: 'pier-stamp', venueId: 'pier' },
    { id: 'pier-show', venueId: 'pier' },
  ],
});
const visit = (venueId, day) => ({ key: visitKey(venueId, day), venueId, day });

// The table of subjects over a passport with the given visits, and the state it reads and sets.
// `about` is what the page in view is about.
function subjects(about, { visits = [], ui = {} } = {}) {
  const context = {
    catalog,
    config: { demoVenue: 'hall' },
    domain: { key: visitKey },
    ui: { selected: 'hall', visitKey: null, visitDate: null, person: null, post: null, ...ui },
    data: { records: {}, visits: Object.fromEntries(visits.map((v) => [v.key, v])) },
  };
  const table = createSubjects(context);
  context.screens = { subject: () => table[about] };
  context.selectors = createSelectors(context);
  return { subject: table[about], ui: context.ui };
}

test('a page keeps the venue or the stamp it is given, of the kind it is about', () => {
  assert.equal(subjects('venue').subject.take('pier'), 'pier');
  assert.equal(subjects('stamp').subject.take('pier-show'), 'pier-show');
  // A page about neither carries along whichever it is given.
  assert.equal(subjects('none').subject.take('pier'), 'pier');
  assert.equal(subjects('none').subject.take('pier-show'), 'pier-show');
});

test('an id the catalogue does not know gives way to the venue of the demonstration', () => {
  assert.equal(subjects('venue').subject.take('nowhere'), 'hall');
  assert.equal(subjects('venue').subject.take('pier-show'), 'hall');
  assert.equal(subjects('stamp').subject.take('pier'), 'hall-stamp');
  assert.equal(subjects('none').subject.take(undefined), 'hall');
  assert.equal(subjects('person').subject.take('someone'), 'hall');
});

test('the venue and the stamp in view follow from what the page is about', () => {
  const venue = subjects('venue', { ui: { selected: 'pier' } }).subject,
    stamp = subjects('stamp', { ui: { selected: 'pier-show' } }).subject,
    person = subjects('person', { ui: { selected: 'pier' } }).subject;
  assert.equal(venue.venue().id, 'pier');
  // Of a venue, the stamp every visitor can collect there.
  assert.equal(venue.stamp().id, 'pier-stamp');
  assert.equal(stamp.venue().id, 'pier');
  assert.equal(stamp.stamp().id, 'pier-show');
  // A collector's passport keeps the venue it was come to with, and shows none.
  assert.equal(person.venue(), undefined);
  assert.equal(person.address(), null);
});

test('a visit is read from its venue and its day, and written the same way', () => {
  const day = '2026-03-01',
    { subject, ui } = subjects('visit', { visits: [visit('pier', day)] });
  subject.read(['pier', day]);
  ui.selected = subject.take('pier');
  assert.deepEqual([ui.visitKey, ui.visitDate, ui.selected], [visitKey('pier', day), day, 'pier']);
  assert.equal(subject.address(), `pier/${day}`);
  assert.equal(subject.visit().day, day);
  assert.equal(subject.venue().id, 'pier');
  assert.equal(subject.of(ui), visitKey('pier', day));
});

test('a visit to a venue outside the catalogue keeps that venue', () => {
  const day = '2026-03-01',
    { subject, ui } = subjects('visit', { visits: [visit('custom-1a2b', day)] });
  subject.read(['custom-1a2b', day]);
  assert.equal(subject.take('custom-1a2b'), 'custom-1a2b');
  assert.equal(subject.venue(), undefined);
  // Without the visit, the venue is unknown like any other.
  ui.visitKey = null;
  assert.equal(subject.take('custom-1a2b'), 'hall');
});

test('a visit that is not in the passport is named, and not taken for a day in view', () => {
  const { subject, ui } = subjects('visit');
  subject.read(['pier', '2026-03-01']);
  assert.equal(ui.visitKey, visitKey('pier', '2026-03-01'));
  assert.equal(ui.visitDate, null);
  assert.equal(subject.visit(), undefined);
});

test('a person and a post are read from the address, a post from all that follows the page', () => {
  const person = subjects('person'),
    post = subjects('post');
  person.subject.read(['someone']);
  assert.equal(person.ui.person, 'someone');
  post.subject.read(['someone', 'pier', '2026-03-01']);
  assert.equal(post.ui.post, 'someone/pier/2026-03-01');
  assert.equal(post.subject.address(), 'someone/pier/2026-03-01');
  assert.equal(post.subject.of(post.ui), 'someone/pier/2026-03-01');
});
