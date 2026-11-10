import test from 'node:test';
import assert from 'node:assert/strict';
import { venues, stamps } from '../../src/data/catalog.js';
import { ensureVisit, normalizeData, visitKey } from '../../src/domain/visits.js';
import { createPresentation } from '../../src/lib/presentation.js';
import { APP_CONFIG } from '../../src/config.js';

const context = { config: APP_CONFIG, ui: { visitDate: null } };
context.format = createPresentation(context);
const validDay = context.format.validDay;
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
