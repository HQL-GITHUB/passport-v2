/** Application module. Dependencies are provided by createApp(). */
export function createNavigation(appContext) {
  const pageFields = [
    'screen',
    'selected',
    'collection',
    'city',
    'category',
    'query',
    'scanMode',
    'visitKey',
    'visitDate',
    'stampReturn',
  ];
  const entries = new Map();
  const session = Date.now().toString(36);
  let sequence = 0;
  let currentEntry = null;

  function pageState() {
    return Object.fromEntries(pageFields.map((field) => [field, appContext.ui[field]]));
  }
  function scrollKey(page) {
    if (page.screen === 'passport') return `passport/${page.collection}`;
    if (page.screen === 'discover')
      return JSON.stringify(['discover', page.city, page.category, page.query]);
    if (['visit', 'visit-share', 'ticket-success'].includes(page.screen))
      return `${page.screen}/${page.visitKey}`;
    return `${page.screen}/${page.selected}/${page.screen === 'stamp' ? page.visitDate || '' : ''}`;
  }
  function rememberScroll() {
    if (!currentEntry) return;
    currentEntry.scrollTop = appContext.dom.main.scrollTop;
    appContext.runtime.scrollPositions[scrollKey(currentEntry.page)] = currentEntry.scrollTop;
  }
  // Capture before an action changes UI state, so the origin keeps its own visit and tab.
  function rememberPage() {
    if (!currentEntry) return;
    currentEntry.page = pageState();
    rememberScroll();
    entries.set(currentEntry.id, currentEntry);
    if (history.state?.passportNavigation?.id === currentEntry.id)
      history.replaceState({ ...history.state, passportNavigation: currentEntry }, '');
  }
  function routeFromLocation() {
    const stored = history.state?.passportNavigation;
    const entry = entries.get(stored?.id) || stored;
    if (entry?.page)
      for (const field of pageFields)
        if (Object.hasOwn(entry.page, field)) appContext.ui[field] = entry.page[field];
    let parts = [];
    try {
      parts = decodeURIComponent(location.hash.replace(/^#\/?/, '')).split('/');
    } catch {}
    appContext.ui.screen = appContext.config.screens.includes(parts[0]) ? parts[0] : 'passport';
    appContext.ui.selected = appContext.catalog.stamps.some((s) => s.id === parts[1])
      ? parts[1]
      : 'museum';
    if (['visit', 'visit-share', 'ticket-success'].includes(appContext.ui.screen) && parts[2]) {
      const key = appContext.domain.key(parts[1], parts[2]);
      if (appContext.data.visits[key]) {
        appContext.ui.visitKey = key;
        appContext.ui.selected = parts[1];
        appContext.ui.visitDate = parts[2];
        if (appContext.ui.screen === 'ticket-success' && !appContext.ui.ticketResult)
          appContext.ui.screen = 'visit';
      } else appContext.ui.screen = 'passport';
    }
    if (appContext.ui.screen === 'share' && !appContext.data.records[appContext.ui.selected])
      appContext.ui.screen = 'stamp';
    if (appContext.ui.screen === 'success' && !appContext.data.records[appContext.ui.selected])
      appContext.ui.screen = 'scan';
    if (appContext.ui.screen === 'ticket-confirm' && !appContext.ui.ticketDraft)
      appContext.ui.screen = 'ticket';
    if (
      (appContext.ui.screen === 'share-footprints' &&
        !Object.keys(appContext.data.visits).length) ||
      (appContext.ui.screen === 'share-album' && !Object.keys(appContext.data.records).length)
    )
      appContext.ui.screen = 'passport';
    if (appContext.ui.screen === 'ticket-success' && !appContext.ui.ticketResult)
      appContext.ui.screen = 'passport';
    if (
      ['visit', 'visit-share'].includes(appContext.ui.screen) &&
      !appContext.data.visits[appContext.ui.visitKey]
    )
      appContext.ui.screen = 'passport';
    currentEntry = {
      id: entry?.id || `${session}-${sequence++}`,
      depth: entry?.depth || 0,
      page: pageState(),
      scrollTop: entry?.scrollTop || 0,
    };
    entries.set(currentEntry.id, currentEntry);
    history.replaceState({ ...history.state, passportNavigation: currentEntry }, '');
  }
  function navigate(screen, id = appContext.ui.selected, replace = false) {
    if (!appContext.config.screens.includes(screen)) return;
    rememberScroll();
    appContext.runtime.claimToken++;
    appContext.runtime.ticketToken++;
    appContext.ui.ticketBusy = false;
    appContext.ui.claimBusy = false;
    appContext.dialogs.closeModal(false);
    if (!['ticket', 'ticket-confirm', 'ticket-success', 'scan'].includes(screen))
      appContext.claims.clearTicketDraft();
    appContext.ui.screen = screen;
    const memoryScreen = ['visit', 'visit-share', 'ticket-success'].includes(screen);
    appContext.ui.selected = memoryScreen
      ? id
      : ['venue', 'scan', 'ticket'].includes(screen)
        ? appContext.catalog.venueOf(appContext.catalog.byId(id)).id
        : appContext.catalog.byId(id).id;
    const day = memoryScreen
      ? screen === 'ticket-success'
        ? appContext.ui.ticketResult?.visitedAt
        : appContext.data.visits[appContext.ui.visitKey]?.day
      : null;
    const hash = `#/${screen}/${appContext.ui.selected}${day ? '/' + day : ''}`;
    const page = pageState();
    currentEntry = {
      id: `${session}-${sequence++}`,
      depth: (currentEntry?.depth || 0) + (replace ? 0 : 1),
      page,
      scrollTop: appContext.runtime.scrollPositions[scrollKey(page)] || 0,
    };
    entries.set(currentEntry.id, currentEntry);
    history[replace ? 'replaceState' : 'pushState'](
      {
        passportNavigation: currentEntry,
      },
      '',
      hash,
    );
    appContext.render();
    appContext.dom.main.scrollTop = currentEntry.scrollTop;
    appContext.dom.main.focus({
      preventScroll: true,
    });
  }
  function restorePage() {
    // The location already points to the destination; retain the outgoing entry in memory.
    rememberPage();
    appContext.runtime.claimToken++;
    appContext.runtime.ticketToken++;
    appContext.ui.claimBusy = false;
    appContext.ui.ticketBusy = false;
    appContext.dialogs.closeModal(false);
    routeFromLocation();
    if (!['ticket', 'ticket-confirm', 'ticket-success', 'scan'].includes(appContext.ui.screen))
      appContext.claims.clearTicketDraft();
    appContext.render();
    appContext.dom.main.scrollTop = currentEntry.scrollTop;
    appContext.dom.main.focus({ preventScroll: true });
  }
  function goBack() {
    if (currentEntry?.depth > 0) {
      history.back();
      return;
    }
    if (appContext.ui.screen === 'visit-share') {
      appContext.navigation.navigate(
        'visit',
        appContext.data.visits[appContext.ui.visitKey].venueId,
        true,
      );
      return;
    }
    if (appContext.ui.screen === 'share') {
      appContext.navigation.navigate('stamp', appContext.ui.selected, true);
      return;
    }
    if (
      appContext.ui.screen === 'stamp' &&
      appContext.ui.stampReturn &&
      appContext.data.visits[appContext.ui.stampReturn]
    ) {
      appContext.navigation.openVisit(appContext.ui.stampReturn, true);
      return;
    }
    if (appContext.ui.screen === 'ticket-confirm') {
      appContext.navigation.navigate(
        'ticket',
        appContext.ui.ticketDraft?.venueId || appContext.ui.selected,
        true,
      );
      return;
    }
    if (appContext.ui.screen === 'scan') {
      appContext.navigation.navigate('venue', appContext.ui.selected, true);
      return;
    }
    if (appContext.ui.screen === 'venue') {
      appContext.navigation.navigate('discover', appContext.ui.selected, true);
      return;
    }
    // An overview share opened directly returns to the tab it shares.
    if (['share-footprints', 'share-album'].includes(appContext.ui.screen))
      appContext.ui.collection =
        appContext.ui.screen === 'share-album' ? 'collected' : 'footprints';
    appContext.navigation.navigate('passport', appContext.ui.selected, true);
  }
  function openVisit(key, replace = false) {
    const v = appContext.data.visits[key];
    if (!v) {
      appContext.feedback.toast('这次到访暂时没有记录');
      return;
    }
    appContext.ui.visitKey = key;
    appContext.ui.visitDate = v.day;
    appContext.navigation.navigate('visit', v.venueId, replace);
  }
  return {
    routeFromLocation,
    rememberPage,
    restorePage,
    navigate,
    goBack,
    openVisit,
  };
}
