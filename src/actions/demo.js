/** What the review rail beside the prototype does. None of it belongs to the product. */
export function createDemoActions(appContext) {
  return {
    'preview-home'() {
      appContext.ui.collection = 'footprints';
      appContext.navigation.navigate('passport');
    },
    'preview-visit'() {
      const rows = appContext.selectors.visitRows(),
        row = rows.find((v) => appContext.selectors.savedTickets(v).length) || rows[0];
      if (row) appContext.navigation.openVisit(row.key);
      else {
        appContext.ui.ticketContext = null;
        appContext.navigation.navigate('ticket', appContext.config.demoVenue);
      }
    },
    'preview-album'() {
      appContext.ui.collection = 'collected';
      appContext.navigation.navigate('passport');
    },
    'preview-ticket'() {
      appContext.claims.clearTicketDraft();
      appContext.ui.ticketContext = null;
      appContext.ui.ticketResult = null;
      appContext.navigation.navigate('ticket', appContext.config.demoVenue);
    },
    // Puts the kept passport aside for an empty one, of which nothing is kept, and back.
    async 'toggle-first-use'(button) {
      const first = !appContext.ui.firstMode;
      if (!(await appContext.store.attempt(first ? 'startTrial' : 'endTrial'))) return;
      appContext.ui.firstMode = first;
      button.childNodes[0].textContent = first ? '返回已有收藏' : '体验首次使用';
      appContext.ui.collection = 'collected';
      appContext.ui.stampPage = appContext.ui.ticketPage = 0;
      appContext.ui.visitKey = null;
      appContext.navigation.navigate('passport');
    },
  };
}
