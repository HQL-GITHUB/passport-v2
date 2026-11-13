/** Application module. Dependencies are provided by createApp(). */
export function createCommunityQueries(appContext) {
  const onSite = (method) => method === 'qr' || method === 'nfc';
  // What the holder shows of the passport: nothing, until it is switched on.
  function visibility() {
    return { album: false, footprints: false, memories: false, ...appContext.data.profile?.public };
  }
  // The line under a note or a photograph, about who sees it: locked, unless its writer shows them.
  function memoryPrivacy(kept) {
    return appContext.selectors.visibility().memories
      ? `${appContext.format.icon('check')}已随足迹公开，可在公开设置中关闭`
      : `${appContext.format.icon('lock')}${kept}`;
  }
  // The invented collectors as the pages read one: the stamps in the order they were collected,
  // each with a number issued the way the holder's own are, and the visits those stamps tell of.
  let others;
  function invented() {
    return (others ||= appContext.fixtures.collectors.map((p) => {
      const stamps = p.stamps
          .map(([id, at, method, note = '']) => {
            const stamp = appContext.catalog.byId(id);
            return { stamp, at, method, note, issue: appContext.domain.issue(id, at, stamp.limit) };
          })
          .sort((a, b) => a.at.localeCompare(b.at)),
        visits = new Map();
      for (const s of stamps) {
        const venue = appContext.catalog.venueOf(s.stamp),
          key = appContext.domain.key(venue.id, s.at);
        if (!visits.has(key))
          visits.set(key, {
            day: s.at,
            venueId: venue.id,
            name: venue.name,
            city: venue.city,
            exhibit: venue.exhibit,
            stamps: [],
            note: '',
            photo: '',
          });
        visits.get(key).stamps.push(s.stamp);
        visits.get(key).note ||= s.note;
      }
      return {
        id: p.id,
        name: p.name,
        city: p.city,
        me: false,
        public: { album: true, footprints: !!p.footprints, memories: !!p.memories },
        stamps,
        visits: [...visits.values()].sort((a, b) => b.day.localeCompare(a.day)),
      };
    }));
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
        stamps: v.stampIds.map(appContext.catalog.byId),
        note: v.note?.trim() || '',
        photo: v.photo,
      })),
    };
  }
  function person(id) {
    return id === 'me' ? appContext.selectors.me() : invented().find((p) => p.id === id) || null;
  }
  // Everyone whose album can be seen: the holder is among them only by choice.
  function people() {
    return [
      ...(appContext.selectors.visibility().album ? [appContext.selectors.me()] : []),
      ...invented(),
    ];
  }
  // One board for each city, and one for the year, which starts again every January.
  function boards() {
    const year = appContext.config.demoDate.slice(0, 4);
    return [
      ...[...new Set(appContext.catalog.venues.map((v) => v.city))].map((city) => ({
        id: city,
        label: city,
        counts: (s) => s.stamp.city === city,
        total: appContext.catalog.stamps.filter((v) => v.city === city).length,
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
      .map((row, n, rows) => ({ ...row, rank: 1 + rows.findIndex((r) => r.count === row.count) }));
  }
  // What the holder has put on the square of one visit, if anything.
  function myPost(key) {
    return (appContext.data.posts || []).find((p) => p.key === key) || null;
  }
  // The square: single visits that collectors chose to publish, newest first, the holder's own
  // among them. A post carries the stamps of the visit with their numbers, the line written with
  // it and, for the holder's, a photograph; never a ticket.
  function posts() {
    const records = appContext.data.records,
      liked = appContext.data.liked || [],
      known = (id) => appContext.catalog.venues.some((v) => v.id === id),
      shape = (post) => ({
        ...post,
        known: known(post.venueId),
        liked: liked.includes(post.id),
        likes: post.likes + (liked.includes(post.id) ? 1 : 0),
      }),
      // Posts are kept in the order they were published, and dated to the day: of two from the
      // same day the later one leads.
      mine = [...(appContext.data.posts || [])].reverse().flatMap((p) => {
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
              stamps: p.stampIds
                .filter((id) => records[id])
                .map((id) => ({ stamp: appContext.catalog.byId(id), issue: records[id].issue })),
              note: p.note,
              photo: p.photo,
              likes: 0,
            })
          : [];
      }),
      theirs = appContext.fixtures.posts.flatMap(([who, venueId, day, likes, note]) => {
        const p = invented().find((item) => item.id === who),
          v = p?.visits.find((item) => item.venueId === venueId && item.day === day);
        return v
          ? shape({
              id: `${who}/${venueId}/${day}`,
              mine: false,
              person: p,
              venueId,
              name: v.name,
              city: v.city,
              exhibit: v.exhibit,
              day,
              at: day,
              stamps: p.stamps.filter((s) => v.stamps.includes(s.stamp) && s.at === day),
              note,
              photo: '',
              likes,
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
    memoryPrivacy,
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
