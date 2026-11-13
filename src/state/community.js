/** Application module. Dependencies are provided by createApp(). */
export function createCommunitySelectors(appContext) {
  const onSite = (method) => method === 'qr' || method === 'nfc';
  // What the holder shows of the passport: nothing, until it is switched on.
  function visibility() {
    return { album: false, footprints: false, memories: false, ...appContext.data.profile?.public };
  }
  // The other collectors as the pages read one: the stamps in the order they were collected,
  // each with its number, and the visits those stamps tell of. The backend answers them by id;
  // here they meet the catalogue. A stamp the catalogue does not know is left out.
  let others, source;
  function collectors() {
    if (source !== appContext.community) {
      source = appContext.community;
      others = source.collectors.map((p) => ({
        ...p,
        me: false,
        stamps: p.stamps.flatMap((s) => {
          const stamp = appContext.catalog.stamp(s.stampId);
          return stamp ? { ...s, stamp } : [];
        }),
        visits: p.visits.map((v) => ({ ...v, stamps: appContext.catalog.stampsFor(v.stampIds) })),
      }));
    }
    return others;
  }
  // The holder of this passport, in the same form.
  function me() {
    const records = appContext.data.records;
    return {
      id: 'me',
      name: '我',
      city: '',
      me: true,
      public: appContext.selectors.visibility(),
      stamps: appContext.selectors.collectedInOrder().map((stamp) => ({
        stamp,
        at: records[stamp.id].firstAt,
        method: records[stamp.id].method,
        issue: records[stamp.id].issue,
      })),
      visits: appContext.selectors.visitRows().map((v) => ({
        day: v.day,
        venueId: v.venueId,
        name: v.name,
        city: v.city,
        exhibit: v.exhibit,
        stamps: appContext.catalog.stampsFor(v.stampIds),
        note: v.note?.trim() || '',
        photo: v.photo,
      })),
    };
  }
  function person(id) {
    return id === 'me' ? appContext.selectors.me() : collectors().find((p) => p.id === id) || null;
  }
  // Everyone whose album can be seen: the holder is among them only by choice.
  function people() {
    return [
      ...(appContext.selectors.visibility().album ? [appContext.selectors.me()] : []),
      ...collectors(),
    ];
  }
  // One board for each city, and one for the year, which starts again every January.
  function boards() {
    const year = appContext.clock.today().slice(0, 4);
    return [
      ...appContext.catalog.cities.map((city) => ({
        id: city,
        label: city,
        counts: (s) => appContext.catalog.venueOf(s.stamp)?.city === city,
        total: appContext.catalog.stamps.filter((s) => appContext.catalog.venueOf(s)?.city === city)
          .length,
      })),
      { id: 'year', label: `${year} 年度`, yearly: true, counts: (s) => s.at.startsWith(year) },
    ];
  }
  function currentBoard() {
    const all = appContext.selectors.boards();
    return all.find((b) => b.id === appContext.ui.board) || all[0];
  }
  // A board ranks by the stamps collected on site: one redeemed with a ticket stays in the album
  // but does not count. Collectors level on stamps share a place, so one more stamp is always
  // enough to draw level with the next; among themselves they stand in the order they got there.
  // A shared place takes up one place only: after two seconds comes the third, not the fourth.
  function board(id) {
    const def = appContext.selectors.boards().find((b) => b.id === id);
    return appContext.selectors
      .people()
      .map((p) => {
        const held = p.stamps
          .filter((s) => onSite(s.method) && def.counts(s))
          .sort((a, b) => b.at.localeCompare(a.at));
        return {
          person: p,
          count: held.length,
          reached: held[0]?.at,
          latest: held.slice(0, 3).map((s) => s.stamp),
          complete: held.length === def.total,
        };
      })
      .filter((row) => row.count)
      .sort(
        (a, b) =>
          b.count - a.count ||
          a.reached.localeCompare(b.reached) ||
          a.person.name.localeCompare(b.person.name),
      )
      .map((row, n, rows) => ({
        ...row,
        rank: new Set(rows.slice(0, n + 1).map((r) => r.count)).size,
      }));
  }
  // What the holder has put on the square of one visit, if anything.
  function myPost(key) {
    return appContext.data.posts.find((p) => p.key === key) || null;
  }
  // The square: single visits that collectors chose to publish, newest first, the holder's own
  // among them. A post carries the stamps of the visit with their numbers, the line written with
  // it and, for the holder's, a photograph; never a ticket.
  function posts() {
    const records = appContext.data.records,
      liked = appContext.data.liked,
      known = (id) => !!appContext.catalog.venue(id),
      shape = (post) => ({
        ...post,
        known: known(post.venueId),
        liked: liked.includes(post.id),
        likes: post.likes + (liked.includes(post.id) ? 1 : 0),
      }),
      // Posts are kept in the order they were published, and dated to the day: of two from the
      // same day the later one leads.
      mine = [...appContext.data.posts].reverse().flatMap((p) => {
        const v = appContext.data.visits[p.key];
        return v
          ? shape({
              id: `me/${p.key}`,
              key: p.key,
              mine: true,
              person: { id: 'me', name: '我', me: true },
              venueId: v.venueId,
              name: v.name,
              city: v.city,
              exhibit: v.exhibit,
              day: v.day,
              at: p.at,
              stamps: appContext.catalog
                .stampsFor(p.stampIds)
                .filter((s) => records[s.id])
                .map((s) => ({ stamp: s, issue: records[s.id].issue })),
              note: p.note,
              photo: p.photo,
              likes: 0,
            })
          : [];
      }),
      theirs = appContext.community.posts.flatMap((post) => {
        const p = collectors().find((item) => item.id === post.collectorId);
        return p
          ? shape({
              ...post,
              mine: false,
              person: p,
              stamps: post.stamps.flatMap((s) => {
                const stamp = appContext.catalog.stamp(s.stampId);
                return stamp ? { ...s, stamp } : [];
              }),
            })
          : [];
      });
    return [...mine, ...theirs].sort((a, b) => b.at.localeCompare(a.at));
  }
  // Those who hold a stamp and show it, by the number each was issued.
  function holders(v) {
    return appContext.selectors
      .people()
      .flatMap((p) => p.stamps.filter((s) => s.stamp.id === v.id).map((s) => ({ ...s, person: p })))
      .sort((a, b) => a.issue - b.issue);
  }
  return {
    visibility,
    me,
    person,
    people,
    boards,
    currentBoard,
    board,
    holders,
    myPost,
    posts,
  };
}
