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
    const subject = appContext.screens.root(page.screen)
      ? ''
      : appContext.screens.subject(page.screen).of(page);
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
    // What is not a venue or a stamp is addressed in its own way, and is read first: the venue a
    // page keeps may depend on it.
    const subject = appContext.screens.subject();
    subject.read?.(parts.slice(1));
    appContext.ui.selected = subject.take(parts[1]);
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
    const subject = appContext.screens.subject();
    appContext.ui.selected = subject.take(id);
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
      `#/${screen}/${subject.address()}`,
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
