export const createDemoData = () => ({
  version: 2,
  records: {
    artmuseum: {
      firstAt: '2026-10-24',
      visits: ['2026-10-24'],
      note: '光从弧形墙面落下来，这一刻很安静。',
      photo: '',
    },
    // The newest visit holds only a stamp, so the footprints open on a one-line visit followed by
    // a full card: both forms are in view at once.
    landscape: {
      firstAt: '2026-10-31',
      visits: ['2026-10-31'],
      note: '',
      photo: '',
    },
    modern: {
      firstAt: '2026-09-17',
      visits: ['2026-09-17'],
      note: '',
      photo: '',
    },
    // Collected on site during the 2025 exhibition: the passport's limited, time-bound example.
    // Its ticket stub is among the tickets below; the sample ticket flow uses another day.
    'museum-exhibition': {
      firstAt: '2025-10-10',
      visits: ['2025-10-10'],
      note: '',
      photo: '',
    },
  },
  wanted: [],
  tickets: {
    'demo-artmuseum-2026-10-24': {
      venueId: 'artmuseum',
      visitedAt: '2026-10-24',
      receivedAt: '2026-10-24',
      redeemed: ['artmuseum'],
      saved: true,
      kind: 'sample',
    },
    'demo-museum-2025-10-10': {
      venueId: 'museum',
      visitedAt: '2025-10-10',
      receivedAt: '2025-10-10',
      redeemed: ['museum-exhibition'],
      saved: true,
      kind: 'sample',
    },
  },
});
