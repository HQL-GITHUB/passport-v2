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
  // What the page of a screen is about, which is the id its address carries: a venue, a stamp,
  // or a visit, addressed by its venue and day. The other screens carry along the last of these.
  venueScreens: ['venue', 'scan', 'ticket'],
  stampScreens: ['stamp', 'success', 'share'],
  visitScreens: ['visit', 'visit-share', 'ticket-success'],
  screens: [
    'passport',
    'discover',
    'venue',
    'stamp',
    'scan',
    'success',
    'share',
    'ticket',
    'ticket-confirm',
    'ticket-success',
    'visit',
    'visit-share',
    'share-footprints',
    'share-album',
    'collectors',
    'collector',
    'square',
    'post',
  ],
});
