/** Application module. Dependencies are provided by createApp(). */
export function createSelectors(appContext) {
  // The venue the page in view is about: the one its address names, the one of the stamp it
  // names, or the one of the open visit if the catalogue knows it. Otherwise none.
  function venue() {
    const { screen, selected, visitKey } = appContext.ui,
      { catalog } = appContext,
      about = appContext.screens.about(screen);
    if (about === 'stamp') return catalog.venueOf(catalog.stamp(selected));
    if (about === 'visit') return catalog.venue(appContext.data.visits[visitKey]?.venueId);
    return catalog.venue(selected);
  }
  // The stamp the page in view is about: the one its address names, or the one every visitor of
  // the venue it names can collect.
  function stamp() {
    const { screen, selected } = appContext.ui,
      { catalog } = appContext;
    return appContext.screens.about(screen) === 'stamp'
      ? catalog.stamp(selected)
      : catalog.stampOf(catalog.venue(selected));
  }
  // Where the demonstration claims when no venue is in view.
  function defaultVenue() {
    return appContext.catalog.venue(appContext.config.demoVenue) || appContext.catalog.venues[0];
  }
  // Whether the stamp of a venue is in the passport.
  function owned(v) {
    return !!appContext.data.records[v?.stampId];
  }
  function collected() {
    return appContext.catalog.stamps
      .filter((v) => appContext.data.records[v.id])
      .sort((a, b) =>
        appContext.data.records[b.id].firstAt.localeCompare(appContext.data.records[a.id].firstAt),
      );
  }
  // The same stamps as they fill the album, like a passport: earliest first. Stamps collected on
  // the same day keep the order their records were made in, so a new one always comes last.
  function collectedInOrder() {
    const made = Object.keys(appContext.data.records);
    return appContext.selectors
      .collected()
      .sort(
        (a, b) =>
          appContext.data.records[a.id].firstAt.localeCompare(
            appContext.data.records[b.id].firstAt,
          ) || made.indexOf(a.id) - made.indexOf(b.id),
      );
  }
  // The stamps still to collect, shown as empty slots in the album. The whole catalogue for now;
  // once it covers more cities this should narrow to places the collector has been or wants to go.
  function uncollected() {
    return appContext.catalog.stamps.filter((v) => !appContext.data.records[v.id]);
  }
  // The album and the tickets are the two sections of one book.
  function inBook(section = appContext.ui.collection) {
    return section === 'collected' || section === 'tickets';
  }
  // The album fills like a passport: the stamps in the order they were collected, then the places
  // still empty. A new stamp takes the first empty place and nothing before it moves.
  function albumStamps() {
    return [...appContext.selectors.collectedInOrder(), ...appContext.selectors.uncollected()];
  }
  // The pages of the book, by section: four stamps to a page, or two tickets.
  function bookPages() {
    const pages = (list, size) =>
      Array.from({ length: Math.ceil(list.length / size) }, (_, n) =>
        list.slice(n * size, (n + 1) * size),
      );
    return {
      collected: pages(albumStamps(), 4),
      // After the last ticket there is always a place for the next one.
      tickets: pages([...appContext.selectors.ticketRows(), null], 2),
    };
  }
  // The page a section opens on, counted through the whole book. Each section keeps its own
  // place, as far as it has pages.
  function bookIndex(section = appContext.ui.collection) {
    const pages = bookPages(),
      within = (page, list) => Math.min(page, list.length - 1);
    return section === 'tickets'
      ? pages.collected.length + within(appContext.ui.ticketPage, pages.tickets)
      : within(appContext.ui.stampPage, pages.collected);
  }
  // The page of the album a stamp lies on.
  function stampPageOf(id) {
    return Math.floor(
      Math.max(
        0,
        albumStamps().findIndex((v) => v.id === id),
      ) / 4,
    );
  }
  function visitRows() {
    return Object.values(appContext.data.visits)
      .map((v) => ({
        ...v,
        venue: {
          id: v.venueId,
          name: v.name,
          city: v.city,
          exhibit: v.exhibit,
        },
        ids: v.stampIds,
        ticket:
          v.ticketIds.length > 0 ||
          v.stampIds.some((id) =>
            (appContext.data.records[id]?.events || []).some(
              (e) => e.date === v.day && e.method === 'ticket',
            ),
          ),
      }))
      .sort((a, b) => b.day.localeCompare(a.day) || a.name.localeCompare(b.name));
  }
  // The day a collected stamp is being looked at for: the chosen one of its visits, or else the
  // first.
  function selectedVisit(r) {
    return r.visits.includes(appContext.ui.visitDate)
      ? appContext.ui.visitDate
      : [...r.visits].sort()[0] || r.firstAt;
  }
  // The visit a collected stamp is being looked at for: the one of that day.
  function visitForStamp(v, r) {
    return appContext.data.visits[
      appContext.domain.key(v.venueId, appContext.selectors.selectedVisit(r))
    ];
  }
  // The visit in view: the one the page is about, or the one its stamp is being looked at for.
  function currentVisit() {
    if (appContext.screens.about() === 'visit')
      return appContext.data.visits[appContext.ui.visitKey];
    const s = appContext.selectors.stamp(),
      r = s && appContext.data.records[s.id];
    return r ? appContext.selectors.visitForStamp(s, r) : null;
  }
  function savedTickets(v) {
    return (v?.ticketIds || []).filter((id) => appContext.data.tickets[id]?.saved);
  }
  // Every saved ticket with the visit it belongs to, newest visit first.
  function ticketRows() {
    return appContext.selectors
      .visitRows()
      .flatMap((visit) =>
        appContext.selectors
          .savedTickets(visit)
          .map((id) => ({ id, ticket: appContext.data.tickets[id], visit })),
      );
  }
  function getShareContext() {
    const visit = appContext.selectors.currentVisit();
    return {
      visit,
      badges:
        appContext.ui.screen === 'share'
          ? [appContext.catalog.stamp(appContext.ui.selected)]
          : appContext.catalog.stampsFor(visit.stampIds),
      note: visit.note,
      photo: visit.photo,
      tickets: appContext.selectors.savedTickets(visit),
    };
  }
  // The places whose stamp is still to collect come first; within each group the catalogue's
  // order stays.
  function filteredVenues() {
    const q = appContext.ui.query.trim().toLocaleLowerCase(),
      held = (v) => (appContext.selectors.owned(v) ? 1 : 0);
    return appContext.catalog.venues
      .filter(
        (v) =>
          (appContext.ui.city === '全部城市' || v.city === appContext.ui.city) &&
          (appContext.ui.category === 'all' || v.category === appContext.ui.category) &&
          (!q ||
            `${v.name}${appContext.catalog.stampOf(v)?.title}${v.exhibit}${v.city}${v.type}`
              .toLocaleLowerCase()
              .includes(q)),
      )
      .sort((a, b) => held(a) - held(b));
  }
  // The venues the discover page features above its list: those in the chosen city that have a
  // photograph and a headline to set over it. A category does not narrow them.
  function featuredVenues() {
    return appContext.catalog.venues.filter(
      (v) =>
        v.headline &&
        v.photo &&
        (appContext.ui.city === '全部城市' || v.city === appContext.ui.city),
    );
  }
  // While a search is typed, they give way to its results.
  function heroHidden() {
    return !!appContext.ui.query;
  }
  // The stamps a ticket can claim, as the confirmation offers them. The backend decides again
  // when the ticket is redeemed.
  function ticketRewards(d) {
    if (!d || !appContext.domain.validDay(d.visitedAt) || d.venueId === 'other') return [];
    return appContext.domain.eligible(appContext.catalog.stamps, d.venueId, d.visitedAt);
  }
  function selectedTicketRewards() {
    const d = appContext.ui.ticketDraft,
      redeemed = d ? appContext.data.tickets[d.id]?.redeemed || [] : [];
    return appContext.selectors
      .ticketRewards(d)
      .filter((v) => d.selected.includes(v.id) && !redeemed.includes(v.id));
  }
  // How far a limited stamp's edition has been issued: as far as the catalogue says, and at
  // least to the holder's own number.
  function edition(v) {
    if (!v.limit) return null;
    const issued = Math.max(appContext.data.records[v.id]?.issue || 0, v.issued || 0);
    return { limit: v.limit, issued, left: v.limit - issued };
  }
  // What a shared overview carries: places, dates and stamps. Tickets, photos and notes stay private.
  function journalShare() {
    const rows = appContext.selectors.visitRows(),
      stamps = appContext.selectors.collected(),
      album = appContext.ui.screen === 'share-album',
      cities = new Set(rows.map((v) => v.city)).size,
      since = rows.at(-1)?.day || '',
      pad = (n) => String(n).padStart(2, '0'),
      shown = album ? stamps.slice(0, 12) : rows.slice(0, 10);
    return {
      album,
      // The passport's data page at the head of the card. The machine-readable line is decoration.
      id: {
        since,
        latest: rows[0] ? `${rows[0].name} · ${rows[0].city}` : '',
        stamp: stamps[0] || null,
        mrz: `P<CTP<<${since.replaceAll('-', '')}<<V${pad(rows.length)}<S${pad(stamps.length)}<C${pad(cities)}`,
      },
      stats: [
        [rows.length, '次到访'],
        [stamps.length, '枚纪念章'],
        [cities, '座城市'],
      ],
      stamps: album ? shown : [],
      visits: album
        ? []
        : shown.map((v) => ({ ...v, badges: appContext.catalog.stampsFor(v.stampIds) })),
      more: (album ? stamps.length : rows.length) - shown.length,
    };
  }
  return {
    venue,
    stamp,
    defaultVenue,
    owned,
    collected,
    collectedInOrder,
    uncollected,
    inBook,
    bookPages,
    bookIndex,
    stampPageOf,
    edition,
    journalShare,
    visitRows,
    selectedVisit,
    visitForStamp,
    currentVisit,
    savedTickets,
    ticketRows,
    getShareContext,
    filteredVenues,
    featuredVenues,
    heroHidden,
    ticketRewards,
    selectedTicketRewards,
  };
}
