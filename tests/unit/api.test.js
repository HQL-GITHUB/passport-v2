import test from 'node:test';
import assert from 'node:assert/strict';
import { createLocalApi } from '../../src/api/local/index.js';
import { createCatalog } from '../../src/domain/catalog.js';
import { eligibleStamps } from '../../src/domain/claims.js';
import { isValidDay } from '../../src/domain/visits.js';
import { applyClaim, normalizeData } from '../../src/api/local/passport.js';
import { venues, stamps } from '../../src/api/local/data/catalog.js';
import { APP_CONFIG } from '../../src/config.js';

const today = APP_CONFIG.demoDate;

// A backend of its own for each test: an empty browser store, and ticket images kept in memory.
function backend() {
  const kept = new Map(),
    images = new Map();
  globalThis.localStorage = {
    getItem: (key) => kept.get(key) ?? null,
    setItem: (key, value) => kept.set(key, value),
  };
  const api = createLocalApi({
    config: APP_CONFIG,
    clock: { today: () => today },
    media: {
      load: async () => {},
      put: async (id, file) => images.set(id, file),
      remove: async (id) => images.delete(id),
      clearTemporary() {},
    },
    pace: 0,
  });
  return { api, kept, images };
}

test('a claim numbers a new stamp once and files every visit under its venue and day', () => {
  const data = normalizeData({ version: 3 }, venues, stamps, (day) => isValidDay(day, today)),
    catalog = createCatalog({ venues, stamps }),
    stamp = catalog.stamp('museum'),
    claim = (day, method) =>
      applyClaim(data, {
        venue: catalog.venueOf(stamp),
        stamps: [stamp],
        day,
        method,
        claimedAt: today,
      });
  assert.deepEqual(claim('2026-11-01', 'ticket').newIds, ['museum']);
  const issue = data.records.museum.issue;
  const again = claim(today, 'qr');
  assert.deepEqual(again.newIds, []);
  assert.equal(again.visit.key, `museum/${today}`);
  assert.equal(data.records.museum.issue, issue);
  assert.equal(data.records.museum.firstAt, today);
  assert.deepEqual(data.records.museum.visits, ['2026-11-01', today]);
  assert.deepEqual(
    data.records.museum.events.map((e) => e.method),
    ['ticket', 'qr'],
  );
  assert.deepEqual(Object.keys(data.visits), ['museum/2026-11-01', `museum/${today}`]);
});

test('an exhibition stamp can be claimed only for the days the exhibition ran', () => {
  const ids = (day) => eligibleStamps(stamps, 'museum', day).map((s) => s.id);
  assert.deepEqual(ids('2025-10-18'), ['museum', 'museum-exhibition']);
  assert.deepEqual(ids('2026-01-01'), ['museum']);
  assert.deepEqual(ids('2025-08-31'), ['museum']);
});

test('the catalogue keeps venues and stamps apart and leads from one to the other', async () => {
  const { api } = backend(),
    catalog = createCatalog(await api.loadCatalog());
  for (const v of catalog.venues) assert.equal(catalog.venueOf(catalog.stampOf(v)), v);
  for (const s of catalog.stamps) assert.ok(catalog.venueOf(s), s.id);
  assert.equal(catalog.stamp('nowhere'), undefined);
  assert.equal(catalog.venue('museum-exhibition'), undefined);
  assert.deepEqual(
    catalog.stampsFor(['museum', 'nowhere', 'modern']).map((s) => s.id),
    ['museum', 'modern'],
  );
  assert.deepEqual(catalog.cities, ['临江', '云川']);
  const limited = catalog.stamp('modern');
  assert.equal(limited.issued > 0 && limited.issued <= limited.limit, true);
});

test('a claim on site answers the changed parts of the passport and keeps them', async () => {
  const { api, kept } = backend(),
    before = await api.load();
  assert.equal(before.records.maritime, undefined);
  await api.setWanted('maritime', true);
  const answer = await api.claimStamp({ stampId: 'maritime', method: 'nfc' });
  assert.equal(answer.duplicate, false);
  assert.equal(answer.day, today);
  assert.deepEqual(Object.keys(answer.data).sort(), ['records', 'visits', 'wanted']);
  assert.equal(answer.data.records.maritime.method, 'nfc');
  assert.deepEqual(answer.data.visits[`maritime/${today}`].stampIds, ['maritime']);
  assert.deepEqual(answer.data.wanted, []);
  assert.equal((await api.claimStamp({ stampId: 'maritime', method: 'qr' })).duplicate, true);
  assert.equal(JSON.parse(kept.get(APP_CONFIG.storageKey)).records.maritime.firstAt, today);
  // What was answered is a copy: changing it does not reach what is kept.
  answer.data.records.maritime.issue = -1;
  assert.equal((await api.load()).records.maritime.issue > 0, true);
  await assert.rejects(api.claimStamp({ stampId: 'nowhere', method: 'qr' }), {
    code: 'unknown-stamp',
  });
});

test('a claim that is called off writes nothing', async () => {
  const { api } = backend();
  await api.load();
  const request = new AbortController();
  request.abort();
  await assert.rejects(
    api.claimStamp({ stampId: 'maritime', method: 'qr' }, { signal: request.signal }),
    { name: 'AbortError' },
  );
  assert.equal((await api.load()).records.maritime, undefined);
});

