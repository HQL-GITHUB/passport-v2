/** Fixed prototype date and existing storage identities. */
export const APP_CONFIG = Object.freeze({
  storageKey: 'cultural-passport-prototype-v3',
  legacyStorageKey: 'cultural-passport-prototype-v2',
  // The day the demonstration takes for today, and what it falls back on where the product
  // would know: the venue claimed at when none was chosen, and the day on the sample ticket.
  demoDate: '2026-11-10',
  demoVenue: 'museum',
  sampleTicketDay: '2025-10-18',
  mediaDbName: 'cultural-passport-memory-v3',
});
