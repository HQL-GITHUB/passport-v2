import { venues, stamps } from './data/catalog.js';
import { collectors, posts } from './data/collectors.js';
import { createDemoData } from './data/demo-data.js';
import { createCatalog } from '../../domain/catalog.js';
import { eligibleStamps } from '../../domain/claims.js';
import { hashIdentity, isValidDay, visitKey } from '../../domain/visits.js';
import { createImageUrls } from '../../lib/images.js';
import { applyClaim, issueNumber, normalizeData } from './passport.js';

class ApiError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

const aborted = () => new DOMException('The request was called off.', 'AbortError');

// The time a service would take to answer. Called off, it rejects and nothing is written.
const latency = (ms, signal) =>
  new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(aborted());
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(aborted());
      },
      { once: true },
    );
  });

/**
 * The passport's backend, kept in this browser: the demonstration's stand-in for a server.
 *
 * The application talks to it only through the methods returned here, which are the contract a
 * server-backed implementation has to keep (docs/architecture.md lists them). Every method is
 * asynchronous. A command answers `{ data, ...result }`, where `data` holds the parts of the
 * passport it changed, by their top-level names, for the application to take in place of its own;
 * a command that fails rejects with an error that carries a `code`, and changes nothing.
 *
 * What a server will decide is decided here and nowhere else: the day of a claim, the number a
 * stamp is issued, which stamps a ticket can claim, the identity of a ticket and of a venue that
 * is not in the catalogue, how claims gather into visits, and what the other collectors hold.
 *
 * `media` keeps the images of tickets; `photos` are the demonstration's photographs of its
 * venues, `{ venues, venueThumbs }` by venue; `pace` stretches or removes the time it takes to
 * answer.
 */
