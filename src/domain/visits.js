// A visit is known by its venue and its day.
export const visitKey = (venueId, day) => `${venueId}/${day}`;

// A short, stable name made out of a text: for a venue outside the catalogue, or a tint.
export function hashIdentity(text) {
  let n = 2166136261;
  for (const c of text) n = Math.imul(n ^ c.charCodeAt(0), 16777619) >>> 0;
  return n.toString(16);
}

// A day that can stand in the passport: a real date, written YYYY-MM-DD, and not after today.
export function isValidDay(value, today) {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    value < '1900-01-01' ||
    value > today
  )
    return false;
  const [y, m, d] = value.split('-').map(Number),
    day = new Date(Date.UTC(y, m - 1, d));
  return day.getUTCFullYear() === y && day.getUTCMonth() === m - 1 && day.getUTCDate() === d;
}
