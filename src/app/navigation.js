/** Application module. Dependencies are provided by createApp(). */
export function createNavigation(appContext) {
  const pageFields = [
    'screen',
    'selected',
    'collection',
    'stampPage',
    'ticketPage',
    'city',
    'category',
    'query',
    'discoverView',
    'mapVenue',
    'scanMode',
    'visitKey',
    'visitDate',
    'stampReturn',
    'board',
    'person',
    'collectorTab',
    'collectorPage',
    'post',
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
      return JSON.stringify(['discover', page.city, page.category, page.query, page.discoverView]);
    if (page.screen === 'square') return 'square';
    if (page.screen === 'post') return `post/${page.post}`;
    if (page.screen === 'collectors') return `collectors/${page.board}`;
    if (page.screen === 'collector') return `collector/${page.person}/${page.collectorTab}`;
    if (appContext.screens.about(page.screen) === 'visit') return `${page.screen}/${page.visitKey}`;
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
  // The id a screen's page is about, of the kind the screen takes; one the catalogue does not
  // know gives way to the demonstration's venue, or its stamp.
  function subject(screen, id) {
    const { venue, stamp, stampOf } = appContext.catalog,
      fallback = appContext.selectors.defaultVenue();
    const about = appContext.screens.about(screen);
    if (about === 'venue') return (venue(id) || fallback).id;
    if (about === 'stamp') return (stamp(id) || stampOf(fallback)).id;
    return venue(id) || stamp(id) ? id : fallback.id;
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
    appContext.ui.screen = appContext.screens.known(parts[0]) ? parts[0] : 'passport';
    appContext.ui.selected = subject(appContext.ui.screen, parts[1]);
    // A post is addressed by its writer, its venue and the day of the visit.
    if (appContext.ui.screen === 'post') {
      const id = parts.slice(1).join('/');
      if (appContext.selectors.posts().some((p) => p.id === id)) appContext.ui.post = id;
      else appContext.ui.screen = 'square';
    }
    // A collector's passport is addressed by its collector.
    if (appContext.ui.screen === 'collector') {
      if (appContext.selectors.person(parts[1])) appContext.ui.person = parts[1];
      else appContext.ui.screen = 'collectors';
    }
    if (appContext.screens.about(appContext.ui.screen) === 'visit' && parts[2]) {
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
    if (appContext.ui.screen === 'success' && !appContext.data.records[appContext.ui.selected]) {
      appContext.ui.screen = 'scan';
      appContext.ui.selected = appContext.catalog.stamp(appContext.ui.selected).venueId;
    }
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
    if (!appContext.screens.known(screen)) return;
    rememberScroll();
    appContext.claims.cancel();
    appContext.ui.ticketBusy = false;
    appContext.ui.claimBusy = false;
    appContext.dialogs.closeModal(false);
    if (!appContext.screens.keepsDraft(screen)) appContext.claims.clearTicketDraft();
    appContext.ui.screen = screen;
    const memoryScreen = appContext.screens.about(screen) === 'visit';
    appContext.ui.selected = memoryScreen ? id : subject(screen, id);
    const day = memoryScreen
      ? screen === 'ticket-success'
        ? appContext.ui.ticketResult?.visitedAt
        : appContext.data.visits[appContext.ui.visitKey]?.day
      : null;
    const hash =
      screen === 'collector'
        ? `#/collector/${appContext.ui.person}`
        : screen === 'post'
          ? `#/post/${appContext.ui.post}`
          : `#/${screen}/${appContext.ui.selected}${day ? '/' + day : ''}`;
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
    appContext.claims.cancel();
    appContext.ui.claimBusy = false;
    appContext.ui.ticketBusy = false;
    appContext.dialogs.closeModal(false);
    routeFromLocation();
    if (!appContext.screens.keepsDraft(appContext.ui.screen)) appContext.claims.clearTicketDraft();
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
    if (appContext.ui.screen === 'collector') {
      appContext.navigation.navigate('collectors', appContext.ui.selected, true);
      return;
    }
    if (appContext.ui.screen === 'post') {
      appContext.navigation.navigate('square', appContext.ui.selected, true);
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
