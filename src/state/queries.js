/** Application module. Dependencies are provided by createApp(). */
export function createQueries(appContext) {
  function collected() {
    return appContext.catalog.stamps
      .filter((v) => appContext.data.records[v.id])
      .sort((a, b) =>
        appContext.data.records[b.id].firstAt.localeCompare(appContext.data.records[a.id].firstAt),
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
  function filteredVenues() {
    const q = appContext.ui.query.trim().toLocaleLowerCase();
    return appContext.catalog.venues.filter(
      (v) =>
        (appContext.ui.city === '全部城市' || v.city === appContext.ui.city) &&
        (appContext.ui.category === 'all' || v.category === appContext.ui.category) &&
        (!q || `${v.name}${v.stamp}${v.exhibit}${v.city}${v.type}`.toLocaleLowerCase().includes(q)),
    );
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
  return {
    collected,
    visitRows,
    visitForStamp,
    currentVisit,
    savedTickets,
    ticketVenue,
    getShareContext,
    filteredVenues,
    ticketRewards,
    selectedTicketRewards,
  };
}
