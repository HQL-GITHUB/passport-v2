export function createUiState(config) {
  return {
    screen: 'passport',
    selected: config.demoVenue,
    collection: 'collected',
    // The page each section of the passport book is open on.
    stampPage: 0,
    ticketPage: 0,
    city: '全部城市',
    category: 'all',
    query: '',
    // How the discover page shows its destinations, as a list or on the map, and the venue
    // chosen on the map.
    discoverView: 'list',
    mapVenue: null,
    scanMode: 'qr',
    claimBusy: false,
    duplicate: false,
    firstMode: false,
    includeNote: false,
    includePhoto: false,
    includeTicket: false,
    shareTicket: '',
    visitKey: null,
    stampReturn: null,
    ticketContext: null,
    visitDate: null,
    ticketDraft: null,
    ticketBusy: false,
    ticketError: '',
    ticketResult: null,
    // The ticket shown at full size or about to be removed, and the page to go to once leaving
    // an unsaved ticket is confirmed.
    viewingTicket: null,
    leaveTo: null,
    highlightVisit: null,
    // The board the collectors page is open on; the first one until another is chosen.
    board: '',
    // The collector whose passport is open, the tab it is on and the page of its album.
    person: null,
    collectorTab: 'album',
    collectorPage: 0,
    // The post that is open, and the one of the holder's own about to be taken off the square.
    post: null,
    withdrawing: null,
  };
}

export function createRuntimeState() {
  return {
    modalState: null,
    lastFocused: null,
    toastTimer: undefined,
    cardBusy: false,
    scrollPositions: {},
    bookShown: false,
    // The featured venue the discover page was last showing.
    heroVenue: null,
    // The photographs that have arrived and been shown, by address.
    shownImages: new Set(),
  };
}
