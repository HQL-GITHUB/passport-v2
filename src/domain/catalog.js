/**
 * The catalogue as the application reads it: the venues and the stamps a catalogue service
 * answers, with the ways to find one from the other. A venue and a stamp are different things
 * with ids of their own; looking for one that is not there answers undefined.
 */
export function createCatalog({ venues = [], stamps = [] } = {}) {
  const venueById = new Map(venues.map((v) => [v.id, v])),
    stampById = new Map(stamps.map((s) => [s.id, s]));
  return {
    venues,
    stamps,
    venue: (id) => venueById.get(id),
    stamp: (id) => stampById.get(id),
    // The stamps of these ids that the catalogue knows, in their order.
    stampsFor: (ids = []) => ids.map((id) => stampById.get(id)).filter(Boolean),
    // The venue a stamp is collected at.
    venueOf: (stamp) => venueById.get(stamp?.venueId),
    // The stamp every visitor of a venue can collect there.
    stampOf: (venue) => stampById.get(venue?.stampId),
    cities: [...new Set(venues.map((v) => v.city))],
  };
}
