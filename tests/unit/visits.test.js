import test from 'node:test';
import assert from 'node:assert/strict';
import { venues, stamps } from '../../src/api/local/data/catalog.js';
import { isValidDay, visitKey } from '../../src/domain/visits.js';
import { ensureVisit, issueNumber, normalizeData } from '../../src/api/local/passport.js';
import * as format from '../../src/lib/format.js';
import { APP_CONFIG } from '../../src/config.js';

const validDay = (value) => isValidDay(value, APP_CONFIG.demoDate);
const normalize = (data) => normalizeData(data, venues, stamps, validDay);

test('one venue and day merges multiple tickets and stamps without replacing personal memories', () => {
  const data = normalize({ version: 3, records: {}, visits: {}, tickets: {}, wanted: [] });
  const first = ensureVisit(data, venues[0], '2025-10-18', ['museum'], 'demo-one');
  first.note = '保留那天的心情';
  ensureVisit(data, venues[0], '2025-10-18', ['museum', 'museum-exhibition'], 'demo-two');
  ensureVisit(data, venues[0], '2025-10-18', ['museum'], 'demo-one');
  assert.equal(Object.keys(data.visits).length, 1);
  assert.deepEqual(first.stampIds, ['museum', 'museum-exhibition']);
  assert.deepEqual(first.ticketIds, ['demo-one', 'demo-two']);
  assert.equal(first.note, '保留那天的心情');
});

test('legacy stamp memories migrate to the original visit without leaking into an earlier backfill', () => {
  const original = {
    version: 2,
    records: {
      artmuseum: {
        firstAt: '2026-10-24',
        visits: ['2026-10-24', '2025-10-18'],
        note: '原来的参观记忆',
        photo: '',
      },
    },
    tickets: {},
    wanted: ['museum'],
  };
  const before = structuredClone(original);
  const result = normalize(original);
  assert.deepEqual(original, before);
  assert.equal(result.version, 3);
  assert.equal(result.visits['artmuseum/2026-10-24'].note, '原来的参观记忆');
  assert.equal(result.visits['artmuseum/2025-10-18'].note, '');
  assert.equal(result.records.artmuseum.firstAt, '2026-10-24');
  assert.deepEqual(result.wanted, ['museum']);
});

test('cleared canonical memories stay cleared after reload instead of restoring the legacy backup', () => {
  const data = normalize({
    version: 2,
    records: {
      museum: { firstAt: '2026-10-24', visits: ['2026-10-24'], note: '旧备份', photo: '' },
    },
  });
  data.visits['museum/2026-10-24'].note = '';
  assert.equal(normalize(data).visits['museum/2026-10-24'].note, '');
});

test('a saved ticket and custom venue survive normalization even without a stamp', () => {
  const venue = { id: 'custom-abc123', name: '云间艺术空间', city: '苏州', exhibit: '光影回廊' };
  const key = visitKey(venue.id, '2025-10-18');
  const result = normalize({
    version: 3,
    records: {},
    wanted: [],
    tickets: {
      'ticket-abc123': {
        venueId: venue.id,
        visitedAt: '2025-10-18',
        receivedAt: '2026-11-10',
        redeemed: [],
        saved: true,
        kind: 'image',
        ...venue,
      },
    },
    visits: {
      [key]: {
        ...venue,
        venueId: venue.id,
        day: '2025-10-18',
        stampIds: [],
        ticketIds: ['ticket-abc123'],
        note: '值得记住',
        photo: '',
      },
    },
  });
  assert.equal(result.visits[key].name, venue.name);
  assert.deepEqual(result.visits[key].stampIds, []);
  assert.equal(result.tickets['ticket-abc123'].saved, true);
});

test('invalid references are discarded and ticket-image removal keeps the visit and stamp', () => {
  const result = normalize({
    version: 3,
    records: { museum: { firstAt: '2026-11-10', visits: ['2025-10-18'], note: '', photo: '' } },
    wanted: ['missing-venue'],
    tickets: {
      'ticket-removed': {
        venueId: 'museum',
        visitedAt: '2025-10-18',
        receivedAt: '2026-11-10',
        redeemed: ['museum', 'missing-stamp'],
        saved: false,
        kind: 'image',
      },
    },
    visits: {},
  });
  assert.deepEqual(result.wanted, []);
  assert.deepEqual(result.tickets['ticket-removed'].redeemed, ['museum']);
  assert.equal(result.tickets['ticket-removed'].saved, false);
  assert.deepEqual(result.visits['museum/2025-10-18'].stampIds, ['museum']);
});

