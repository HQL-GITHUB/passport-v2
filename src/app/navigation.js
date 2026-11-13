import { PAGE_FIELDS } from '../state/state.js';

/** Application module. Dependencies are provided by createApp(). */
export function createNavigation(appContext) {
  const entries = new Map();
  const session = Date.now().toString(36);
  let sequence = 0;
  let currentEntry = null;

  function pageState() {
    return Object.fromEntries(PAGE_FIELDS.map((field) => [field, appContext.ui[field]]));
  }
  // What a scroll position belongs to: the page, what it is about, and whatever else the page
  // says. A page of the navigation is about nothing, whatever venue it carries along.
  function scrollKey(page) {
    const about = appContext.screens.about(page.screen),
      subject = appContext.screens.root(page.screen)
        ? ''
        : about === 'visit'
          ? page.visitKey
          : about === 'person'
            ? page.person
            : about === 'post'
              ? page.post
              : page.selected;
    return JSON.stringify([page.screen, subject, ...appContext.screens.place(page)]);
  }
  // Where the page in view was last scrolled to.
  function savedScroll() {
    return appContext.runtime.scrollPositions[scrollKey(pageState())] || 0;
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
      for (const field of PAGE_FIELDS)
        if (Object.hasOwn(entry.page, field)) appContext.ui[field] = entry.page[field];
    let parts = [];
    try {
      parts = decodeURIComponent(location.hash.replace(/^#\/?/, '')).split('/');
    } catch {}
    appContext.ui.screen = appContext.screens.known(parts[0]) ? parts[0] : 'passport';
    appContext.ui.selected = subject(appContext.ui.screen, parts[1]);
    // What is not a venue or a stamp is addressed in its own way: a collector's passport by its
    // collector, a post by its writer, its venue and the day of the visit, and a visit by its
    // venue and its day.
    const about = appContext.screens.about();
    if (about === 'person') appContext.ui.person = parts[1];
    if (about === 'post') appContext.ui.post = parts.slice(1).join('/');
    if (about === 'visit' && parts[2]) {
      appContext.ui.visitKey = appContext.domain.key(parts[1], parts[2]);
      if (appContext.data.visits[appContext.ui.visitKey]) {
        appContext.ui.selected = parts[1];
        appContext.ui.visitDate = parts[2];
      }
    }
    // An address may name what is not there, or no longer.
    appContext.screens.settle();
    currentEntry = {
      id: entry?.id || `${session}-${sequence++}`,
      depth: entry?.depth || 0,
      page: pageState(),
      scrollTop: entry?.scrollTop || 0,
    };
    entries.set(currentEntry.id, currentEntry);
    history.replaceState({ ...history.state, passportNavigation: currentEntry }, '');
  }
  // Whatever was under way on the page that is left is called off with it.
  function leave() {
    appContext.claims.cancel();
    appContext.ui.ticketBusy = false;
    appContext.ui.claimBusy = false;
    appContext.dialogs.closeModal(false);
  }
  function navigate(screen, id = appContext.ui.selected, replace = false) {
    if (!appContext.screens.known(screen)) return;
    rememberScroll();
    leave();
    if (!appContext.screens.keepsDraft(screen)) appContext.claims.clearTicketDraft();
    appContext.ui.screen = screen;
    const about = appContext.screens.about(),
      day = about === 'visit' && appContext.data.visits[appContext.ui.visitKey]?.day;
    appContext.ui.selected = about === 'visit' ? id : subject(screen, id);
    const address =
      about === 'person'
        ? appContext.ui.person
        : about === 'post'
          ? appContext.ui.post
          : `${appContext.ui.selected}${day ? '/' + day : ''}`;
    currentEntry = {
      id: `${session}-${sequence++}`,
      depth: (currentEntry?.depth || 0) + (replace ? 0 : 1),
      page: pageState(),
      scrollTop: savedScroll(),
    };
    entries.set(currentEntry.id, currentEntry);
    history[replace ? 'replaceState' : 'pushState'](
      {
        passportNavigation: currentEntry,
      },
      '',
      `#/${screen}/${address}`,
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
    leave();
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
    // Opened directly, a page has nothing behind it: the way back leads to the page it belongs
    // under, in place of it.
    const parent = appContext.screens.parent();
    if (typeof parent === 'function') parent();
    else navigate(parent, appContext.ui.selected, true);
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
    savedScroll,
    navigate,
    goBack,
    openVisit,
  };
}
