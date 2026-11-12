/** Application module. Dependencies are provided by createApp(). */
export function createQueries(appContext) {
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
  function visitForStamp(v, r) {
    return appContext.domain.ensure(
      appContext.data,
      appContext.catalog.venueOf(v),
      appContext.format.selectedVisit(r),
      [v.id],
    );
  }
  function currentVisit() {
    return ['visit', 'visit-share'].includes(appContext.ui.screen)
      ? appContext.data.visits[appContext.ui.visitKey]
      : appContext.data.records[appContext.ui.selected]
        ? appContext.selectors.visitForStamp(
            appContext.catalog.byId(appContext.ui.selected),
            appContext.data.records[appContext.ui.selected],
          )
        : null;
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
  function ticketVenue(d) {
    const previous = appContext.data.tickets[d.id];
    if (previous?.venueId.startsWith('custom-'))
      return {
        id: previous.venueId,
        name: previous.name,
        city: previous.city,
        exhibit: previous.exhibit,
      };
    if (d.venueId !== 'other')
      return (
        appContext.catalog.venues.find((v) => v.id === d.venueId) || appContext.catalog.venues[0]
      );
    const name = d.customName.trim(),
      city = d.customCity.trim();
    return {
      id: 'custom-' + appContext.domain.hash(name + '|' + city),
      name,
      city,
      exhibit: d.customExhibit.trim(),
    };
  }
  function getShareContext() {
    const visit = appContext.selectors.currentVisit();
    return {
      visit,
      badges:
        appContext.ui.screen === 'share'
          ? [appContext.catalog.byId(appContext.ui.selected)]
          : visit.stampIds.map(appContext.catalog.byId),
      note: visit.note,
      photo: visit.photo,
      tickets: appContext.selectors.savedTickets(visit),
    };
  }
  // The places whose stamp is still to collect come first; within each group the catalogue's
  // order stays.
  function filteredVenues() {
    const q = appContext.ui.query.trim().toLocaleLowerCase(),
      owned = (v) => (appContext.data.records[v.id] ? 1 : 0);
    return appContext.catalog.venues
      .filter(
        (v) =>
          (appContext.ui.city === '全部城市' || v.city === appContext.ui.city) &&
          (appContext.ui.category === 'all' || v.category === appContext.ui.category) &&
          (!q ||
            `${v.name}${v.stamp}${v.exhibit}${v.city}${v.type}`.toLocaleLowerCase().includes(q)),
      )
      .sort((a, b) => owned(a) - owned(b));
  }
  // The venues the discover page features above its list: those in the chosen city that have a
  // photograph and a headline to set over it. A category does not narrow them.
  function featuredVenues() {
    return appContext.catalog.venues.filter(
      (v) =>
        v.headline &&
        appContext.assets.venues[v.id] &&
        (appContext.ui.city === '全部城市' || v.city === appContext.ui.city),
    );
  }
  // While a search is typed, they give way to its results.
  function heroHidden() {
    return !!appContext.ui.query;
  }
  function ticketRewards(d) {
    if (!d || !appContext.format.validDay(d.visitedAt) || d.venueId === 'other') return [];
    return appContext.catalog.stamps.filter(
      (v) =>
        appContext.catalog.venueOf(v).id === d.venueId &&
        (!v.period || (d.visitedAt >= v.period[0] && d.visitedAt <= v.period[1])),
    );
  }
  function selectedTicketRewards() {
    const d = appContext.ui.ticketDraft,
      redeemed = d ? appContext.data.tickets[d.id]?.redeemed || [] : [];
    return appContext.selectors
      .ticketRewards(d)
      .filter((v) => d.selected.includes(v.id) && !redeemed.includes(v.id));
  }
  // How far a limited stamp's edition has been issued; simulated up to the demo date.
  function edition(v) {
    if (!v.limit) return null;
    const issued = Math.max(
      appContext.data.records[v.id]?.issue || 0,
      appContext.domain.issue(v.id, appContext.config.demoDate, v.limit),
    );
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
        : shown.map((v) => ({ ...v, badges: v.stampIds.map(appContext.catalog.byId) })),
      more: (album ? stamps.length : rows.length) - shown.length,
    };
  }
  return {
    collected,
    collectedInOrder,
    uncollected,
    edition,
    journalShare,
    visitRows,
    visitForStamp,
    currentVisit,
    savedTickets,
    ticketRows,
    ticketVenue,
    getShareContext,
    filteredVenues,
    featuredVenues,
    heroHidden,
    ticketRewards,
    selectedTicketRewards,
  };
}