test('visit dates validate leap years and reject invalid or future dates', () => {
  assert.equal(validDay('2024-02-29'), true);
  assert.equal(validDay('2025-02-29'), false);
  assert.equal(validDay('2026-11-11'), false);
  assert.equal(validDay('2026-11-10'), true);
  assert.equal(validDay('2026-13-01'), false);
  assert.equal(validDay('not-a-date'), false);
});

test('every collected stamp keeps one collector number, issued once and growing with the claim date', () => {
  const record = (firstAt, extra = {}) => ({ firstAt, visits: [firstAt], ...extra });
  const legacy = normalize({ version: 2, records: { artmuseum: record('2026-10-24') } });
  const issued = legacy.records.artmuseum.issue;
  assert.equal(Number.isInteger(issued) && issued > 0, true);
  assert.equal(issued, issueNumber('artmuseum', '2026-10-24'));
  assert.equal(normalize(structuredClone(legacy)).records.artmuseum.issue, issued);
  const kept = normalize({
    version: 3,
    records: { artmuseum: record('2026-10-24', { issue: 42 }) },
  });
  assert.equal(kept.records.artmuseum.issue, 42);
  const repaired = normalize({
    version: 3,
    records: { artmuseum: record('2026-10-24', { issue: 'forged' }) },
  });
  assert.equal(repaired.records.artmuseum.issue, issued);
  assert.equal(issueNumber('artmuseum', '2026-10-25') > issued, true);
  assert.equal(format.issue({ issue: 42 }), 'No. 000042');
});

test('a limited stamp numbers within its edition and shows the edition size', () => {
  const limited = stamps.find((s) => s.id === 'museum-exhibition');
  assert.equal(limited.limit > 0, true);
  assert.equal(issueNumber(limited.id, '2026-11-10', limited.limit) <= limited.limit, true);
  assert.equal(issueNumber(limited.id, '2099-01-01', limited.limit), limited.limit);
  const record = (issue) => ({ firstAt: '2026-11-10', visits: ['2025-10-18'], issue });
  const kept = normalize({ version: 3, records: { [limited.id]: record(77) } });
  assert.equal(kept.records[limited.id].issue, 77);
  const repaired = normalize({ version: 3, records: { [limited.id]: record(limited.limit + 1) } });
  assert.equal(repaired.records[limited.id].issue <= limited.limit, true);
  assert.equal(
    format.issue({ issue: 77 }, limited),
    `No. ${'77'.padStart(String(limited.limit).length, '0')} / ${limited.limit}`,
  );
});

test('records keep the order they were made in, so stamps of one day fill the album in that order', () => {
  const record = { firstAt: '2026-11-10', visits: ['2026-11-10'] };
  const result = normalize({
    version: 3,
    records: { modern: record, 'not-a-stamp': record, museum: record, artmuseum: record },
  });
  assert.deepEqual(Object.keys(result.records), ['modern', 'museum', 'artmuseum']);
  assert.deepEqual(Object.keys(normalize(result).records), ['modern', 'museum', 'artmuseum']);
});

test('a passport shows others only what its holder switched on, and notes only along with the footprints', () => {
  const blank = { version: 3, records: {}, visits: {}, tickets: {}, wanted: [] };
  assert.deepEqual(normalize(blank).profile.public, {
    album: false,
    footprints: false,
    memories: false,
  });
  assert.deepEqual(
    normalize({ ...blank, profile: { public: { album: true, footprints: 'yes', memories: true } } })
      .profile.public,
    { album: true, footprints: false, memories: false },
  );
  const shown = normalize({
    ...blank,
    profile: { public: { album: true, footprints: true, memories: true } },
  });
  assert.deepEqual(shown.profile.public, { album: true, footprints: true, memories: true });
  assert.deepEqual(normalize(shown).profile, shown.profile);
});
