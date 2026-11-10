export function createUiState() {
  return {
    screen: 'passport',
    selected: 'museum',
    collection: 'footprints',
    timeline: false,
    city: '全部城市',
    category: 'all',
    query: '',
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
    highlightVisit: null,
  };
}

export function createRuntimeState() {
  return {
    savedExperience: null,
    modalState: null,
    lastFocused: null,
    toastTimer: undefined,
    claimToken: 0,
    ticketToken: 0,
    cardBusy: false,
    scrollPositions: {},
  };
}
