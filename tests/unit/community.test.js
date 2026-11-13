import test from 'node:test';
import assert from 'node:assert/strict';
import { createCatalog } from '../../src/domain/catalog.js';
import { createSelectors } from '../../src/state/selectors.js';
import { createCommunitySelectors } from '../../src/state/community.js';

const today = '2026-11-10';
const catalog = createCatalog({
  venues: [
    { id: 'hall', stampId: 'hall', city: '临江' },
    { id: 'pier', stampId: 'pier', city: '临江' },
    { id: 'peak', stampId: 'peak', city: '云川' },
  ],
  stamps: [
    { id: 'hall', venueId: 'hall' },
    { id: 'pier', venueId: 'pier' },
    { id: 'peak', venueId: 'peak' },
  ],
});
const collector = (id, stamps) => ({
  id,
  name: id,
  city: '',
  public: { album: true },
  stamps: stamps.map(([stampId, at, method], n) => ({ stampId, at, method, issue: n + 1 })),
  visits: [],
});

// The selectors over a community of the given collectors, and a holder with the given records.
function community(collectors, { records = {}, album = false } = {}) {
  const context = {
    catalog,
    clock: { today: () => today },
    ui: { board: '' },
    community: { collectors, posts: [] },
    data: { records, visits: {}, posts: [], liked: [], profile: { public: { album } } },
  };
  context.selectors = { ...createSelectors(context), ...createCommunitySelectors(context) };
  return context.selectors;
}
const places = (rows) => rows.map((row) => [row.person.id, row.rank, row.count]);

test('a board counts the stamps collected on site, and leaves out those redeemed with a ticket', () => {
  const { board } = community([
    collector('on-site', [
      ['hall', '2026-01-01', 'qr'],
      ['pier', '2026-02-01', 'nfc'],
    ]),
    collector('half', [
      ['hall', '2026-03-01', 'qr'],
      ['pier', '2026-03-01', 'ticket'],
    ]),
    collector('tickets-only', [['hall', '2026-04-01', 'ticket']]),
  ]);
  assert.deepEqual(places(board('临江')), [
    ['on-site', 1, 2],
    ['half', 2, 1],
  ]);
});

test('collectors level on stamps share a place, in the order they got there, and the next place follows on', () => {
  const rows = community([
    collector('later', [
      ['hall', '2026-01-01', 'qr'],
      ['pier', '2026-06-01', 'qr'],
    ]),
    collector('sooner', [
      ['hall', '2026-02-01', 'qr'],
      ['pier', '2026-03-01', 'qr'],
    ]),
    collector('one', [['hall', '2026-01-01', 'qr']]),
  ]).board('临江');
  assert.deepEqual(places(rows), [
    ['sooner', 1, 2],
    ['later', 1, 2],
    ['one', 2, 1],
  ]);
  assert.deepEqual(
    rows.map((row) => row.complete),
    [true, true, false],
  );
});

test('a city board counts its own venues, and the yearly board the stamps of this year', () => {
  const { boards, board } = community([
    collector('both', [
      ['hall', '2025-05-01', 'qr'],
      ['peak', '2026-05-01', 'qr'],
    ]),
    collector('last-year', [['pier', '2025-12-31', 'qr']]),
  ]);
  assert.deepEqual(
    boards().map((b) => b.id),
    ['临江', '云川', 'year'],
  );
  assert.deepEqual(places(board('临江')), [
    ['both', 1, 1],
    ['last-year', 1, 1],
  ]);
  assert.deepEqual(places(board('云川')), [['both', 1, 1]]);
  assert.deepEqual(places(board('year')), [['both', 1, 1]]);
});

test('the holder stands on a board only once the album is shown', () => {
  const others = [collector('other', [['hall', '2026-01-01', 'qr']])],
    records = {
      hall: { firstAt: '2026-02-01', issue: 9, method: 'qr', visits: ['2026-02-01'] },
      pier: { firstAt: '2026-02-02', issue: 4, method: 'nfc', visits: ['2026-02-02'] },
    };
  assert.deepEqual(places(community(others, { records }).board('临江')), [['other', 1, 1]]);
  assert.deepEqual(places(community(others, { records, album: true }).board('临江')), [
    ['me', 1, 2],
    ['other', 2, 1],
  ]);
});
