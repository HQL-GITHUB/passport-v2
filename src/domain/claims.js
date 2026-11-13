import { ensureVisit, issueNumber } from './visits.js';

// The stamps a visit to a venue on a day can claim: the venue's own, and those of an exhibition
// only for the days it ran.
export function eligibleStamps(stamps, venueId, day) {
  return stamps.filter(
    (s) => s.venueId === venueId && (!s.period || (day >= s.period[0] && day <= s.period[1])),
  );
}

/**
 * Writes one claim into the passport: the stamps collected for a visit to `venue` on `day`, by
 * `method`, on the day of the claim. A stamp held already keeps its number and its first day and
 * gains the visit; a new one is numbered here, which is what a venue service will do in its place.
 * The visit of that venue and day takes the stamps and, if there is one, the ticket.
 */
export function applyClaim(data, { venue, stamps, day, method, claimedAt, ticketId = null }) {
  const newIds = [];
  for (const s of stamps) {
    let r = data.records[s.id];
    if (!r) {
      newIds.push(s.id);
      r = data.records[s.id] = {
        firstAt: claimedAt,
        issue: issueNumber(s.id, claimedAt, s.limit),
        visits: [],
        method,
        events: [],
        note: '',
        photo: '',
      };
    }
    r.events ||= r.visits.map((date) => ({
      date,
      method: r.method || 'qr',
      claimedAt: r.firstAt,
    }));
    if (!r.visits.includes(day)) r.visits.push(day);
    if (!r.events.some((e) => e.date === day && e.method === method))
      r.events.push({ date: day, method, claimedAt });
  }
  const visit = ensureVisit(
    data,
    venue,
    day,
    stamps.map((s) => s.id),
    ticketId,
  );
  return { newIds, visit };
}
