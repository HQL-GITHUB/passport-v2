const cleanText = (v, max = 120) => (typeof v === 'string' ? v.slice(0, max) : '');

const photo = (v) =>
  typeof v === 'string' && /^data:image\/(jpeg|png|webp);base64,/.test(v) ? v : '';

const key = (venueId, day) => `${venueId}/${day}`;

function hash(text) {
  let n = 2166136261;
  for (const c of text) n = Math.imul(n ^ c.charCodeAt(0), 16777619) >>> 0;
  return n.toString(16);
}

// Stand-in for the number a venue service would issue with each claim: later claims get larger numbers,
// and a limited stamp never numbers past its edition size.
function issueNumber(stampId, claimedAt, limit = Infinity) {
  const perDay = 7 + (parseInt(hash(stampId), 16) % 12),
    days = Math.max(0, Math.round((Date.parse(claimedAt) - Date.parse('2025-01-01')) / 86400000));
  return Math.min(limit, 1 + days * perDay + (parseInt(hash(stampId + claimedAt), 16) % perDay));
}

function ensure(data, venue, day, stampIds = [], ticketId = null) {
  data.visits ||= {};
  const id = key(venue.id, day);
  const row = (data.visits[id] ||= {
    key: id,
    venueId: venue.id,
    name: venue.name,
    city: venue.city,
    exhibit: venue.exhibit || '',
    day,
    stampIds: [],
    ticketIds: [],
    note: '',
    photo: '',
  });
  row.stampIds = [...new Set([...row.stampIds, ...stampIds])];
  if (ticketId && !row.ticketIds.includes(ticketId)) row.ticketIds.push(ticketId);
  return row;
}

function normalize(raw, venues, stamps, validDay) {
  const result = {
    version: 3,
    records: {},
    wanted: [],
    tickets: {},
    visits: {},
  };
  const stampById = (id) => stamps.find((s) => s.id === id);
  const base = (s) => venues.find((v) => v.id === (s.venueId || s.id));
  const validVenue = (id) => venues.some((v) => v.id === id) || /^custom-[a-f0-9]+$/.test(id);
  const methods = ['ticket', 'qr', 'nfc', 'legacy'];
  // Records keep the order they were made in: stamps collected on the same day fill the album
  // in that order.
  for (const id of Object.keys(raw?.records || {})) {
    const s = stampById(id),
      r = raw.records[id];
    if (!s || !r || !validDay(r.firstAt) || !Array.isArray(r.visits)) continue;
    const visits = [...new Set(r.visits.filter(validDay))];
    if (!visits.length) visits.push(r.firstAt);
    const method = methods.includes(r.method) ? r.method : 'qr';
    result.records[s.id] = {
      firstAt: r.firstAt,
      issue:
        Number.isInteger(r.issue) && r.issue > 0 && r.issue <= (s.limit || Infinity)
          ? r.issue
          : issueNumber(s.id, r.firstAt, s.limit),
      visits,
      method,
      events: Array.isArray(r.events)
        ? r.events
            .filter((e) => e && visits.includes(e.date))
            .map((e) => ({
              date: e.date,
              method: methods.includes(e.method) ? e.method : method,
              claimedAt: validDay(e.claimedAt) ? e.claimedAt : r.firstAt,
            }))
        : visits.map((day) => ({
            date: day,
            method,
            claimedAt: r.firstAt,
          })),
      note: cleanText(r.note),
      photo: photo(r.photo),
    };
  }
  result.wanted = Array.isArray(raw?.wanted)
    ? [...new Set(raw.wanted.filter((id) => venues.some((v) => v.id === id)))]
    : [];
  for (const [id, t] of Object.entries(raw?.tickets || {})) {
    if (
      !/^(demo|ticket)-[a-z0-9-]{1,100}$/.test(id) ||
      !t ||
      !validVenue(t.venueId) ||
      !validDay(t.visitedAt)
    )
      continue;
    result.tickets[id] = {
      venueId: t.venueId,
      visitedAt: t.visitedAt,
      receivedAt: validDay(t.receivedAt) ? t.receivedAt : t.visitedAt,
      redeemed: Array.isArray(t.redeemed)
        ? [
            ...new Set(
              t.redeemed.filter((s) => result.records[s] && base(stampById(s))?.id === t.venueId),
            ),
          ]
        : [],
      saved: t.saved === true,
      kind: t.kind === 'image' || (!t.kind && id.startsWith('ticket-')) ? 'image' : 'sample',
      name: cleanText(t.name),
      city: cleanText(t.city, 60),
      exhibit: cleanText(t.exhibit),
    };
  }
  for (const [id, v] of Object.entries(raw?.visits || {})) {
    if (!v || !validVenue(v.venueId) || !validDay(v.day) || id !== key(v.venueId, v.day)) continue;
    const known = venues.find((item) => item.id === v.venueId);
    if (!known && !cleanText(v.name).trim()) continue;
    const row = ensure(
      result,
      {
        id: v.venueId,
        name: known?.name || cleanText(v.name),
        city: known?.city || cleanText(v.city, 60),
        exhibit: cleanText(v.exhibit),
      },
      v.day,
    );
    row.note = cleanText(v.note);
    row.photo = photo(v.photo);
    row.stampIds = Array.isArray(v.stampIds)
      ? v.stampIds.filter(
          (s) => result.records[s]?.visits.includes(v.day) && base(stampById(s))?.id === v.venueId,
        )
      : [];
    row.ticketIds = Array.isArray(v.ticketIds)
      ? v.ticketIds.filter(
          (t) => result.tickets[t]?.venueId === v.venueId && result.tickets[t]?.visitedAt === v.day,
        )
      : [];
  }
  for (const s of stamps) {
    const r = result.records[s.id];
    if (!r) continue;
    for (const day of r.visits) ensure(result, base(s), day, [s.id]);
    const origin = r.visits.includes(r.firstAt) ? r.firstAt : [...r.visits].sort()[0];
    const row = result.visits[key(base(s).id, origin)];
    if (raw?.version !== 3) {
      if (!row.note) row.note = r.note;
      if (!row.photo) row.photo = r.photo;
    }
  }
  for (const [id, t] of Object.entries(result.tickets)) {
    const venue = venues.find((v) => v.id === t.venueId) || {
      id: t.venueId,
      name: t.name,
      city: t.city,
      exhibit: t.exhibit,
    };
    if (venue.name) ensure(result, venue, t.visitedAt, t.redeemed, id);
  }
  return result;
}
export {
  key as visitKey,
  hash as hashIdentity,
  issueNumber,
  ensure as ensureVisit,
  normalize as normalizeData,
};
