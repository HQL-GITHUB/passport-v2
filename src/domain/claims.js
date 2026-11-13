// The stamps a visit to a venue on a day can claim: the venue's own, and those of an exhibition
// only for the days it ran.
export function eligibleStamps(stamps, venueId, day) {
  return stamps.filter(
    (s) => s.venueId === venueId && (!s.period || (day >= s.period[0] && day <= s.period[1])),
  );
}