export function createLocalApi({ config, clock, media, photos = {}, pace = 1 }) {
  // The passport as it is kept, and the kept one while a first passport is tried out.
  let db = null,
    shelved = null;
  const catalog = createCatalog({ venues, stamps }),
    validDay = (value) => isValidDay(value, clock.today()),
    normalize = (raw) => normalizeData(raw, venues, stamps, validDay),
    // The single-file build inlines every image as a data URL of several megabytes. The pages,
    // which are written as HTML strings, refer to each by a short URL instead.
    urls = createImageUrls();

  function read() {
    let raw;
    try {
      raw = JSON.parse(
        localStorage.getItem(config.storageKey) || localStorage.getItem(config.legacyStorageKey),
      );
    } catch {}
    if (!raw || ![2, 3].includes(raw.version)) raw = createDemoData();
    // The demonstration passport shows its album, so its holder has a place on the boards. A
    // passport started from nothing shows nothing until its holder says so.
    raw.profile ||= { public: { album: true } };
    return normalize(raw);
  }
  // A passport being tried out is not kept. Where the browser refuses to keep one, the change
  // still stands for this session, and the answer says so.
  function persist() {
    if (shelved) return true;
    try {
      localStorage.setItem(config.storageKey, JSON.stringify(db));
      return true;
    } catch {
      return false;
    }
  }
  const copy = (...keys) => structuredClone(Object.fromEntries(keys.map((k) => [k, db[k]])));
  function answer(keys, result = {}) {
    return { data: copy(...keys), persisted: persist(), ...result };
  }
  // The venue a ticket belongs to. A ticket redeemed before keeps the venue it was redeemed for;
  // a venue outside the catalogue is known by its name and city.
  function ticketVenue({ venueId, name = '', city = '', exhibit = '' }, previous) {
    if (previous?.venueId.startsWith('custom-'))
      return {
        id: previous.venueId,
        name: previous.name,
        city: previous.city,
        exhibit: previous.exhibit,
      };
    if (venueId !== 'other') {
      const known = catalog.venue(venueId);
      if (!known) throw new ApiError('unknown-venue');
      return known;
    }
    name = name.trim();
    city = city.trim();
    if (!name || !city) throw new ApiError('invalid-venue');
    return {
      id: 'custom-' + hashIdentity(name + '|' + city),
      name,
      city,
      exhibit: exhibit.trim(),
    };
  }
  // A venue whose stamp is in the passport is no longer one to go to.
  function settleWanted(venue) {
    if (db.records[venue.stampId]) db.wanted = db.wanted.filter((id) => id !== venue.id);
  }

  return {
    // The venues and the stamps. A venue comes with its photographs; a limited stamp with how
    // far its edition has been issued, which is simulated up to today.
    async loadCatalog() {
      const today = clock.today();
      return {
        venues: venues.map((v) => ({
          ...v,
          photo: urls.short(photos.venues?.[v.id]),
          thumb: urls.short(photos.venueThumbs?.[v.id]),
        })),
        stamps: stamps.map((s) => ({
          ...s,
          ...(s.limit ? { issued: issueNumber(s.id, today, s.limit) } : {}),
        })),
      };
    },

    // The other collectors, as far as each shows the passport, and what they put on the square.
    // They are invented: each holds the stamps the fixture lists, numbered the way the holder's
    // own are, and has made the visits those stamps tell of.
    async loadCommunity() {
      const people = collectors.map((p) => {
        const held = p.stamps
            .map(([stampId, at, method, note = '']) => ({
              stampId,
              at,
              method,
              note,
              issue: issueNumber(stampId, at, catalog.stamp(stampId).limit),
            }))
            .sort((a, b) => a.at.localeCompare(b.at)),
          visits = new Map();
        for (const s of held) {
          const venue = catalog.venueOf(catalog.stamp(s.stampId)),
            key = visitKey(venue.id, s.at);
          if (!visits.has(key))
            visits.set(key, {
              day: s.at,
              venueId: venue.id,
              name: venue.name,
              city: venue.city,
              exhibit: venue.exhibit,
              stampIds: [],
              note: '',
              photo: '',
            });
          visits.get(key).stampIds.push(s.stampId);
          visits.get(key).note ||= s.note;
        }
        return {
          id: p.id,
          name: p.name,
          city: p.city,
          public: { album: true, footprints: !!p.footprints, memories: !!p.memories },
          stamps: held.map(({ stampId, at, method, issue }) => ({ stampId, at, method, issue })),
          visits: [...visits.values()].sort((a, b) => b.day.localeCompare(a.day)),
        };
      });
      return {
        collectors: people,
        // A post is addressed by its writer, its venue and the day of the visit.
        posts: posts.flatMap(([who, venueId, day, likes, note]) => {
          const p = people.find((item) => item.id === who),
            v = p?.visits.find((item) => item.venueId === venueId && item.day === day);
          return v
            ? {
                id: `${who}/${venueId}/${day}`,
                collectorId: who,
                venueId,
                name: v.name,
                city: v.city,
                exhibit: v.exhibit,
                day,
                at: day,
                stamps: p.stamps
                  .filter((s) => v.stampIds.includes(s.stampId) && s.at === day)
                  .map(({ stampId, issue }) => ({ stampId, issue })),
                note,
                photo: '',
                likes,
              }
            : [];
        }),
      };
    },

    // The holder's passport: records, visits, tickets, wanted venues, posts, likes and profile.
    async load() {
      db = read();
      await media.load(db.tickets).catch(() => {});
      return structuredClone(db);
    },

    // Collects a stamp on site, today. Answers whether it was held already, and the day.
    async claimStamp({ stampId, method }, { signal } = {}) {
      const stamp = catalog.stamp(stampId);
      if (!stamp) throw new ApiError('unknown-stamp');
      await latency(850 * pace, signal);
      const day = clock.today(),
        venue = catalog.venueOf(stamp),
        duplicate = !!db.records[stamp.id];
      applyClaim(db, { venue, stamps: [stamp], day, method, claimedAt: day });
      settleWanted(venue);
      return answer(['records', 'visits', 'wanted'], { duplicate, day });
    },

    // Reads a ticket: which one it is, and the visit it tells of. Without an image it answers
    // with the sample ticket of the venue and day in `hint`. The reading is a demonstration: it
    // repeats the hint, or what the same ticket was redeemed for before.
    async recognizeTicket({ file = null, hint = {} }, { signal } = {}) {
      let id = `demo-${hint.venueId}-${hint.day || config.sampleTicketDay}`;
      if (file) {
        // The fingerprint of a file tells the same image from another; it proves nothing about
        // the ticket.
        let hash = 2166136261;
        for (const b of new Uint8Array(await file.arrayBuffer()))
          hash = Math.imul(hash ^ b, 16777619) >>> 0;
        id = `ticket-${hash.toString(16)}-${file.size.toString(16)}`;
      }
      await latency(450 * pace, signal);
      const receipt = db.tickets[id],
        known = catalog.venue((receipt || hint).venueId);
      return {
        ticket: {
          id,
          venueId: known?.id || 'other',
          name: receipt?.name || hint.name || '',
          city: receipt?.city || hint.city || '',
          exhibit: receipt?.exhibit || hint.exhibit || '',
          visitedAt: receipt?.visitedAt || hint.day || config.sampleTicketDay,
        },
      };
    },

    // Redeems a ticket for a visit: keeps its image if asked to, collects the stamps chosen
    // among those the visit can claim, and files all of it under the visit. Answers the claim.
    async redeemTicket(
      { id, venueId, name, city, exhibit, visitedAt, stampIds = [], file = null, saveTicket },
      { signal } = {},
    ) {
      if (!validDay(visitedAt)) throw new ApiError('invalid-day');
      const previous = db.tickets[id],
        venue = ticketVenue({ venueId, name, city, exhibit }, previous);
      if (previous && (previous.venueId !== venue.id || previous.visitedAt !== visitedAt))
        throw new ApiError('ticket-mismatch');
      const savingImage = saveTicket && file && !previous?.saved;
      if (savingImage)
        await media.put(id, file, !!shelved).catch(() => {
          throw new ApiError('media-unavailable');
        });
      try {
        await latency(400 * pace, signal);
      } catch (error) {
        if (savingImage) await media.remove(id);
        throw error;
      }
      const today = clock.today(),
        rewards = eligibleStamps(stamps, venue.id, visitedAt).filter(
          (s) => stampIds.includes(s.id) && !previous?.redeemed.includes(s.id),
        ),
        ids = rewards.map((s) => s.id);
      db.tickets[id] = {
        venueId: venue.id,
        visitedAt,
        receivedAt: previous?.receivedAt || today,
        redeemed: [...new Set([...(previous?.redeemed || []), ...ids])],
        saved: !!(previous?.saved || saveTicket),
        kind: previous?.saved ? previous.kind : file ? 'image' : 'sample',
        name: venue.name,
        city: venue.city,
        exhibit: venue.exhibit || '',
      };
      const { newIds, visit } = applyClaim(db, {
        venue,
        stamps: rewards,
        day: visitedAt,
        method: 'ticket',
        claimedAt: today,
        ticketId: id,
      });
      settleWanted(venue);
      return answer(['records', 'visits', 'tickets', 'wanted'], {
        claim: {
          stampIds: ids,
          newIds,
          newCount: newIds.length,
          existingCount: ids.length - newIds.length,
          visitedAt,
          receivedAt: today,
          venueId: venue.id,
          visitKey: visit.key,
        },
      });
    },

    // Takes a ticket's image out of the passport. Its visit and its stamps stay.
    async removeTicket(id) {
      if (!db.tickets[id]) throw new ApiError('unknown-ticket');
      await media.remove(id);
      db.tickets[id].saved = false;
      return answer(['tickets']);
    },

    // The line and the photograph kept with a visit.
    async saveMemory(visitKey, { note, photo }) {
      const visit = db.visits[visitKey];
      if (!visit) throw new ApiError('unknown-visit');
      visit.note = String(note).slice(0, 120);
      visit.photo = photo || '';
      return answer(['visits']);
    },

    async setWanted(venueId, on) {
      db.wanted = on
        ? [...new Set([...db.wanted, venueId])]
        : db.wanted.filter((id) => id !== venueId);
      return answer(['wanted']);
    },

    // Puts a visit on the square, in place of what was there of it before: a copy of the stamps,
    // the line and the photograph it is given, dated today.
    async publishPost({ visitKey, stampIds, note, photo }) {
      if (!db.visits[visitKey]) throw new ApiError('unknown-visit');
      db.posts = [
        ...db.posts.filter((p) => p.key !== visitKey),
        { key: visitKey, stampIds, note, photo, at: clock.today() },
      ];
      return answer(['posts']);
    },

    async withdrawPost(visitKey) {
      db.posts = db.posts.filter((p) => p.key !== visitKey);
      return answer(['posts']);
    },

    async setLiked(postId, on) {
      db.liked = on ? [...new Set([...db.liked, postId])] : db.liked.filter((id) => id !== postId);
      return answer(['liked']);
    },

    // What the holder shows of the passport to others. Notes and photographs are shown with the
    // visits they belong to, or not at all.
    async setVisibility({ album, footprints, memories }) {
      db.profile = {
        ...db.profile,
        public: { album: !!album, footprints: !!footprints, memories: !!(footprints && memories) },
      };
      return answer(['profile']);
    },

    // The demonstration can put the kept passport aside and try out an empty one, of which
    // nothing is kept, and take the kept one up again afterwards.
    async startTrial() {
      shelved ||= db;
      db = normalize({ version: 3 });
      return { data: structuredClone(db) };
    },
    async endTrial() {
      media.clearTemporary();
      db = shelved || read();
      shelved = null;
      await media.load(db.tickets).catch(() => {});
      return { data: structuredClone(db) };
    },

    dispose: urls.dispose,
  };
}