test('a ticket is read, redeemed for the stamps its day can claim, and holds to its first visit', async () => {
  const { api, images } = backend();
  await api.load();
  const file = { size: 3, arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer },
    { ticket } = await api.recognizeTicket({ file, hint: { venueId: 'museum' } });
  assert.match(ticket.id, /^ticket-[a-f0-9]+-3$/);
  assert.equal(ticket.venueId, 'museum');
  assert.equal(ticket.visitedAt, APP_CONFIG.sampleTicketDay);
  const redeem = (more = {}) =>
    api.redeemTicket({
      id: ticket.id,
      venueId: 'museum',
      visitedAt: ticket.visitedAt,
      stampIds: ['museum', 'museum-exhibition', 'modern'],
      file,
      saveTicket: true,
      ...more,
    });
  const { claim, data } = await redeem();
  assert.deepEqual(claim.stampIds, ['museum', 'museum-exhibition']);
  assert.deepEqual(claim.newIds, ['museum']);
  assert.equal(claim.visitKey, `museum/${ticket.visitedAt}`);
  assert.equal(claim.receivedAt, today);
  assert.equal(data.tickets[ticket.id].saved, true);
  assert.equal(data.tickets[ticket.id].kind, 'image');
  assert.deepEqual(data.visits[claim.visitKey].ticketIds, [ticket.id]);
  assert.equal(images.has(ticket.id), true);
  // Read again, the same image is the same ticket and says what it was redeemed for.
  assert.equal(
    (await api.recognizeTicket({ file, hint: { venueId: 'modern' } })).ticket.venueId,
    'museum',
  );
  assert.deepEqual((await redeem()).claim.stampIds, []);
  await assert.rejects(redeem({ visitedAt: '2025-10-19' }), { code: 'ticket-mismatch' });
  await assert.rejects(redeem({ visitedAt: '2099-01-01' }), { code: 'invalid-day' });
  const removed = await api.removeTicket(ticket.id);
  assert.equal(removed.data.tickets[ticket.id].saved, false);
  assert.equal(images.has(ticket.id), false);
  assert.ok((await api.load()).visits[claim.visitKey]);
});

test('a venue outside the catalogue keeps a visit without a stamp', async () => {
  const { api } = backend();
  await api.load();
  const { ticket } = await api.recognizeTicket({ hint: { venueId: 'museum' } }),
    { claim, data } = await api.redeemTicket({
      id: ticket.id,
      venueId: 'other',
      name: ' 云间艺术空间 ',
      city: '苏州',
      exhibit: '',
      visitedAt: ticket.visitedAt,
      stampIds: ['museum'],
      saveTicket: true,
    });
  assert.match(claim.venueId, /^custom-[a-f0-9]+$/);
  assert.deepEqual(claim.stampIds, []);
  assert.equal(data.visits[claim.visitKey].name, '云间艺术空间');
  assert.equal(data.tickets[ticket.id].kind, 'sample');
  await assert.rejects(
    api.redeemTicket({ id: 'demo-x', venueId: 'other', name: '', city: '', visitedAt: today }),
    { code: 'invalid-venue' },
  );
});

test('memories, posts, likes and visibility answer the part they change', async () => {
  const { api } = backend();
  await api.load();
  const key = 'artmuseum/2026-10-24';
  assert.equal(
    (await api.saveMemory(key, { note: '光'.repeat(200), photo: '' })).data.visits[key].note.length,
    120,
  );
  await assert.rejects(api.saveMemory('nowhere/2026-01-01', { note: '', photo: '' }), {
    code: 'unknown-visit',
  });
  const post = { visitKey: key, stampIds: ['artmuseum'], note: '第一次', photo: '' };
  await api.publishPost(post);
  const { data } = await api.publishPost({ ...post, note: '第二次' });
  assert.deepEqual(data.posts, [
    { key, stampIds: ['artmuseum'], note: '第二次', photo: '', at: today },
  ]);
  assert.deepEqual((await api.withdrawPost(key)).data.posts, []);
  assert.deepEqual((await api.setLiked('ali/maritime/2026-05-02', true)).data.liked, [
    'ali/maritime/2026-05-02',
  ]);
  assert.deepEqual((await api.setLiked('ali/maritime/2026-05-02', false)).data.liked, []);
  assert.deepEqual(
    (await api.setVisibility({ album: true, footprints: false, memories: true })).data.profile
      .public,
    { album: true, footprints: false, memories: false },
  );
});

test('a passport that is tried out keeps nothing, and the kept one comes back as it was', async () => {
  const { api, kept } = backend(),
    before = await api.load();
  await api.setWanted('porcelain', true);
  const stored = kept.get(APP_CONFIG.storageKey),
    { data: first } = await api.startTrial();
  assert.deepEqual(first.records, {});
  assert.deepEqual(first.profile.public, { album: false, footprints: false, memories: false });
  assert.equal((await api.claimStamp({ stampId: 'museum', method: 'qr' })).persisted, true);
  assert.equal(kept.get(APP_CONFIG.storageKey), stored);
  const { data: back } = await api.endTrial();
  assert.deepEqual(back.records, before.records);
  assert.deepEqual(back.wanted, ['porcelain']);
});

test('the other collectors and their posts are answered by id, each post by one of its writer', async () => {
  const { api } = backend(),
    catalog = createCatalog(await api.loadCatalog()),
    { collectors, posts } = await api.loadCommunity();
  assert.equal(collectors.length > 0 && posts.length > 0, true);
  for (const p of collectors) {
    assert.equal(p.public.album, true);
    for (const s of p.stamps) assert.ok(catalog.stamp(s.stampId) && s.issue > 0, s.stampId);
    for (const v of p.visits) assert.ok(catalog.venue(v.venueId) && v.stampIds.length, v.venueId);
  }
  for (const post of posts) {
    const writer = collectors.find((p) => p.id === post.collectorId);
    assert.ok(writer, post.id);
    assert.equal(post.id, `${post.collectorId}/${post.venueId}/${post.day}`);
    assert.equal(post.stamps.length > 0, true);
    for (const s of post.stamps)
      assert.equal(writer.stamps.find((held) => held.stampId === s.stampId).issue, s.issue);
  }
});
